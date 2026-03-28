import { GoogleGenerativeAI } from '@google/generative-ai'
import type { ReflectionAnswers, CareerPath, MatrixScore, ActionPlan, InsightProfile, ValuesHierarchy } from '../types'
import { PRIORITY_LABELS, MATRIX_CRITERIA } from '../types'

const STORAGE_KEY = 'clarify-gemini-api-key'

export function getApiKey(): string | null {
  const envKey = import.meta.env.VITE_GEMINI_API_KEY
  if (envKey) return envKey
  return localStorage.getItem(STORAGE_KEY)
}

export function hasEnvApiKey(): boolean {
  return !!import.meta.env.VITE_GEMINI_API_KEY
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
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' })

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
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' })

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
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' })

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

// ─── Insight Conversation ────────────────────────────────────────────────────

function formatReflectionForPrompt(answers: ReflectionAnswers): string {
  const priorityLines = Object.entries(answers.priorities)
    .map(([key, val]) => `  ${PRIORITY_LABELS[key] ?? key}: ${val}/5`)
    .join('\n')

  return `**What makes time fly at work:** ${answers.energizers.join(', ')}
**What drains them most:** ${answers.drainers.join(', ')}
**What they'd keep if redesigning their job:** ${answers.keepInJob || '(not specified)'}
**Priority ratings (1-5):**
${priorityLines}
**See themselves writing code in 5 years:** ${answers.codingIn5Years}
**End-of-day energy level:** ${answers.energyLevel}/5
**Learning interests outside work:** ${answers.learningInterests.join(', ')}
**What success looks like in 2 years:** ${answers.successVision || '(not specified)'}
**A career decision you regret:** ${answers.regretDecision || '(not specified)'}
**Good at but don't want to do:** ${answers.goodAtButDontWant || '(not specified)'}
**If money were equal, would do:** ${answers.ifMoneyEqual || '(not specified)'}
**Belief they'd most want to change:** ${answers.beliefToChange || '(not specified)'}`
}

export function buildTensionPrompt(answers: ReflectionAnswers): string {
  return `You are a career coach conducting a deep self-reflection session. Here is a software developer's self-reflection profile:

${formatReflectionForPrompt(answers)}

Based on this profile, identify 2-3 core tensions — internal conflicts or contradictions in what this person wants, fears, or believes about their career.

For each tension, craft a probing follow-up question that will help the person gain clarity.

Return ONLY a JSON object (no markdown, no code fences) with this exact shape:
{
  "tensions": [
    {
      "description": "brief description of the tension",
      "question": "the probing question to ask"
    }
  ],
  "firstQuestion": "the single best opening question to start the conversation"
}

Focus on contradictions between what they say they want and what their answers reveal. Be empathetic but incisive.`
}

export function buildConversationFollowUpPrompt(
  history: Array<{ role: 'assistant' | 'user'; content: string }>,
  currentExchange: number,
  totalExchanges: number,
): string {
  const historyText = history
    .map((msg) => (msg.role === 'assistant' ? `Coach: ${msg.content}` : `User: ${msg.content}`))
    .join('\n\n')

  return `You are a career coach conducting a reflective conversation. This is exchange ${currentExchange} of ${totalExchanges}.

Conversation so far:
${historyText}

Based on what the person has shared, ask a single thoughtful follow-up question that goes deeper. Do not summarize or explain — just ask the question. Keep it short (1-2 sentences). Be warm but incisive.`
}

export function buildSynthesisPrompt(
  answers: ReflectionAnswers,
  history: Array<{ role: 'assistant' | 'user'; content: string }>,
): string {
  const historyText = history
    .map((msg) => (msg.role === 'assistant' ? `Coach: ${msg.content}` : `User: ${msg.content}`))
    .join('\n\n')

  return `You are a career coach. Based on a developer's self-reflection profile and conversation, synthesize a deep insight profile.

**Reflection Profile:**
${formatReflectionForPrompt(answers)}

**Conversation:**
${historyText}

Return ONLY a JSON object (no markdown, no code fences) with this exact shape:
{
  "tensions": [
    {
      "description": "description of the tension",
      "question": "the question that surfaced it",
      "response": "what they said in response",
      "resolution": "how they seem to be resolving or living with it"
    }
  ],
  "coreValues": [
    {
      "value": "value name",
      "rank": 1,
      "evidence": "evidence from their answers"
    }
  ],
  "hiddenBlockers": [
    {
      "belief": "limiting belief",
      "source": "where this belief likely comes from"
    }
  ],
  "narrative": "2-3 sentence narrative of who this person is and what they're really looking for",
  "valuesWithConflicts": [
    {
      "value": "value name",
      "aiRank": 1,
      "evidence": "evidence from their answers",
      "sliderConflict": "optional: how their priority sliders conflict with stated values"
    }
  ]
}

Be specific. Reference actual things they said. Rank coreValues from most to least important (rank 1 = most important).`
}

export function buildPathExplorationPrompt(
  insightProfile: import('../types').InsightProfile,
  path: CareerPath,
  allPaths: CareerPath[],
  history: Array<{ role: 'assistant' | 'user'; content: string }>,
): string {
  const historyText = history.length > 0
    ? `\n\nConversation so far:\n${history.map((m) => `${m.role === 'assistant' ? 'Coach' : 'User'}: ${m.content}`).join('\n\n')}`
    : ''

  const otherPaths = allPaths.filter((p) => p.id !== path.id)
    .map((p) => `- ${p.title}: ${p.description}`)
    .join('\n')

  return `You are a career coach helping someone explore the "${path.title}" career path.

**About this path:**
- Title: ${path.title}
- Description: ${path.description}
- Why it fits: ${path.whyItFits}
- Salary: ${path.salaryRange.entry} → ${path.salaryRange.experienced}
- Skills they have: ${path.skillsHave.join(', ')}
- Skills needed: ${path.skillsNeed.join(', ')}
- Timeline: ${path.timeline}
- Risk: ${path.riskLevel}
- Day in the life: ${path.dayInTheLife}

**About the person:**
${insightProfile.narrative || 'No insight profile available yet.'}

**Other paths they're considering:**
${otherPaths}
${historyText}

Answer their question directly and specifically. Be honest about downsides — don't sell the path. Keep responses to 2-4 sentences unless the question warrants more detail. If comparing to other paths, be specific about trade-offs.

Return ONLY your response text — no JSON, no formatting.`
}

export interface ConversationTurnCallbacks {
  onText: (text: string) => void
  onDone: (fullText: string) => void
  onError: (error: string) => void
}

export async function streamConversationTurn(
  apiKey: string,
  prompt: string,
  callbacks: ConversationTurnCallbacks,
  signal: AbortSignal,
): Promise<void> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' })

  let accumulated = ''

  try {
    const result = await model.generateContentStream({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    })

    for await (const chunk of result.stream) {
      if (signal.aborted) return
      const text = chunk.text()
      accumulated += text
      callbacks.onText(text)
    }

    callbacks.onDone(accumulated)
  } catch (err: unknown) {
    if (signal.aborted) return
    const message = err instanceof Error ? err.message : 'Unknown error in conversation'
    callbacks.onError(message)
  }
}

export async function generateInsightSynthesis(
  apiKey: string,
  reflection: ReflectionAnswers,
  conversationLog: Array<{ role: 'assistant' | 'user'; content: string }>,
): Promise<{
  profile: InsightProfile
  valuesHierarchy: ValuesHierarchy
}> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' })

  const prompt = buildSynthesisPrompt(reflection, conversationLog)

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  })

  const text = result.response.text()
  const cleaned = text.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '').trim()

  const raw = JSON.parse(cleaned) as {
    tensions?: Array<{ description?: string; question?: string; response?: string; resolution?: string }>
    coreValues?: Array<{ value?: string; rank?: number; evidence?: string }>
    hiddenBlockers?: Array<{ belief?: string; source?: string }>
    narrative?: string
    valuesWithConflicts?: Array<{ value?: string; aiRank?: number; evidence?: string; sliderConflict?: string }>
  }

  const profile: InsightProfile = {
    tensions: (raw.tensions ?? []).map((t) => ({
      description: t.description ?? '',
      question: t.question ?? '',
      response: t.response ?? '',
      resolution: t.resolution ?? '',
    })),
    coreValues: (raw.coreValues ?? []).map((v) => ({
      value: v.value ?? '',
      rank: v.rank ?? 0,
      evidence: v.evidence ?? '',
    })),
    hiddenBlockers: (raw.hiddenBlockers ?? []).map((b) => ({
      belief: b.belief ?? '',
      source: b.source ?? '',
    })),
    narrative: raw.narrative ?? '',
    conversationLog: conversationLog.map((msg) => ({ role: msg.role, content: msg.content })),
  }

  const valuesHierarchy: ValuesHierarchy = {
    values: (raw.valuesWithConflicts ?? raw.coreValues ?? []).map((v, i) => ({
      value: ('value' in v ? v.value : '') ?? '',
      aiRank: ('aiRank' in v ? (v as { aiRank?: number }).aiRank : ('rank' in v ? (v as { rank?: number }).rank : undefined)) ?? i + 1,
      userRank: i + 1,
      evidence: ('evidence' in v ? v.evidence : '') ?? '',
      sliderConflict: ('sliderConflict' in v ? (v as { sliderConflict?: string }).sliderConflict : undefined),
    })),
  }

  return { profile, valuesHierarchy }
}
