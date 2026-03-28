# Clarify Insight Engine — Design Spec

## Overview

Transform Clarify from a "fill form, get output" career tool into a genuine career clarity experience. The core thesis: career decisions aren't made by weighted spreadsheets — they're made when someone finally articulates what they actually want. Every change in this spec serves that goal.

The existing wizard structure (5 steps), session persistence, undo/redo, streaming, and export infrastructure remain intact. This spec adds an intelligence layer on top.

## Changes Summary

1. **Deeper reflection questions** — 4 new open-ended questions that surface values, fears, and identity barriers
2. **Post-reflection AI conversation** — 3-5 turn dialogue that identifies tensions and contradictions in the user's answers
3. **Tension mapping & values hierarchy** — visual ranked list of actual values derived from conversation, user-adjustable
4. **Path exploration mode** — per-path conversational Q&A so users can interrogate paths before selecting them
5. **Scenario modeling in decision matrix** — "what if" mode with preset scenarios and sensitivity analysis
6. **Conviction check** — gut-check after matrix ranking, captures the gap between numbers and intuition
7. **Personal narrative in summary** — AI-written story that synthesizes the user's journey
8. **Smarter action plan** — addresses identity blockers, includes decision checkpoints and personalized resources
9. **Environment variable for API key** — `VITE_GEMINI_API_KEY` in `.env`, skip modal when present

---

## Section 1: Deeper Reflection Questions

### What

Add 4 new open-ended questions after the existing 8, bringing the total to 12.

### Questions

9. **"Think of a career decision you regret — or almost made but didn't. What held you back?"**
   - Surfaces: fear patterns, risk tolerance, what they optimize for under pressure

10. **"What's something you're good at that you don't want to do anymore?"**
   - Surfaces: competence traps — being promoted into things you're skilled at but hate

11. **"If money were equal across all options, what would change about your choice?"**
   - Surfaces: isolates financial anxiety from genuine preference

12. **"What would you need to believe about yourself to make a big career change?"**
   - Surfaces: identity barriers — "I'm not a creative person," "I'm too old to start over"

### Implementation

- All 4 are open-ended text fields (reuse existing `OpenEnded` component)
- All are optional (same as existing open-ended questions)
- Added to the `ReflectionAnswers` type
- Stored and persisted via the existing session persistence system
- Included in the profile sent to the AI conversation step

---

## Section 2: Post-Reflection AI Conversation

### What

A new step (Step 1.5) between Reflect and Explore. A 3-5 turn AI-driven dialogue that probes tensions in the user's reflection answers.

### How It Works

1. After completing all 12 reflection questions, the user advances to the conversation step
2. The AI reads all reflection answers and identifies 2-3 **tensions** — contradictions or misalignments
3. The AI asks about one tension at a time, waits for a response
4. After each response, it either probes deeper or moves to the next tension
5. After 3-5 exchanges, the AI produces a **"Here's what I'm hearing"** summary
6. The user reviews and can edit/correct the summary before proceeding

### Tension Examples

- "You said mentoring makes time fly, but you rated Leadership Path 2/5. What makes you hesitant about leading?"
- "You want creative freedom and stability — those often trade off. Which would you sacrifice first?"
- "You regret not taking that startup offer, but you rated stability 5/5. Has something changed?"
- "You said you'd keep 'solving hard problems' but your energy is 2/5. Are the problems draining, or is it everything around them?"

### UX

- Chat-style interface within the wizard — bubble messages, streaming AI responses
- The AI message appears first with its question, user types a response below
- Smooth transition from the wizard question format to chat format
- After the final exchange, the synthesis summary appears as a distinct card/block the user can review and edit
- "This looks right" / "I'd adjust something" actions on the summary

### Data: Insight Profile

The conversation produces a structured `InsightProfile`:

```typescript
interface InsightProfile {
  tensions: Array<{
    description: string;    // "You want creative freedom and stability"
    question: string;       // What the AI asked
    response: string;       // What the user said
    resolution: string;     // How the tension was resolved
  }>;
  coreValues: Array<{
    value: string;          // "Creative problem-solving"
    rank: number;           // 1 = most important
    evidence: string;       // "Based on: your answer about regret, energy around mentoring"
  }>;
  hiddenBlockers: Array<{
    belief: string;         // "I'm too far into backend to pivot"
    source: string;         // Which answer surfaced this
  }>;
  narrative: string;        // The "here's what I'm hearing" synthesis
  conversationLog: Array<{  // Full conversation for downstream context
    role: 'assistant' | 'user';
    content: string;
  }>;
}
```

### Gemini Prompt (Tension Identification)

The initial prompt sends all reflection answers and asks Gemini to:
1. Identify 2-3 tensions/contradictions
2. Generate the first question
3. Return structured JSON with the tensions found and first question

Each subsequent turn sends the conversation history and asks for either a follow-up probe or the next tension question, until 3-5 exchanges are complete. The final turn requests the synthesis and structured InsightProfile.

### Session Persistence

- Conversation state (messages, current tension index) saved to localStorage
- User can leave mid-conversation and resume
- The completed InsightProfile is saved separately once finalized

---

## Section 3: Tension Mapping & Values Hierarchy

### What

A visual display of the user's top 5-6 values as derived from the AI conversation, shown between the conversation and path generation. The user can reorder them.

### Display

- Ranked list of values, each with:
  - The value name (e.g., "Creative problem-solving")
  - A one-line evidence note (e.g., "Based on: your answer about regret, your energy around mentoring")
  - Where slider ratings and conversation insights disagree, a callout: "You rated salary 4/5, but when money was removed from the equation, nothing changed"
- Drag-to-reorder interaction
- Clean, minimal UI — a ranked list, not a complex chart

### User Overrides

- If the user reorders values, the override is captured as signal
- The gap between AI-derived ranking and user-chosen ranking is itself data fed downstream

### Downstream Effects

- Path generation uses the resolved values hierarchy, not raw slider values
- Decision matrix weights auto-populate from this hierarchy (user can still override)
- Action plan prioritizes based on these values

### Data

```typescript
interface ValuesHierarchy {
  values: Array<{
    value: string;
    aiRank: number;
    userRank: number;       // Same as aiRank unless user reordered
    evidence: string;
    sliderConflict?: string; // If slider rating disagrees with conversation insight
  }>;
}
```

---

## Section 4: Path Exploration Mode

### What

Per-path conversational Q&A. Each generated path card gets an "Explore this path" button that opens a chat panel where the user can ask anything about that path.

### UX

- Slide-out panel from the path card (not a separate page)
- Chat interface with streaming responses
- Conversation history persists per path — leave and come back
- Path cards show an indicator if explored ("3 questions asked")
- No minimum or maximum questions — some paths users will skip, others they'll dig into

### Context Available to the AI

- The user's full InsightProfile
- The specific path's details (title, description, skills, salary, etc.)
- All other generated paths (for comparison questions)
- Any prior messages in this path's exploration chat

### Score Adjustment Suggestions

If during exploration the user expresses a concern that maps to a matrix criterion, the AI can suggest a score adjustment:

> "Based on your conversation, you seemed concerned about travel requirements in Dev Rel. Want me to lower the work-life balance score for this path?"

These suggestions are stored and surfaced when the user reaches the decision matrix step, not applied automatically.

### Data

```typescript
interface PathExploration {
  pathId: string;
  messages: Array<{
    role: 'assistant' | 'user';
    content: string;
  }>;
  suggestedScoreAdjustments: Array<{
    criterionId: string;
    suggestedScore: number;
    rationale: string;
    accepted: boolean | null;  // null = not yet reviewed
  }>;
}
```

---

## Section 5: Scenario Modeling in Decision Matrix

### What

A "What If" mode in the decision matrix that lets users explore how different weight configurations change the rankings.

### UX

- Toggle at the top of the matrix: "Explore scenarios"
- When active, weight slider changes animate the ranking re-sort in real-time
- Preset scenario buttons:
  - "What if money didn't matter?" (salary → 1)
  - "What if I prioritize growth?" (learning → 5)
  - "What if I need to switch fast?" (transition → 5)
  - "What if stability is everything?" (stability → 5, creative → 1)
- Each scenario shows the delta: "Path B jumps from #3 to #1"
- Users can name and save custom scenarios
- Clicking a preset applies it temporarily — clicking "Reset" restores base weights

### Sensitivity Analysis

A summary line below the matrix:

- "Your top path stays #1 in 4/5 scenarios — it's a robust choice"
- "Your top path only wins when salary is weighted high — consider whether that's your real priority"

Calculated by running all preset scenarios and counting how often each path is #1.

### Data

```typescript
interface Scenario {
  name: string;
  weights: Record<string, number>;  // criterionId -> weight
  isPreset: boolean;
}

interface SensitivityResult {
  pathId: string;
  winsInScenarios: number;
  totalScenarios: number;
  isRobust: boolean;  // wins in > 50% of scenarios
}
```

### Implementation Note

The weight sliders and real-time recalculation already exist. This is primarily new UI for presets, delta display, saved scenarios, and the sensitivity summary.

---

## Section 6: Conviction Check

### What

After the matrix produces its ranking, before generating the action plan, ask: "Does this feel right?"

### UX

A full-width card showing the top-ranked path prominently, with three response options:

1. **"Yes, that's the one"** — proceed to action plan for this path
2. **"I think so, but I'm not sure"** — opens a short AI conversation exploring the hesitation (2-3 turns). What's creating doubt? Fear? Missing info? A gut feeling? Response appended to InsightProfile
3. **"No, I'd actually pick [other path]"** — dropdown to select a different path. Opens AI conversation: "What does [other path] have that the numbers aren't capturing?" Response appended to InsightProfile. Action plan generates for the user-chosen path

### Downstream Effect

- The action plan generates for whichever path the user commits to (not necessarily the highest-scored)
- The conviction check reasoning feeds into the personal narrative
- If they overrode the matrix, the narrative addresses it: "You chose X even though Y scored higher — here's what that tells us"

### Data

```typescript
interface ConvictionCheck {
  matrixTopPath: string;        // What the numbers said
  chosenPath: string;           // What the user chose
  response: 'yes' | 'unsure' | 'override';
  conversation?: Array<{        // Only if 'unsure' or 'override'
    role: 'assistant' | 'user';
    content: string;
  }>;
  reasoning?: string;           // AI summary of why they chose differently
}
```

---

## Section 7: Personal Narrative in Summary

### What

The summary step opens with a 2-3 paragraph AI-written narrative that tells the user's story back to them.

### Content

The narrative synthesizes:
- Core values and tensions from the InsightProfile
- The conviction check (did they agree with the matrix or override it?)
- Path exploration conversations (key concerns, discoveries)
- Values hierarchy adjustments
- Hidden blockers identified

### Example

> "You're someone who comes alive when solving hard technical problems and mentoring others — but you've been spending most of your energy fighting legacy code and unclear requirements. You rated stability highly, but when we dug deeper, you realized that what you actually want is *predictability*, not *safety* — you'd take a risk if you could see the path clearly.
>
> The tension between your love of creative problem-solving and your need for structure pointed toward [chosen path]. It lets you keep the technical depth you value while moving away from the parts of your current role that drain you. The fact that you chose this path even though [other path] scored higher on paper tells us something — you trust your ability to grow into this more than the numbers suggest.
>
> Your biggest blocker isn't skills — it's the belief that you're 'too far into backend to pivot.' Your 90-day plan is designed to disprove that quickly."

### Placement

- First section of the summary, before the existing structured data (paths, matrix, action plan)
- Included in PDF export
- The rest of the summary remains unchanged

### Gemini Prompt

Sends the full InsightProfile, conviction check data, path exploration highlights, and the chosen path. Asks for a 2-3 paragraph narrative in second person ("You're someone who...") that connects the dots between what was surfaced and what was chosen.

---

## Section 8: Smarter Action Plan

### What

The action plan prompt is rebuilt to include the full InsightProfile and produce more personalized output.

### New Sections in the Action Plan

In addition to the existing `phases`, `resources`, `resumeTips`, `interviewPrep`, `riskMitigation`:

- **`biggestRisk`** — names the real blocker surfaced during reflection, not the obvious career risk. "Your biggest risk isn't skills — it's the belief that [hidden blocker]. Here's how to address it."
- **`identityMilestones`** — alongside skill milestones: "By day 30, you should be able to describe yourself as [new role] without feeling like an impostor"
- **`checkpoints`** — at day 30 and day 60, specific self-assessment questions: "Am I energized by this work, or just going through the motions?" with explicit off-ramps: "If the answer is no, here's what to pivot to instead"

### Updated Data Shape

```typescript
interface ActionPlan {
  targetPathId: string;
  targetPathTitle: string;
  phases: Array<{
    title: string;
    timeframe: string;
    items: string[];
  }>;
  resources: string[];
  resumeTips: string[];
  interviewPrep: string[];
  riskMitigation: string[];
  // New fields
  biggestRisk: {
    belief: string;        // The hidden blocker
    reframe: string;       // How to think about it differently
    earlyActions: string[];// Concrete steps to disprove it
  };
  identityMilestones: Array<{
    timeframe: string;     // "By day 30"
    milestone: string;     // "Describe yourself as a [role] in conversation"
  }>;
  checkpoints: Array<{
    timeframe: string;     // "Day 30"
    question: string;      // "Am I energized by this work?"
    greenLight: string;    // What "yes" looks like
    offRamp: string;       // What to do if "no"
  }>;
}
```

### Prompt Changes

The action plan Gemini prompt is rebuilt to include:
- Full InsightProfile (tensions, core values, hidden blockers)
- Conviction check reasoning (why they chose this path)
- Path exploration Q&A highlights for the chosen path
- Request for the new sections (biggestRisk, identityMilestones, checkpoints)
- Instruction to reference specific answers and beliefs, not generic advice

---

## Section 9: Environment Variable for API Key

### What

Support `VITE_GEMINI_API_KEY` in `.env` file. Skip the API key modal when the env var is present.

### Implementation

- In the Gemini service, check `import.meta.env.VITE_GEMINI_API_KEY` first
- If present, use it directly — no modal shown
- If absent, fall back to the existing modal flow (prompt user, store in localStorage)
- Add `.env` to `.gitignore` (if not already present)
- Add `.env.example` with `VITE_GEMINI_API_KEY=your_key_here` as documentation

---

## Updated Wizard Flow

The wizard expands from 5 steps to 7 logical steps (though some can be presented as sub-steps):

1. **Reflect** — 12 questions (existing 8 + 4 new)
2. **Discover** (NEW) — AI conversation surfacing tensions + values hierarchy review
3. **Explore** — Path generation + per-path exploration chat
4. **Compare** — Decision matrix + scenario modeling
5. **Commit** (NEW) — Conviction check
6. **Plan** — Enhanced action plan
7. **Summary** — Personal narrative + existing structured summary + export

The progress bar updates to reflect 7 steps.

---

## State Dependencies

```
Reflect answers
  → AI Conversation → InsightProfile
    → Values Hierarchy (user-adjustable)
      → Path Generation (uses InsightProfile + values)
        → Path Exploration chats
          → Decision Matrix (weights from values, scores from AI + exploration)
            → Scenario Modeling
              → Conviction Check
                → Action Plan (uses everything)
                  → Personal Narrative (uses everything)
                    → Summary + Export
```

Changing anything upstream marks all downstream steps as stale (existing undo/redo system handles this).

---

## New Gemini API Calls

Current: 3 calls (paths, matrix scores, action plan)

New total: ~6-10 calls depending on user behavior:
1. Tension identification + first question (Step 2)
2. 2-4 follow-up conversation turns (Step 2)
3. Synthesis + InsightProfile generation (Step 2)
4. Path generation (Step 3 — enhanced prompt)
5. 0-N path exploration conversations (Step 3 — per user)
6. Matrix score pre-fill (Step 4 — enhanced prompt)
7. Conviction check conversation (Step 5 — 0-3 turns)
8. Action plan generation (Step 6 — enhanced prompt)
9. Personal narrative generation (Step 7)

All conversational turns use streaming. Matrix scoring remains non-streaming.
