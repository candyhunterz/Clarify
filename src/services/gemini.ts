import { GoogleGenerativeAI } from '@google/generative-ai'
import type { ReflectionAnswers, CareerPath, MatrixScore, ActionPlan } from '../types'
import { PRIORITY_LABELS, MATRIX_CRITERIA } from '../types'

const STORAGE_KEY = 'clarify-gemini-api-key'

export function getApiKey(): string | null {
  return localStorage.getItem(STORAGE_KEY)
}

export function saveApiKey(key: string): void {
  localStorage.setItem(STORAGE_KEY, key)
}

export function clearApiKey(): void {
  localStorage.removeItem(STORAGE_KEY)
}

function buildReflectionPrompt(answers: ReflectionAnswers): string {
  const priorityLines = Object.entries(answers.priorities)
    .map(([key, val]) => `  ${PRIORITY_LABELS[key] ?? key}: ${val}/5`)
    .join('\n')

  return `Here is a software developer's self-reflection profile:

**What makes time fly at work:** ${answers.energizers.join(', ')}
**What drains them most:** ${answers.drainers.join(', ')}
**What they'd keep if redesigning their job:** ${answers.keepInJob || '(not specified)'}
**Priority ratings (1-5):**
${priorityLines}
**See themselves writing code in 5 years:** ${answers.codingIn5Years}
**End-of-day energy level:** ${answers.energyLevel}/5
**Learning interests outside work:** ${answers.learningInterests.join(', ')}
**What success looks like in 2 years:** ${answers.successVision || '(not specified)'}

Based on this profile, generate 4-6 personalized career paths. Include a mix from these categories:
- Level up in current track (e.g., senior role at a better company)
- Specialize (frontend, backend, DevOps, data engineering, mobile, etc.)
- Adjacent pivot (product management, UX design, dev rel, technical writing, engineering management)
- Bigger pivot (only if the profile suggests low interest in staying in tech)

Return ONLY a JSON array (no markdown, no code fences) where each element has this exact shape:
{
  "id": "path-1",
  "title": "string",
  "description": "one-line description",
  "whyItFits": "why this fits based on their answers",
  "salaryRange": { "entry": "$X", "experienced": "$Y" },
  "skillsHave": ["skill1", "skill2"],
  "skillsNeed": ["skill1", "skill2"],
  "timeline": "realistic transition timeline",
  "riskLevel": "low" | "medium" | "high",
  "dayInTheLife": "3-4 sentence day-in-the-life summary"
}

Use sequential ids like "path-1", "path-2", etc. Be specific and realistic — not generic advice.`
}

/** Extract complete JSON objects from a partial stream of text. */
function extractPaths(text: string): { paths: CareerPath[]; lastEnd: number } {
  const paths: CareerPath[] = []
  let lastEnd = 0
  let braceDepth = 0
  let objectStart = -1
  let inString = false
  let escaped = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]

    if (escaped) {
      escaped = false
      continue
    }
    if (ch === '\\' && inString) {
      escaped = true
      continue
    }
    if (ch === '"') {
      inString = !inString
      continue
    }
    if (inString) continue

    if (ch === '{') {
      if (braceDepth === 0) objectStart = i
      braceDepth++
    } else if (ch === '}') {
      braceDepth--
      if (braceDepth === 0 && objectStart !== -1) {
        const slice = text.slice(objectStart, i + 1)
        try {
          const obj = JSON.parse(slice) as CareerPath
          if (obj.title && obj.id) {
            paths.push(obj)
          }
        } catch {
          // incomplete or malformed — skip
        }
        lastEnd = i + 1
        objectStart = -1
      }
    }
  }
  return { paths, lastEnd }
}

export interface StreamCallbacks {
  onPaths: (paths: CareerPath[]) => void
  onError: (error: string) => void
  onDone: () => void
}

export async function streamCareerPaths(
  apiKey: string,
  reflection: ReflectionAnswers,
  callbacks: StreamCallbacks,
  signal: AbortSignal,
): Promise<void> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  let accumulated = ''
  let parsedCount = 0

  try {
    const result = await model.generateContentStream({
      contents: [{ role: 'user', parts: [{ text: buildReflectionPrompt(reflection) }] }],
    })

    for await (const chunk of result.stream) {
      if (signal.aborted) return

      const text = chunk.text()
      accumulated += text

      const { paths } = extractPaths(accumulated)
      if (paths.length > parsedCount) {
        parsedCount = paths.length
        callbacks.onPaths(paths)
      }
    }

    // Final parse of complete response
    const { paths } = extractPaths(accumulated)
    if (paths.length > 0) {
      callbacks.onPaths(paths)
    }
    callbacks.onDone()
  } catch (err: unknown) {
    if (signal.aborted) return
    const message = err instanceof Error ? err.message : 'Unknown error generating paths'
    callbacks.onError(message)
  }
}

function buildMatrixPrompt(paths: CareerPath[]): string {
  const criteriaList = MATRIX_CRITERIA.map((c) => `"${c.id}": "${c.label}"`).join('\n  ')
  const pathList = paths.map((p) => `- "${p.id}": ${p.title} — ${p.description}`).join('\n')

  return `Score these career paths against decision criteria. Be realistic and differentiated — don't give every path the same scores.

**Paths:**
${pathList}

**Criteria (score each 1-5):**
  ${criteriaList}

Note: "transition" means transition difficulty — score higher if EASIER to transition (inverted).

Return ONLY a JSON object (no markdown, no code fences) mapping each path id to an object of criterion scores. Each score has a numeric "score" (1-5) and a short "rationale" (one sentence).

Example shape:
{
  "path-1": {
    "salary": { "score": 4, "rationale": "Strong earning potential in this field" },
    "workLife": { "score": 3, "rationale": "..." }
  }
}

Score ALL criteria for ALL paths.`
}

export async function generateMatrixScores(
  apiKey: string,
  paths: CareerPath[],
): Promise<Record<string, Record<string, MatrixScore>>> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: buildMatrixPrompt(paths) }] }],
  })

  const text = result.response.text()
  // Strip code fences if present
  const cleaned = text.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '').trim()
  const raw = JSON.parse(cleaned) as Record<
    string,
    Record<string, { score: number; rationale: string }>
  >

  const scores: Record<string, Record<string, MatrixScore>> = {}
  for (const [pathId, criteria] of Object.entries(raw)) {
    scores[pathId] = {}
    for (const [criterionId, val] of Object.entries(criteria)) {
      scores[pathId][criterionId] = {
        score: Math.max(1, Math.min(5, Math.round(val.score))),
        rationale: val.rationale ?? '',
        isOverridden: false,
      }
    }
  }
  return scores
}

function buildActionPlanPrompt(path: CareerPath): string {
  return `Create a concrete, specific 30/60/90 day action plan for someone transitioning to: "${path.title}" — ${path.description}.

Context about this path:
- Skills they already have: ${path.skillsHave.join(', ')}
- Skills they need to build: ${path.skillsNeed.join(', ')}
- Timeline: ${path.timeline}
- Risk level: ${path.riskLevel}

Return ONLY a JSON object (no markdown, no code fences) with this exact shape:
{
  "phases": [
    {
      "title": "Research & Foundations",
      "timeframe": "Days 1–30",
      "items": ["specific action 1", "specific action 2", "specific action 3"]
    },
    {
      "title": "Build & Practice",
      "timeframe": "Days 31–60",
      "items": ["specific action 1", "specific action 2", "specific action 3"]
    },
    {
      "title": "Launch & Apply",
      "timeframe": "Days 61–90",
      "items": ["specific action 1", "specific action 2", "specific action 3"]
    }
  ],
  "resources": ["specific course/book/community 1", "specific course/book/community 2"],
  "resumeTips": ["specific tip 1", "specific tip 2"],
  "interviewPrep": ["specific guidance 1", "specific guidance 2"],
  "riskMitigation": ["what to do if X", "fallback plan Y"]
}

Each phase should have 3-5 items. All recommendations must be specific (name real courses, communities, tools) — not generic advice.`
}

export interface ActionPlanStreamCallbacks {
  onText: (accumulated: string) => void
  onPlan: (plan: ActionPlan) => void
  onError: (error: string) => void
  onDone: () => void
}

export async function streamActionPlan(
  apiKey: string,
  path: CareerPath,
  callbacks: ActionPlanStreamCallbacks,
  signal: AbortSignal,
): Promise<void> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  let accumulated = ''

  try {
    const result = await model.generateContentStream({
      contents: [{ role: 'user', parts: [{ text: buildActionPlanPrompt(path) }] }],
    })

    for await (const chunk of result.stream) {
      if (signal.aborted) return
      accumulated += chunk.text()
      callbacks.onText(accumulated)
    }

    // Parse the complete response
    const cleaned = accumulated.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '').trim()
    const raw = JSON.parse(cleaned) as Omit<ActionPlan, 'targetPathId' | 'targetPathTitle'>

    callbacks.onPlan({
      targetPathId: path.id,
      targetPathTitle: path.title,
      phases: raw.phases ?? [],
      resources: raw.resources ?? [],
      resumeTips: raw.resumeTips ?? [],
      interviewPrep: raw.interviewPrep ?? [],
      riskMitigation: raw.riskMitigation ?? [],
    })
    callbacks.onDone()
  } catch (err: unknown) {
    if (signal.aborted) return
    const message = err instanceof Error ? err.message : 'Failed to generate action plan'
    callbacks.onError(message)
  }
}
