# Insight Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Clarify from a form-to-output career tool into a career clarity experience with AI conversation, tension mapping, path exploration, scenario modeling, conviction check, personal narrative, and smarter action plans.

**Architecture:** The existing 5-step wizard expands to 7 steps. New types are added to `src/types.ts`. New Gemini service functions are added to `src/services/gemini.ts`. New components are created for the conversation UI, values hierarchy, path exploration, scenario modeling, conviction check, and narrative display. The `useWizard` hook gets new actions and state fields. Session persistence extends to cover all new state.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Framer Motion, Google Generative AI SDK, jsPDF, Vitest

---

## Phase 1: Foundation — Types, .env, Deeper Questions, 7-Step Wizard

This phase adds the new types, .env support, 4 deeper reflection questions, and updates the wizard from 5 to 7 steps with placeholder components for the new steps.

---

### Task 1: Add .env support and update .gitignore

**Files:**
- Modify: `src/services/gemini.ts:7-9` (getApiKey function)
- Modify: `.gitignore`
- Create: `.env.example`

- [ ] **Step 1: Add .env and .env.example to .gitignore**

In `.gitignore`, append these lines at the end:

```
# Environment variables
.env
.env.local
.env.*.local
```

- [ ] **Step 2: Create .env.example**

Create `.env.example` with:

```
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

- [ ] **Step 3: Update getApiKey() to check env var first**

In `src/services/gemini.ts`, replace the `getApiKey` function:

```typescript
export function getApiKey(): string | null {
  const envKey = import.meta.env.VITE_GEMINI_API_KEY
  if (envKey) return envKey
  return localStorage.getItem(STORAGE_KEY)
}
```

- [ ] **Step 4: Add hasEnvApiKey() helper**

Below `getApiKey` in `src/services/gemini.ts`, add:

```typescript
export function hasEnvApiKey(): boolean {
  return !!import.meta.env.VITE_GEMINI_API_KEY
}
```

This is used by `PathGenerationStep` to skip the API key modal when the env var is set.

- [ ] **Step 5: Update PathGenerationStep to skip modal when env key exists**

In `src/components/PathGenerationStep.tsx`, update the import and the `needsKey` state:

```typescript
import { getApiKey, saveApiKey, hasEnvApiKey, streamCareerPaths } from '../services/gemini'
```

Change the useState:

```typescript
const [needsKey, setNeedsKey] = useState(!getApiKey() && !hasEnvApiKey())
```

And in the `generate` callback, update the guard:

```typescript
const generate = useCallback(() => {
  const apiKey = getApiKey()
  if (!apiKey) {
    if (!hasEnvApiKey()) setNeedsKey(true)
    return
  }
  // ... rest unchanged
```

- [ ] **Step 6: Verify build passes**

Run: `npm run build`
Expected: Build succeeds with no type errors.

- [ ] **Step 7: Commit**

```bash
git add .gitignore .env.example src/services/gemini.ts src/components/PathGenerationStep.tsx
git commit -m "feat: add .env support for Gemini API key"
```

---

### Task 2: Add new types for InsightProfile, ValuesHierarchy, PathExploration, ConvictionCheck, enhanced ActionPlan

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: Write failing test for new types**

Create `src/types.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { createInitialReflection, createInitialInsightProfile, createInitialValuesHierarchy } from './types'

describe('createInitialReflection', () => {
  it('includes new deep reflection fields', () => {
    const r = createInitialReflection()
    expect(r.regretDecision).toBe('')
    expect(r.goodAtButDontWant).toBe('')
    expect(r.ifMoneyEqual).toBe('')
    expect(r.beliefToChange).toBe('')
  })
})

describe('createInitialInsightProfile', () => {
  it('returns empty insight profile', () => {
    const p = createInitialInsightProfile()
    expect(p.tensions).toEqual([])
    expect(p.coreValues).toEqual([])
    expect(p.hiddenBlockers).toEqual([])
    expect(p.narrative).toBe('')
    expect(p.conversationLog).toEqual([])
  })
})

describe('createInitialValuesHierarchy', () => {
  it('returns empty values hierarchy', () => {
    const v = createInitialValuesHierarchy()
    expect(v.values).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/types.test.ts`
Expected: FAIL — `createInitialInsightProfile` and new reflection fields don't exist.

- [ ] **Step 3: Add new fields to ReflectionAnswers**

In `src/types.ts`, add four fields to the `ReflectionAnswers` interface after `successVision`:

```typescript
export interface ReflectionAnswers {
  energizers: string[]
  drainers: string[]
  keepInJob: string
  priorities: Record<string, number>
  codingIn5Years: string
  energyLevel: number
  learningInterests: string[]
  successVision: string
  // Deep reflection questions
  regretDecision: string
  goodAtButDontWant: string
  ifMoneyEqual: string
  beliefToChange: string
}
```

Update `createInitialReflection()` to include the new fields:

```typescript
export function createInitialReflection(): ReflectionAnswers {
  const priorities: Record<string, number> = {}
  for (const key of PRIORITY_KEYS) {
    priorities[key] = 3
  }
  return {
    energizers: [],
    drainers: [],
    keepInJob: '',
    priorities,
    codingIn5Years: '',
    energyLevel: 3,
    learningInterests: [],
    successVision: '',
    regretDecision: '',
    goodAtButDontWant: '',
    ifMoneyEqual: '',
    beliefToChange: '',
  }
}
```

- [ ] **Step 4: Add InsightProfile types**

In `src/types.ts`, add after the `ReflectionAnswers` block:

```typescript
export interface Tension {
  description: string
  question: string
  response: string
  resolution: string
}

export interface CoreValue {
  value: string
  rank: number
  evidence: string
}

export interface HiddenBlocker {
  belief: string
  source: string
}

export interface ConversationMessage {
  role: 'assistant' | 'user'
  content: string
}

export interface InsightProfile {
  tensions: Tension[]
  coreValues: CoreValue[]
  hiddenBlockers: HiddenBlocker[]
  narrative: string
  conversationLog: ConversationMessage[]
}

export function createInitialInsightProfile(): InsightProfile {
  return {
    tensions: [],
    coreValues: [],
    hiddenBlockers: [],
    narrative: '',
    conversationLog: [],
  }
}
```

- [ ] **Step 5: Add ValuesHierarchy type**

In `src/types.ts`:

```typescript
export interface ValueEntry {
  value: string
  aiRank: number
  userRank: number
  evidence: string
  sliderConflict?: string
}

export interface ValuesHierarchy {
  values: ValueEntry[]
}

export function createInitialValuesHierarchy(): ValuesHierarchy {
  return { values: [] }
}
```

- [ ] **Step 6: Add PathExploration type**

In `src/types.ts`:

```typescript
export interface ScoreAdjustment {
  criterionId: string
  suggestedScore: number
  rationale: string
  accepted: boolean | null
}

export interface PathExploration {
  pathId: string
  messages: ConversationMessage[]
  suggestedScoreAdjustments: ScoreAdjustment[]
}
```

- [ ] **Step 7: Add ConvictionCheck type**

In `src/types.ts`:

```typescript
export interface ConvictionCheck {
  matrixTopPath: string
  chosenPath: string
  response: 'yes' | 'unsure' | 'override'
  conversation: ConversationMessage[]
  reasoning: string
}
```

- [ ] **Step 8: Add Scenario and SensitivityResult types**

In `src/types.ts`:

```typescript
export interface Scenario {
  name: string
  weights: Record<string, number>
  isPreset: boolean
}

export interface SensitivityResult {
  pathId: string
  winsInScenarios: number
  totalScenarios: number
  isRobust: boolean
}
```

- [ ] **Step 9: Add enhanced ActionPlan fields**

In `src/types.ts`, extend the `ActionPlan` interface with new optional fields (keeping backward compat with existing data):

```typescript
export interface ActionPlan {
  targetPathId: string
  targetPathTitle: string
  phases: ActionPlanPhase[]
  resources: string[]
  resumeTips: string[]
  interviewPrep: string[]
  riskMitigation: string[]
  // Enhanced fields
  biggestRisk?: {
    belief: string
    reframe: string
    earlyActions: string[]
  }
  identityMilestones?: Array<{
    timeframe: string
    milestone: string
  }>
  checkpoints?: Array<{
    timeframe: string
    question: string
    greenLight: string
    offRamp: string
  }>
}
```

- [ ] **Step 10: Update WizardState with new fields**

In `src/types.ts`, update the `WizardState` interface:

```typescript
export interface WizardState {
  currentStep: number
  reflection: ReflectionAnswers
  insightProfile: InsightProfile
  valuesHierarchy: ValuesHierarchy
  paths: CareerPath[]
  selectedPathIds: string[]
  pathExplorations: PathExploration[]
  matrix: MatrixState
  scenarios: Scenario[]
  convictionCheck: ConvictionCheck | null
  actionPlan: ActionPlan | null
  personalNarrative: string
}
```

- [ ] **Step 11: Update WIZARD_STEPS to 7 steps**

In `src/types.ts`, replace the `WIZARD_STEPS` constant:

```typescript
export const WIZARD_STEPS = [
  { number: 1, label: 'Reflect' },
  { number: 2, label: 'Discover' },
  { number: 3, label: 'Explore' },
  { number: 4, label: 'Compare' },
  { number: 5, label: 'Commit' },
  { number: 6, label: 'Plan' },
  { number: 7, label: 'Summary' },
] as const
```

- [ ] **Step 12: Run test to verify it passes**

Run: `npx vitest run src/types.test.ts`
Expected: PASS

- [ ] **Step 13: Commit**

```bash
git add src/types.ts src/types.test.ts
git commit -m "feat: add insight engine types and expand wizard to 7 steps"
```

---

### Task 3: Update useWizard hook for new state and actions

**Files:**
- Modify: `src/hooks/useWizard.ts`

- [ ] **Step 1: Write failing test for new wizard state**

Create `src/hooks/__tests__/useWizard.insight.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWizard } from '../useWizard'

describe('useWizard insight engine state', () => {
  it('initializes with empty insight profile', () => {
    const { result } = renderHook(() => useWizard())
    expect(result.current.state.insightProfile.tensions).toEqual([])
    expect(result.current.state.insightProfile.narrative).toBe('')
  })

  it('initializes with empty values hierarchy', () => {
    const { result } = renderHook(() => useWizard())
    expect(result.current.state.valuesHierarchy.values).toEqual([])
  })

  it('initializes with empty path explorations', () => {
    const { result } = renderHook(() => useWizard())
    expect(result.current.state.pathExplorations).toEqual([])
  })

  it('initializes with null conviction check', () => {
    const { result } = renderHook(() => useWizard())
    expect(result.current.state.convictionCheck).toBeNull()
  })

  it('initializes with empty personal narrative', () => {
    const { result } = renderHook(() => useWizard())
    expect(result.current.state.personalNarrative).toBe('')
  })

  it('setInsightProfile updates insight profile', () => {
    const { result } = renderHook(() => useWizard())
    act(() => {
      result.current.setInsightProfile({
        tensions: [{ description: 'test', question: 'q', response: 'r', resolution: 'res' }],
        coreValues: [],
        hiddenBlockers: [],
        narrative: 'Test narrative',
        conversationLog: [],
      })
    })
    expect(result.current.state.insightProfile.narrative).toBe('Test narrative')
    expect(result.current.state.insightProfile.tensions).toHaveLength(1)
  })

  it('setValuesHierarchy updates values', () => {
    const { result } = renderHook(() => useWizard())
    act(() => {
      result.current.setValuesHierarchy({
        values: [{ value: 'Creative freedom', aiRank: 1, userRank: 1, evidence: 'test' }],
      })
    })
    expect(result.current.state.valuesHierarchy.values).toHaveLength(1)
  })

  it('setConvictionCheck stores conviction data', () => {
    const { result } = renderHook(() => useWizard())
    act(() => {
      result.current.setConvictionCheck({
        matrixTopPath: 'path-1',
        chosenPath: 'path-1',
        response: 'yes',
        conversation: [],
        reasoning: '',
      })
    })
    expect(result.current.state.convictionCheck?.response).toBe('yes')
  })

  it('setPersonalNarrative stores narrative text', () => {
    const { result } = renderHook(() => useWizard())
    act(() => {
      result.current.setPersonalNarrative('You are someone who...')
    })
    expect(result.current.state.personalNarrative).toBe('You are someone who...')
  })

  it('setting insight profile marks steps 3-6 as stale', () => {
    const { result } = renderHook(() => useWizard())
    act(() => {
      result.current.setInsightProfile({
        tensions: [],
        coreValues: [{ value: 'test', rank: 1, evidence: 'e' }],
        hiddenBlockers: [],
        narrative: 'n',
        conversationLog: [],
      })
    })
    // Stale steps should include downstream steps
    expect(result.current.staleSteps).toContain(3)
    expect(result.current.staleSteps).toContain(4)
    expect(result.current.staleSteps).toContain(5)
    expect(result.current.staleSteps).toContain(6)
  })

  it('addPathExploration adds exploration for a path', () => {
    const { result } = renderHook(() => useWizard())
    act(() => {
      result.current.addPathExplorationMessage('path-1', { role: 'user', content: 'hello' })
    })
    expect(result.current.state.pathExplorations).toHaveLength(1)
    expect(result.current.state.pathExplorations[0].pathId).toBe('path-1')
    expect(result.current.state.pathExplorations[0].messages).toHaveLength(1)
  })

  it('addPathExploration appends to existing exploration', () => {
    const { result } = renderHook(() => useWizard())
    act(() => {
      result.current.addPathExplorationMessage('path-1', { role: 'user', content: 'hello' })
    })
    act(() => {
      result.current.addPathExplorationMessage('path-1', { role: 'assistant', content: 'hi' })
    })
    expect(result.current.state.pathExplorations).toHaveLength(1)
    expect(result.current.state.pathExplorations[0].messages).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/__tests__/useWizard.insight.test.ts`
Expected: FAIL — new state fields and actions don't exist yet.

- [ ] **Step 3: Update imports in useWizard.ts**

In `src/hooks/useWizard.ts`, update the import:

```typescript
import type {
  WizardState, ReflectionAnswers, CareerPath, MatrixScore, ActionPlan,
  InsightProfile, ValuesHierarchy, ConvictionCheck, ConversationMessage,
} from '../types'
import {
  createInitialReflection, createInitialMatrix, createInitialInsightProfile,
  createInitialValuesHierarchy, WIZARD_STEPS, MATRIX_CRITERIA,
} from '../types'
```

- [ ] **Step 4: Add new action types**

In `src/hooks/useWizard.ts`, extend the `WizardAction` union type — add these after the existing non-undoable actions:

```typescript
  // Insight engine actions (non-undoable, LLM / system)
  | { type: 'SET_INSIGHT_PROFILE'; profile: InsightProfile }
  | { type: 'SET_VALUES_HIERARCHY'; hierarchy: ValuesHierarchy }
  | { type: 'SET_CONVICTION_CHECK'; check: ConvictionCheck | null }
  | { type: 'SET_PERSONAL_NARRATIVE'; narrative: string }
  | { type: 'ADD_PATH_EXPLORATION_MESSAGE'; pathId: string; message: ConversationMessage }
  | { type: 'SET_SCENARIOS'; scenarios: import('../types').Scenario[] }
```

- [ ] **Step 5: Add reducer cases for new actions**

In the `wizardReducer` function, add these cases after `SET_ACTION_PLAN`:

```typescript
    case 'SET_INSIGHT_PROFILE':
      return {
        ...history,
        current: { ...current, insightProfile: action.profile },
        staleSteps: addStaleDownstream(staleSteps.filter((s) => s !== 2), 2),
      }

    case 'SET_VALUES_HIERARCHY':
      return {
        ...history,
        current: { ...current, valuesHierarchy: action.hierarchy },
        staleSteps: addStaleDownstream(staleSteps.filter((s) => s !== 2), 2),
      }

    case 'SET_CONVICTION_CHECK':
      return {
        ...history,
        current: { ...current, convictionCheck: action.check },
        staleSteps: staleSteps.filter((s) => s !== 5),
      }

    case 'SET_PERSONAL_NARRATIVE':
      return {
        ...history,
        current: { ...current, personalNarrative: action.narrative },
      }

    case 'ADD_PATH_EXPLORATION_MESSAGE': {
      const existing = current.pathExplorations.find((e) => e.pathId === action.pathId)
      let nextExplorations
      if (existing) {
        nextExplorations = current.pathExplorations.map((e) =>
          e.pathId === action.pathId
            ? { ...e, messages: [...e.messages, action.message] }
            : e,
        )
      } else {
        nextExplorations = [
          ...current.pathExplorations,
          { pathId: action.pathId, messages: [action.message], suggestedScoreAdjustments: [] },
        ]
      }
      return {
        ...history,
        current: { ...current, pathExplorations: nextExplorations },
      }
    }

    case 'SET_SCENARIOS':
      return {
        ...history,
        current: { ...current, scenarios: action.scenarios },
      }
```

- [ ] **Step 6: Update stale step tracking for 7-step wizard**

In `src/hooks/useWizard.ts`, update `addStaleDownstream` to handle 7 steps (change `4` to `6` since step 7 is summary and derives from state):

```typescript
function addStaleDownstream(staleSteps: number[], fromStep: number): number[] {
  const set = new Set(staleSteps)
  for (let s = fromStep + 1; s <= 6; s++) set.add(s)
  return Array.from(set)
}
```

Also update the existing `UPDATE_REFLECTION` case to mark from step 1:

```typescript
    case 'UPDATE_REFLECTION': {
      const next: WizardState = {
        ...current,
        reflection: { ...current.reflection, ...action.updates },
      }
      return {
        current: next,
        past: pushEntry(past, current, staleSteps),
        future: [],
        staleSteps: addStaleDownstream(staleSteps, 1),
        direction,
      }
    }
```

Update `TOGGLE_PATH_SELECTION` to mark from step 3 (now Explore):

```typescript
    case 'TOGGLE_PATH_SELECTION': {
      // ... selection logic unchanged ...
      return {
        current: { ...current, selectedPathIds: nextIds },
        past: pushEntry(past, current, staleSteps),
        future: [],
        staleSteps: addStaleDownstream(staleSteps, 3),
        direction,
      }
    }
```

Update `UPDATE_WEIGHT` and `UPDATE_SCORE` to mark from step 4 (now Compare):

```typescript
    case 'UPDATE_WEIGHT':
      return {
        // ... state change unchanged ...
        staleSteps: addStaleDownstream(staleSteps, 4),
        // ...
      }

    case 'UPDATE_SCORE': {
      // ... state change unchanged ...
      return {
        // ...
        staleSteps: addStaleDownstream(staleSteps, 4),
        // ...
      }
    }
```

Update `SET_PATHS` to clear stale step 3 (Explore):

```typescript
    case 'SET_PATHS':
      return {
        ...history,
        current: { ...current, paths: action.paths },
        staleSteps: staleSteps.filter((s) => s !== 3),
      }
```

Update `SET_MATRIX_SCORES` to clear stale step 4 (Compare):

```typescript
    case 'SET_MATRIX_SCORES':
      return {
        ...history,
        current: {
          ...current,
          matrix: { ...current.matrix, scores: { ...current.matrix.scores, ...action.scores } },
        },
        staleSteps: staleSteps.filter((s) => s !== 4),
      }
```

Update `SET_ACTION_PLAN` to clear stale step 6 (Plan):

```typescript
    case 'SET_ACTION_PLAN':
      return {
        ...history,
        current: { ...current, actionPlan: action.plan },
        staleSteps: staleSteps.filter((s) => s !== 6),
      }
```

- [ ] **Step 7: Update initialHistory with new state fields**

```typescript
const initialHistory: WizardHistory = {
  current: {
    currentStep: 1,
    reflection: createInitialReflection(),
    insightProfile: createInitialInsightProfile(),
    valuesHierarchy: createInitialValuesHierarchy(),
    paths: [],
    selectedPathIds: [],
    pathExplorations: [],
    matrix: createInitialMatrix(),
    scenarios: [],
    convictionCheck: null,
    actionPlan: null,
    personalNarrative: '',
  },
  past: [],
  future: [],
  staleSteps: [],
  direction: 1,
}
```

- [ ] **Step 8: Update canAdvance() validation for 7 steps**

```typescript
  const canAdvance = useCallback((): boolean => {
    switch (state.currentStep) {
      case 1:
        return isReflectionComplete(state.reflection)
      case 2:
        return state.insightProfile.narrative !== ''
      case 3:
        return state.selectedPathIds.length >= 2 && state.selectedPathIds.length <= 4
      case 4: {
        const { scores } = state.matrix
        return state.selectedPathIds.every(
          (pid) =>
            scores[pid] &&
            MATRIX_CRITERIA.every((c) => scores[pid][c.id]?.score > 0),
        )
      }
      case 5:
        return state.convictionCheck !== null
      case 6:
        return state.actionPlan !== null
      default:
        return false
    }
  }, [state])
```

- [ ] **Step 9: Add new dispatch functions to the hook return**

Add these to the return object of `useWizard()`:

```typescript
    setInsightProfile: useCallback(
      (profile: InsightProfile) => dispatch({ type: 'SET_INSIGHT_PROFILE', profile }),
      [],
    ),
    setValuesHierarchy: useCallback(
      (hierarchy: ValuesHierarchy) => dispatch({ type: 'SET_VALUES_HIERARCHY', hierarchy }),
      [],
    ),
    setConvictionCheck: useCallback(
      (check: ConvictionCheck | null) => dispatch({ type: 'SET_CONVICTION_CHECK', check }),
      [],
    ),
    setPersonalNarrative: useCallback(
      (narrative: string) => dispatch({ type: 'SET_PERSONAL_NARRATIVE', narrative }),
      [],
    ),
    addPathExplorationMessage: useCallback(
      (pathId: string, message: ConversationMessage) =>
        dispatch({ type: 'ADD_PATH_EXPLORATION_MESSAGE', pathId, message }),
      [],
    ),
    setScenarios: useCallback(
      (scenarios: import('../types').Scenario[]) => dispatch({ type: 'SET_SCENARIOS', scenarios }),
      [],
    ),
```

- [ ] **Step 10: Run test to verify it passes**

Run: `npx vitest run src/hooks/__tests__/useWizard.insight.test.ts`
Expected: PASS

- [ ] **Step 11: Commit**

```bash
git add src/hooks/useWizard.ts src/hooks/__tests__/useWizard.insight.test.ts
git commit -m "feat: extend useWizard with insight engine state and actions"
```

---

### Task 4: Add 4 deeper reflection questions to ReflectionStep

**Files:**
- Modify: `src/components/ReflectionStep.tsx`

- [ ] **Step 1: Write failing test for new questions**

Create `src/components/__tests__/ReflectionDeep.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ReflectionStep } from '../ReflectionStep'
import { createInitialReflection } from '../../types'

describe('ReflectionStep deep questions', () => {
  const baseProps = {
    answers: {
      ...createInitialReflection(),
      energizers: ['Building UI'],
      drainers: ['Meetings'],
      codingIn5Years: 'maybe',
      learningInterests: ['Tech / coding'],
    },
    onChange: vi.fn(),
    onComplete: vi.fn(),
    canComplete: true,
  }

  it('shows 12 sub-progress dots', () => {
    render(<ReflectionStep {...baseProps} />)
    // Count progress dots — there should be 12
    const dots = document.querySelectorAll('.rounded-full.h-1\\.5')
    expect(dots.length).toBe(12)
  })

  it('navigates to question 9 (regret decision)', () => {
    render(<ReflectionStep {...baseProps} />)
    // Click Next 8 times to reach question 9
    for (let i = 0; i < 8; i++) {
      const nextBtn = screen.getByText('Next')
      fireEvent.click(nextBtn)
    }
    expect(screen.getByText(/career decision you regret/i)).toBeTruthy()
  })

  it('navigates to question 10 (good at but dont want)', () => {
    render(<ReflectionStep {...baseProps} />)
    for (let i = 0; i < 9; i++) {
      const nextBtn = screen.getByText('Next')
      fireEvent.click(nextBtn)
    }
    expect(screen.getByText(/good at that you don't want to do/i)).toBeTruthy()
  })

  it('navigates to question 11 (if money equal)', () => {
    render(<ReflectionStep {...baseProps} />)
    for (let i = 0; i < 10; i++) {
      const nextBtn = screen.getByText('Next')
      fireEvent.click(nextBtn)
    }
    expect(screen.getByText(/money were equal/i)).toBeTruthy()
  })

  it('navigates to question 12 (belief to change)', () => {
    render(<ReflectionStep {...baseProps} />)
    for (let i = 0; i < 11; i++) {
      const btn = screen.getByText('Next')
      fireEvent.click(btn)
    }
    expect(screen.getByText(/believe about yourself/i)).toBeTruthy()
  })

  it('shows Continue button on question 12', () => {
    render(<ReflectionStep {...baseProps} />)
    for (let i = 0; i < 11; i++) {
      fireEvent.click(screen.getByText('Next'))
    }
    expect(screen.getByText('Continue')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/__tests__/ReflectionDeep.test.tsx`
Expected: FAIL — only 8 questions exist.

- [ ] **Step 3: Update ReflectionStep to show 12 questions**

In `src/components/ReflectionStep.tsx`, change `TOTAL_QUESTIONS`:

```typescript
const TOTAL_QUESTIONS = 12
```

Update `canGoNext()` to handle questions 8-11 (all optional open-ended):

```typescript
  const canGoNext = (): boolean => {
    switch (questionIndex) {
      case 0: return answers.energizers.length > 0
      case 1: return answers.drainers.length > 0
      case 2: return true // open-ended, optional
      case 3: return true // sliders have defaults
      case 4: return answers.codingIn5Years !== ''
      case 5: return true // slider has default
      case 6: return answers.learningInterests.length > 0
      case 7: return true  // open-ended, optional
      case 8: return true  // regretDecision, optional
      case 9: return true  // goodAtButDontWant, optional
      case 10: return true // ifMoneyEqual, optional
      case 11: return true // beliefToChange, optional
      default: return false
    }
  }
```

Add the 4 new cases to `renderQuestion()`:

```typescript
      case 8:
        return (
          <OpenEnded
            question="Think of a career decision you regret — or almost made but didn't. What held you back?"
            subtitle="Optional — this helps us understand what drives your choices under pressure"
            placeholder="I almost took that role at... but I didn't because..."
            value={answers.regretDecision}
            onChange={(v) => onChange({ regretDecision: v })}
          />
        )
      case 9:
        return (
          <OpenEnded
            question="What's something you're good at that you don't want to do anymore?"
            subtitle="Optional — being good at something doesn't mean it's your path"
            placeholder="I'm known for... but honestly I'd rather..."
            value={answers.goodAtButDontWant}
            onChange={(v) => onChange({ goodAtButDontWant: v })}
          />
        )
      case 10:
        return (
          <OpenEnded
            question="If money were equal across all options, what would change about your choice?"
            subtitle="Optional — helps separate financial anxiety from genuine preference"
            placeholder="If salary didn't matter, I'd probably..."
            value={answers.ifMoneyEqual}
            onChange={(v) => onChange({ ifMoneyEqual: v })}
          />
        )
      case 11:
        return (
          <OpenEnded
            question="What would you need to believe about yourself to make a big career change?"
            subtitle="Optional — the biggest blockers are often beliefs, not skills"
            placeholder="I'd need to believe that..."
            value={answers.beliefToChange}
            onChange={(v) => onChange({ beliefToChange: v })}
          />
        )
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/__tests__/ReflectionDeep.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ReflectionStep.tsx src/components/__tests__/ReflectionDeep.test.tsx
git commit -m "feat: add 4 deeper reflection questions (regret, competence trap, money, identity)"
```

---

### Task 5: Create placeholder components for new wizard steps and wire up App.tsx

**Files:**
- Create: `src/components/DiscoverStep.tsx`
- Create: `src/components/CommitStep.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create DiscoverStep placeholder**

Create `src/components/DiscoverStep.tsx`:

```typescript
import type { ReflectionAnswers, InsightProfile, ValuesHierarchy } from '../types'

interface DiscoverStepProps {
  reflection: ReflectionAnswers
  insightProfile: InsightProfile
  valuesHierarchy: ValuesHierarchy
  isStale: boolean
  onSetInsightProfile: (profile: InsightProfile) => void
  onSetValuesHierarchy: (hierarchy: ValuesHierarchy) => void
  onComplete: () => void
  onBack: () => void
  canComplete: boolean
}

export function DiscoverStep({
  insightProfile,
  onComplete,
  onBack,
  canComplete,
}: DiscoverStepProps) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-8 space-y-2">
        <h2 className="text-2xl font-light tracking-tight text-slate-800">
          Let's dig deeper
        </h2>
        <p className="text-sm text-slate-400">
          A short conversation to surface what really matters to you.
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-slate-400">
          {insightProfile.narrative
            ? 'Conversation complete. Review your values below.'
            : 'AI conversation coming soon.'}
        </p>
      </div>

      <div className="mt-auto flex items-center justify-between pt-10">
        <button
          onClick={onBack}
          className="rounded-lg px-5 py-2.5 text-sm font-medium text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-700"
        >
          Back
        </button>
        <button
          onClick={onComplete}
          disabled={!canComplete}
          className={`rounded-lg px-6 py-2.5 text-sm font-medium transition-all duration-200 ${
            canComplete
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'cursor-not-allowed bg-slate-100 text-slate-300'
          }`}
        >
          Continue
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create CommitStep placeholder**

Create `src/components/CommitStep.tsx`:

```typescript
import type { CareerPath, MatrixState, ConvictionCheck } from '../types'

interface CommitStepProps {
  paths: CareerPath[]
  selectedPathIds: string[]
  matrix: MatrixState
  convictionCheck: ConvictionCheck | null
  onSetConvictionCheck: (check: ConvictionCheck) => void
  onComplete: () => void
  onBack: () => void
  canComplete: boolean
}

export function CommitStep({
  onComplete,
  onBack,
  canComplete,
}: CommitStepProps) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-8 space-y-2">
        <h2 className="text-2xl font-light tracking-tight text-slate-800">
          Does this feel right?
        </h2>
        <p className="text-sm text-slate-400">
          Check in with yourself before we build your plan.
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-slate-400">Conviction check coming soon.</p>
      </div>

      <div className="mt-auto flex items-center justify-between pt-10">
        <button
          onClick={onBack}
          className="rounded-lg px-5 py-2.5 text-sm font-medium text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-700"
        >
          Back
        </button>
        <button
          onClick={onComplete}
          disabled={!canComplete}
          className={`rounded-lg px-6 py-2.5 text-sm font-medium transition-all duration-200 ${
            canComplete
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'cursor-not-allowed bg-slate-100 text-slate-300'
          }`}
        >
          Generate plan
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Update App.tsx with new wizard wiring**

Replace the entire `App.tsx` with the updated 7-step version:

```typescript
import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ProgressBar } from './components/ProgressBar'
import { ReflectionStep } from './components/ReflectionStep'
import { DiscoverStep } from './components/DiscoverStep'
import { PathGenerationStep } from './components/PathGenerationStep'
import { DecisionMatrixStep } from './components/DecisionMatrixStep'
import { CommitStep } from './components/CommitStep'
import { ActionPlanStep } from './components/ActionPlanStep'
import { SummaryStep } from './components/SummaryStep'
import { SessionResumeModal } from './components/SessionResumeModal'
import { SessionConflictModal } from './components/SessionConflictModal'
import { useWizard } from './hooks/useWizard'
import { useSessionPersistence } from './hooks/useSessionPersistence'

const SLIDE_OFFSET = 60

function App() {
  const {
    state,
    direction,
    staleSteps,
    canAdvance,
    goToStep,
    nextStep,
    prevStep,
    updateReflection,
    setInsightProfile,
    setValuesHierarchy,
    setPaths,
    togglePathSelection,
    updateWeight,
    updateScore,
    setMatrixScores,
    setConvictionCheck,
    setActionPlan,
    setPersonalNarrative,
    addPathExplorationMessage,
    undo,
    redo,
    loadState,
  } = useWizard()

  const {
    sessionStatus,
    resumeSession,
    startFresh,
    acceptRemote,
    keepCurrent,
  } = useSessionPersistence(state, loadState)

  // Ctrl+Z / Ctrl+Shift+Z (Cmd on Mac) keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey) || e.key !== 'z') return

      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) {
        return
      }

      e.preventDefault()
      if (e.shiftKey) {
        redo()
      } else {
        undo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])

  const variants = {
    enter: (d: number) => ({ x: d * SLIDE_OFFSET, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d * -SLIDE_OFFSET, opacity: 0 }),
  }

  const renderStep = () => {
    switch (state.currentStep) {
      case 1:
        return (
          <ReflectionStep
            answers={state.reflection}
            onChange={updateReflection}
            onComplete={nextStep}
            canComplete={canAdvance()}
          />
        )
      case 2:
        return (
          <DiscoverStep
            reflection={state.reflection}
            insightProfile={state.insightProfile}
            valuesHierarchy={state.valuesHierarchy}
            isStale={staleSteps.includes(2)}
            onSetInsightProfile={setInsightProfile}
            onSetValuesHierarchy={setValuesHierarchy}
            onComplete={nextStep}
            onBack={prevStep}
            canComplete={canAdvance()}
          />
        )
      case 3:
        return (
          <PathGenerationStep
            reflection={state.reflection}
            paths={state.paths}
            selectedPathIds={state.selectedPathIds}
            isStale={staleSteps.includes(3)}
            onPathsUpdate={setPaths}
            onTogglePath={togglePathSelection}
            onComplete={nextStep}
            onBack={prevStep}
            canComplete={canAdvance()}
          />
        )
      case 4:
        return (
          <DecisionMatrixStep
            paths={state.paths}
            selectedPathIds={state.selectedPathIds}
            matrix={state.matrix}
            isStale={staleSteps.includes(4)}
            onUpdateWeight={updateWeight}
            onUpdateScore={updateScore}
            onSetScores={setMatrixScores}
            onComplete={nextStep}
            onBack={prevStep}
            canComplete={canAdvance()}
          />
        )
      case 5:
        return (
          <CommitStep
            paths={state.paths}
            selectedPathIds={state.selectedPathIds}
            matrix={state.matrix}
            convictionCheck={state.convictionCheck}
            onSetConvictionCheck={setConvictionCheck}
            onComplete={nextStep}
            onBack={prevStep}
            canComplete={canAdvance()}
          />
        )
      case 6:
        return (
          <ActionPlanStep
            paths={state.paths}
            selectedPathIds={state.selectedPathIds}
            matrix={state.matrix}
            actionPlan={state.actionPlan}
            isStale={staleSteps.includes(6)}
            onSetPlan={setActionPlan}
            onComplete={nextStep}
            onBack={prevStep}
            canComplete={canAdvance()}
          />
        )
      case 7:
        return <SummaryStep state={state} onBack={prevStep} />
      default:
        return null
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {sessionStatus.type === 'found-session' && (
        <SessionResumeModal
          savedStep={sessionStatus.savedState.currentStep}
          onResume={resumeSession}
          onStartFresh={startFresh}
        />
      )}
      {sessionStatus.type === 'conflict' && (
        <SessionConflictModal
          onLoadLatest={acceptRemote}
          onKeepCurrent={keepCurrent}
        />
      )}
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-center pt-5 pb-1">
            <h1 className="text-lg font-light tracking-tight text-slate-800">Clarify</h1>
          </div>
          <ProgressBar currentStep={state.currentStep} onStepClick={goToStep} />
        </div>
      </header>
      <main className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col overflow-hidden px-6 py-10">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={state.currentStep}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="flex flex-1 flex-col"
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}

export default App
```

- [ ] **Step 4: Update test fixtures for new state shape**

In `src/test/fixtures.ts`, update imports and functions:

```typescript
import type { ReflectionAnswers, CareerPath, MatrixScore, ActionPlan, WizardState } from '../types'
import { createInitialReflection, createInitialMatrix, createInitialInsightProfile, createInitialValuesHierarchy } from '../types'
```

Update `createCompletedReflection()` to include new fields:

```typescript
export function createCompletedReflection(): ReflectionAnswers {
  return {
    energizers: ['Building UI', 'Solving bugs'],
    drainers: ['Meetings', 'Legacy code'],
    keepInJob: 'The creative problem-solving aspects',
    priorities: {
      salary: 4,
      flexibility: 5,
      creativeFreedom: 4,
      teamQuality: 3,
      learningOpportunity: 5,
      impactMeaning: 3,
      stability: 2,
      leadershipPath: 2,
    },
    codingIn5Years: 'maybe',
    energyLevel: 3,
    learningInterests: ['Tech / coding', 'Design'],
    successVision: 'Leading a small product team',
    regretDecision: 'Almost joined a startup but played it safe',
    goodAtButDontWant: 'Debugging legacy systems',
    ifMoneyEqual: 'Would focus more on creative work',
    beliefToChange: 'That I am too specialized to pivot',
  }
}
```

Update `createFullWizardState()`:

```typescript
export function createFullWizardState(): WizardState {
  return {
    currentStep: 7,
    reflection: createCompletedReflection(),
    insightProfile: createInitialInsightProfile(),
    valuesHierarchy: createInitialValuesHierarchy(),
    paths: createMockPaths(),
    selectedPathIds: ['path-1', 'path-3'],
    pathExplorations: [],
    matrix: {
      ...createInitialMatrix(),
      scores: createMockScores(),
    },
    scenarios: [],
    convictionCheck: null,
    actionPlan: createMockActionPlan(),
    personalNarrative: '',
  }
}
```

Update `createInitialWizardState()`:

```typescript
export function createInitialWizardState(): WizardState {
  return {
    currentStep: 1,
    reflection: createInitialReflection(),
    insightProfile: createInitialInsightProfile(),
    valuesHierarchy: createInitialValuesHierarchy(),
    paths: [],
    selectedPathIds: [],
    pathExplorations: [],
    matrix: createInitialMatrix(),
    scenarios: [],
    convictionCheck: null,
    actionPlan: null,
    personalNarrative: '',
  }
}
```

- [ ] **Step 5: Verify full build passes**

Run: `npm run build`
Expected: Build succeeds with no type errors.

- [ ] **Step 6: Run all existing tests**

Run: `npm test`
Expected: All existing tests pass (some may need minor fixture updates due to new WizardState fields — fix any failures before committing).

- [ ] **Step 7: Commit**

```bash
git add src/components/DiscoverStep.tsx src/components/CommitStep.tsx src/App.tsx src/test/fixtures.ts
git commit -m "feat: wire up 7-step wizard with placeholder Discover and Commit steps"
```

---

## Phase 2: AI Conversation & Values Hierarchy

This phase implements the post-reflection AI conversation (DiscoverStep) and the values hierarchy display.

---

### Task 6: Add Gemini conversation service functions

**Files:**
- Modify: `src/services/gemini.ts`

- [ ] **Step 1: Write failing test for tension identification**

Create `src/services/__tests__/gemini.insight.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { buildTensionPrompt, buildConversationFollowUpPrompt, buildSynthesisPrompt } from '../gemini'
import { createCompletedReflection } from '../../test/fixtures'

describe('insight conversation prompts', () => {
  it('buildTensionPrompt includes reflection answers', () => {
    const reflection = createCompletedReflection()
    const prompt = buildTensionPrompt(reflection)
    expect(prompt).toContain('Building UI')
    expect(prompt).toContain('Meetings')
    expect(prompt).toContain('career decision you regret')
    expect(prompt).toContain('JSON')
  })

  it('buildConversationFollowUpPrompt includes conversation history', () => {
    const history = [
      { role: 'assistant' as const, content: 'You mentioned X. Tell me more.' },
      { role: 'user' as const, content: 'Well, I think...' },
    ]
    const prompt = buildConversationFollowUpPrompt(history, 2, 3)
    expect(prompt).toContain('You mentioned X')
    expect(prompt).toContain('Well, I think')
    expect(prompt).toContain('exchange 2 of 3')
  })

  it('buildSynthesisPrompt requests InsightProfile JSON', () => {
    const reflection = createCompletedReflection()
    const history = [
      { role: 'assistant' as const, content: 'Question' },
      { role: 'user' as const, content: 'Answer' },
    ]
    const prompt = buildSynthesisPrompt(reflection, history)
    expect(prompt).toContain('tensions')
    expect(prompt).toContain('coreValues')
    expect(prompt).toContain('hiddenBlockers')
    expect(prompt).toContain('narrative')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/__tests__/gemini.insight.test.ts`
Expected: FAIL — functions don't exist.

- [ ] **Step 3: Add buildTensionPrompt**

In `src/services/gemini.ts`, add after the existing `buildReflectionPrompt` function:

```typescript
export function buildTensionPrompt(answers: ReflectionAnswers): string {
  const priorityLines = Object.entries(answers.priorities)
    .map(([key, val]) => `  ${PRIORITY_LABELS[key] ?? key}: ${val}/5`)
    .join('\n')

  return `You are a career coach analyzing a software developer's self-reflection. Identify 2-3 tensions or contradictions in their answers — places where their stated preferences, behaviors, or values seem to pull in different directions. Then ask about the first tension.

Here are their reflection answers:

**What makes time fly at work:** ${answers.energizers.join(', ')}
**What drains them most:** ${answers.drainers.join(', ')}
**What they'd keep if redesigning their job:** ${answers.keepInJob || '(not specified)'}
**Priority ratings (1-5):**
${priorityLines}
**See themselves writing code in 5 years:** ${answers.codingIn5Years}
**End-of-day energy level:** ${answers.energyLevel}/5
**Learning interests outside work:** ${answers.learningInterests.join(', ')}
**What success looks like in 2 years:** ${answers.successVision || '(not specified)'}
**A career decision they regret or almost made:** ${answers.regretDecision || '(not specified)'}
**Something they're good at but don't want to do:** ${answers.goodAtButDontWant || '(not specified)'}
**If money were equal, what would change:** ${answers.ifMoneyEqual || '(not specified)'}
**What they'd need to believe to make a big change:** ${answers.beliefToChange || '(not specified)'}

Return ONLY a JSON object (no markdown, no code fences) with this shape:
{
  "tensions": [
    { "description": "Brief description of the tension" },
    { "description": "Brief description of another tension" }
  ],
  "firstQuestion": "Your conversational question about the first tension. Be specific — reference their actual answers. Warm, curious tone — like a good coach, not an interviewer."
}`
}
```

- [ ] **Step 4: Add buildConversationFollowUpPrompt**

```typescript
export function buildConversationFollowUpPrompt(
  history: Array<{ role: 'assistant' | 'user'; content: string }>,
  currentExchange: number,
  totalExchanges: number,
): string {
  const historyText = history
    .map((m) => `${m.role === 'assistant' ? 'Coach' : 'User'}: ${m.content}`)
    .join('\n\n')

  return `You are a career coach in a guided conversation. This is exchange ${currentExchange} of ${totalExchanges}.

Conversation so far:
${historyText}

Based on the user's most recent response, either:
1. Probe deeper on the same tension if there's more to uncover
2. Move to the next tension if this one feels resolved

Reply with a single conversational question or observation. Be warm, specific, and reference what they actually said. Keep it to 2-3 sentences max.

${currentExchange === totalExchanges ? 'This is the final exchange. After the user responds, you will be asked to synthesize everything.' : ''}

Return ONLY your response text — no JSON, no formatting, just the coach's message.`
}
```

- [ ] **Step 5: Add buildSynthesisPrompt**

```typescript
export function buildSynthesisPrompt(
  answers: ReflectionAnswers,
  history: Array<{ role: 'assistant' | 'user'; content: string }>,
): string {
  const priorityLines = Object.entries(answers.priorities)
    .map(([key, val]) => `  ${PRIORITY_LABELS[key] ?? key}: ${val}/5`)
    .join('\n')

  const historyText = history
    .map((m) => `${m.role === 'assistant' ? 'Coach' : 'User'}: ${m.content}`)
    .join('\n\n')

  return `You are a career coach. Synthesize everything you've learned from this developer's reflection and your conversation into a structured insight profile.

**Their reflection answers:**
Energizers: ${answers.energizers.join(', ')}
Drainers: ${answers.drainers.join(', ')}
Would keep: ${answers.keepInJob || '(not specified)'}
Priorities:
${priorityLines}
Coding in 5 years: ${answers.codingIn5Years}
Energy level: ${answers.energyLevel}/5
Learning interests: ${answers.learningInterests.join(', ')}
Success vision: ${answers.successVision || '(not specified)'}
Regret/almost decision: ${answers.regretDecision || '(not specified)'}
Good at but don't want: ${answers.goodAtButDontWant || '(not specified)'}
If money equal: ${answers.ifMoneyEqual || '(not specified)'}
Belief to change: ${answers.beliefToChange || '(not specified)'}

**Your conversation:**
${historyText}

Return ONLY a JSON object (no markdown, no code fences) with this exact shape:
{
  "tensions": [
    {
      "description": "Brief description of the tension",
      "question": "The question you asked about it",
      "response": "Summary of what they said",
      "resolution": "How they resolved or clarified it"
    }
  ],
  "coreValues": [
    {
      "value": "Name of the value",
      "rank": 1,
      "evidence": "What in their answers or conversation revealed this"
    }
  ],
  "hiddenBlockers": [
    {
      "belief": "The limiting belief or identity barrier",
      "source": "Which answer or conversation turn surfaced this"
    }
  ],
  "narrative": "A 2-3 paragraph 'here's what I'm hearing' summary written in second person ('You're someone who...'). Connect the dots between their tensions, values, and blockers. Be insightful and specific — reference their actual answers.",
  "valuesWithConflicts": [
    {
      "value": "Value name",
      "aiRank": 1,
      "evidence": "Evidence for this ranking",
      "sliderConflict": "If slider rating disagrees with conversation insight, explain here (or null)"
    }
  ]
}

Rank 5-6 core values by importance as revealed through conversation, not just slider ratings. If a slider rating contradicts what the conversation revealed, note it in sliderConflict.`
}
```

- [ ] **Step 6: Add streamConversationTurn function**

```typescript
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
      accumulated += chunk.text()
      callbacks.onText(accumulated)
    }

    callbacks.onDone(accumulated)
  } catch (err: unknown) {
    if (signal.aborted) return
    const message = err instanceof Error ? err.message : 'Conversation error'
    callbacks.onError(message)
  }
}
```

- [ ] **Step 7: Add generateInsightSynthesis function**

```typescript
export async function generateInsightSynthesis(
  apiKey: string,
  reflection: ReflectionAnswers,
  conversationLog: Array<{ role: 'assistant' | 'user'; content: string }>,
): Promise<{
  profile: import('../types').InsightProfile
  valuesHierarchy: import('../types').ValuesHierarchy
}> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' })

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: buildSynthesisPrompt(reflection, conversationLog) }] }],
  })

  const text = result.response.text()
  const cleaned = text.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '').trim()
  const raw = JSON.parse(cleaned)

  const profile: import('../types').InsightProfile = {
    tensions: (raw.tensions ?? []).map((t: Record<string, string>) => ({
      description: t.description ?? '',
      question: t.question ?? '',
      response: t.response ?? '',
      resolution: t.resolution ?? '',
    })),
    coreValues: (raw.coreValues ?? []).map((v: Record<string, unknown>) => ({
      value: (v.value as string) ?? '',
      rank: (v.rank as number) ?? 0,
      evidence: (v.evidence as string) ?? '',
    })),
    hiddenBlockers: (raw.hiddenBlockers ?? []).map((b: Record<string, string>) => ({
      belief: b.belief ?? '',
      source: b.source ?? '',
    })),
    narrative: raw.narrative ?? '',
    conversationLog,
  }

  const valuesHierarchy: import('../types').ValuesHierarchy = {
    values: (raw.valuesWithConflicts ?? raw.coreValues ?? []).map(
      (v: Record<string, unknown>, i: number) => ({
        value: (v.value as string) ?? '',
        aiRank: (v.aiRank as number) ?? (v.rank as number) ?? i + 1,
        userRank: (v.aiRank as number) ?? (v.rank as number) ?? i + 1,
        evidence: (v.evidence as string) ?? '',
        sliderConflict: (v.sliderConflict as string) ?? undefined,
      }),
    ),
  }

  return { profile, valuesHierarchy }
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run src/services/__tests__/gemini.insight.test.ts`
Expected: PASS

- [ ] **Step 9: Verify build passes**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 10: Commit**

```bash
git add src/services/gemini.ts src/services/__tests__/gemini.insight.test.ts
git commit -m "feat: add Gemini service functions for AI conversation and insight synthesis"
```

---

### Task 7: Implement DiscoverStep with AI conversation and values hierarchy

**Files:**
- Modify: `src/components/DiscoverStep.tsx` (replace placeholder)

- [ ] **Step 1: Write failing test for DiscoverStep conversation UI**

Create `src/components/__tests__/DiscoverStep.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DiscoverStep } from '../DiscoverStep'
import { createCompletedReflection, createInitialInsightProfile, createInitialValuesHierarchy } from '../../test/fixtures'

// Need to add these to fixtures — for now import from types
import { createInitialInsightProfile as createIP, createInitialValuesHierarchy as createVH } from '../../types'

describe('DiscoverStep', () => {
  const baseProps = {
    reflection: createCompletedReflection(),
    insightProfile: createIP(),
    valuesHierarchy: createVH(),
    isStale: false,
    onSetInsightProfile: vi.fn(),
    onSetValuesHierarchy: vi.fn(),
    onComplete: vi.fn(),
    onBack: vi.fn(),
    canComplete: false,
  }

  it('renders the step header', () => {
    render(<DiscoverStep {...baseProps} />)
    expect(screen.getByText(/dig deeper/i)).toBeTruthy()
  })

  it('shows start conversation button when no conversation exists', () => {
    render(<DiscoverStep {...baseProps} />)
    expect(screen.getByText(/Start conversation/i)).toBeTruthy()
  })

  it('shows narrative summary when insight profile is complete', () => {
    const props = {
      ...baseProps,
      insightProfile: {
        ...createIP(),
        narrative: 'You are someone who thrives on creativity.',
        conversationLog: [
          { role: 'assistant' as const, content: 'Q' },
          { role: 'user' as const, content: 'A' },
        ],
      },
      canComplete: true,
    }
    render(<DiscoverStep {...props} />)
    expect(screen.getByText(/You are someone who thrives on creativity/)).toBeTruthy()
  })

  it('shows values hierarchy when values exist', () => {
    const props = {
      ...baseProps,
      insightProfile: { ...createIP(), narrative: 'test' },
      valuesHierarchy: {
        values: [
          { value: 'Creative freedom', aiRank: 1, userRank: 1, evidence: 'test evidence' },
          { value: 'Stability', aiRank: 2, userRank: 2, evidence: 'test' },
        ],
      },
      canComplete: true,
    }
    render(<DiscoverStep {...props} />)
    expect(screen.getByText('Creative freedom')).toBeTruthy()
    expect(screen.getByText('Stability')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/__tests__/DiscoverStep.test.tsx`
Expected: FAIL — placeholder doesn't have "Start conversation" button or narrative display.

- [ ] **Step 3: Implement DiscoverStep**

Replace the contents of `src/components/DiscoverStep.tsx`:

```typescript
import { useState, useRef, useCallback } from 'react'
import type { ReflectionAnswers, InsightProfile, ValuesHierarchy, ConversationMessage } from '../types'
import {
  getApiKey,
  buildTensionPrompt,
  buildConversationFollowUpPrompt,
  streamConversationTurn,
  generateInsightSynthesis,
} from '../services/gemini'
import { SkeletonShimmer } from './SkeletonShimmer'
import { StaleStepBanner } from './StaleStepBanner'

interface DiscoverStepProps {
  reflection: ReflectionAnswers
  insightProfile: InsightProfile
  valuesHierarchy: ValuesHierarchy
  isStale: boolean
  onSetInsightProfile: (profile: InsightProfile) => void
  onSetValuesHierarchy: (hierarchy: ValuesHierarchy) => void
  onComplete: () => void
  onBack: () => void
  canComplete: boolean
}

type Phase = 'idle' | 'thinking' | 'chatting' | 'synthesizing' | 'review' | 'error'

const MAX_EXCHANGES = 4

export function DiscoverStep({
  reflection,
  insightProfile,
  valuesHierarchy,
  isStale,
  onSetInsightProfile,
  onSetValuesHierarchy,
  onComplete,
  onBack,
  canComplete,
}: DiscoverStepProps) {
  const [phase, setPhase] = useState<Phase>(insightProfile.narrative ? 'review' : 'idle')
  const [messages, setMessages] = useState<ConversationMessage[]>(insightProfile.conversationLog)
  const [streamingText, setStreamingText] = useState('')
  const [userInput, setUserInput] = useState('')
  const [exchangeCount, setExchangeCount] = useState(0)
  const [error, setError] = useState('')
  const [editingNarrative, setEditingNarrative] = useState(false)
  const [narrativeEdit, setNarrativeEdit] = useState('')
  const abortRef = useRef<AbortController | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const startConversation = useCallback(async () => {
    const apiKey = getApiKey()
    if (!apiKey) return

    setPhase('thinking')
    setError('')

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const prompt = buildTensionPrompt(reflection)

    try {
      const genAI = (await import('@google/generative-ai')).GoogleGenerativeAI
      const ai = new genAI(apiKey)
      const model = ai.getGenerativeModel({ model: 'gemini-flash-latest' })

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      })

      if (controller.signal.aborted) return

      const text = result.response.text()
      const cleaned = text.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '').trim()
      const parsed = JSON.parse(cleaned)

      const firstQuestion = parsed.firstQuestion as string
      const aiMessage: ConversationMessage = { role: 'assistant', content: firstQuestion }
      setMessages([aiMessage])
      setExchangeCount(1)
      setPhase('chatting')
      setTimeout(scrollToBottom, 100)
    } catch (err: unknown) {
      if (controller.signal.aborted) return
      setError(err instanceof Error ? err.message : 'Failed to start conversation')
      setPhase('error')
    }
  }, [reflection])

  const sendMessage = useCallback(async () => {
    const apiKey = getApiKey()
    if (!apiKey || !userInput.trim()) return

    const userMsg: ConversationMessage = { role: 'user', content: userInput.trim() }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setUserInput('')
    setStreamingText('')

    const nextExchange = exchangeCount + 1

    // If we've hit max exchanges, synthesize
    if (nextExchange > MAX_EXCHANGES) {
      setPhase('synthesizing')
      try {
        const { profile, valuesHierarchy: vh } = await generateInsightSynthesis(
          apiKey,
          reflection,
          updatedMessages,
        )
        onSetInsightProfile(profile)
        onSetValuesHierarchy(vh)
        setPhase('review')
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to synthesize insights')
        setPhase('error')
      }
      return
    }

    setPhase('thinking')

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const followUpPrompt = buildConversationFollowUpPrompt(
      updatedMessages,
      nextExchange,
      MAX_EXCHANGES,
    )

    streamConversationTurn(
      apiKey,
      followUpPrompt,
      {
        onText: (text) => {
          if (!controller.signal.aborted) {
            setStreamingText(text)
            scrollToBottom()
          }
        },
        onDone: (fullText) => {
          if (controller.signal.aborted) return
          const aiMsg: ConversationMessage = { role: 'assistant', content: fullText }
          setMessages((prev) => [...prev, aiMsg])
          setStreamingText('')
          setExchangeCount(nextExchange)
          setPhase('chatting')
          setTimeout(scrollToBottom, 100)
        },
        onError: (msg) => {
          setError(msg)
          setPhase('error')
        },
      },
      controller.signal,
    )
  }, [messages, userInput, exchangeCount, reflection, onSetInsightProfile, onSetValuesHierarchy])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleNarrativeEdit = () => {
    if (editingNarrative) {
      // Save edits
      onSetInsightProfile({ ...insightProfile, narrative: narrativeEdit })
      setEditingNarrative(false)
    } else {
      setNarrativeEdit(insightProfile.narrative)
      setEditingNarrative(true)
    }
  }

  const restart = () => {
    setMessages([])
    setExchangeCount(0)
    setPhase('idle')
    setError('')
    setStreamingText('')
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-6 space-y-2">
        <h2 className="text-2xl font-light tracking-tight text-slate-800">
          Let's dig deeper
        </h2>
        <p className="text-sm text-slate-400">
          {phase === 'review'
            ? 'Here\'s what I\'m hearing. Review and adjust before we continue.'
            : 'A short conversation to surface what really matters to you.'}
        </p>
      </div>

      {isStale && insightProfile.narrative && phase === 'review' && (
        <StaleStepBanner onRegenerate={restart} />
      )}

      {/* Idle state — start button */}
      {phase === 'idle' && (
        <div className="flex flex-1 items-center justify-center">
          <button
            onClick={startConversation}
            className="rounded-xl bg-indigo-600 px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            Start conversation
          </button>
        </div>
      )}

      {/* Error state */}
      {phase === 'error' && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={restart}
            className="mt-2 text-sm font-medium text-red-700 underline hover:text-red-800"
          >
            Start over
          </button>
        </div>
      )}

      {/* Conversation UI */}
      {(phase === 'chatting' || phase === 'thinking' || phase === 'synthesizing') && (
        <div className="flex flex-1 flex-col">
          {/* Messages */}
          <div className="mb-4 max-h-[400px] space-y-4 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {streamingText && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl bg-slate-100 px-4 py-3 text-sm leading-relaxed text-slate-700">
                  {streamingText}
                </div>
              </div>
            )}
            {phase === 'thinking' && !streamingText && (
              <div className="flex justify-start">
                <div className="flex gap-1 rounded-2xl bg-slate-100 px-4 py-3">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]" />
                </div>
              </div>
            )}
            {phase === 'synthesizing' && (
              <div className="flex justify-center">
                <div className="rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-600">
                  Synthesizing your insights...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input area */}
          {phase === 'chatting' && (
            <div className="flex gap-2">
              <textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Share your thoughts..."
                rows={2}
                className="flex-1 resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm transition-colors placeholder:text-slate-300 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
              <button
                onClick={sendMessage}
                disabled={!userInput.trim()}
                className={`shrink-0 self-end rounded-xl px-5 py-3 text-sm font-medium transition-colors ${
                  userInput.trim()
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'cursor-not-allowed bg-slate-100 text-slate-300'
                }`}
              >
                Send
              </button>
            </div>
          )}

          {/* Exchange counter */}
          <p className="mt-2 text-center text-xs text-slate-300">
            {exchangeCount} of {MAX_EXCHANGES} exchanges
          </p>
        </div>
      )}

      {/* Review phase — narrative + values */}
      {phase === 'review' && (
        <div className="space-y-6">
          {/* Narrative summary */}
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/30 p-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-indigo-700">Here's what I'm hearing</h3>
              <button
                onClick={handleNarrativeEdit}
                className="text-xs text-indigo-500 hover:text-indigo-700"
              >
                {editingNarrative ? 'Save' : 'Edit'}
              </button>
            </div>
            {editingNarrative ? (
              <textarea
                value={narrativeEdit}
                onChange={(e) => setNarrativeEdit(e.target.value)}
                rows={6}
                className="w-full resize-none rounded-lg border border-indigo-200 p-3 text-sm leading-relaxed text-slate-700 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            ) : (
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
                {insightProfile.narrative}
              </p>
            )}
          </div>

          {/* Values hierarchy */}
          {valuesHierarchy.values.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="mb-4 text-sm font-semibold text-slate-700">Your values, ranked</h3>
              <p className="mb-4 text-xs text-slate-400">
                Drag to reorder if this doesn't feel right — the gap between AI ranking and your instinct is useful data.
              </p>
              <div className="space-y-2">
                {valuesHierarchy.values
                  .sort((a, b) => a.userRank - b.userRank)
                  .map((v, i) => (
                    <div
                      key={v.value}
                      className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                    >
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-700">{v.value}</p>
                        <p className="mt-0.5 text-xs text-slate-400">{v.evidence}</p>
                        {v.sliderConflict && (
                          <p className="mt-1 text-xs text-amber-600">{v.sliderConflict}</p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Hidden blockers */}
          {insightProfile.hiddenBlockers.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/30 p-6">
              <h3 className="mb-3 text-sm font-semibold text-amber-700">Potential blockers to watch</h3>
              <div className="space-y-2">
                {insightProfile.hiddenBlockers.map((b, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="mt-1 text-xs text-amber-500">&#9679;</span>
                    <div>
                      <p className="text-sm text-slate-700">{b.belief}</p>
                      <p className="text-xs text-slate-400">{b.source}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={restart}
            className="self-center text-sm text-slate-400 transition-colors hover:text-indigo-600"
          >
            Start over
          </button>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-auto flex items-center justify-between pt-10">
        <button
          onClick={onBack}
          className="rounded-lg px-5 py-2.5 text-sm font-medium text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-700"
        >
          Back
        </button>
        <button
          onClick={onComplete}
          disabled={!canComplete}
          className={`rounded-lg px-6 py-2.5 text-sm font-medium transition-all duration-200 ${
            canComplete
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'cursor-not-allowed bg-slate-100 text-slate-300'
          }`}
        >
          Continue
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/__tests__/DiscoverStep.test.tsx`
Expected: PASS

- [ ] **Step 5: Verify build passes**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/components/DiscoverStep.tsx src/components/__tests__/DiscoverStep.test.tsx
git commit -m "feat: implement DiscoverStep with AI conversation and values hierarchy"
```

---

## Phase 3: Path Exploration, Scenario Modeling, Conviction Check

---

### Task 8: Add path exploration chat to PathGenerationStep

**Files:**
- Create: `src/components/PathExplorePanel.tsx`
- Modify: `src/components/PathCard.tsx`
- Modify: `src/components/PathGenerationStep.tsx`
- Modify: `src/services/gemini.ts`

- [ ] **Step 1: Add buildPathExplorationPrompt to gemini.ts**

In `src/services/gemini.ts`, add:

```typescript
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
```

- [ ] **Step 2: Create PathExplorePanel component**

Create `src/components/PathExplorePanel.tsx`:

```typescript
import { useState, useRef, useCallback } from 'react'
import type { CareerPath, InsightProfile, ConversationMessage } from '../types'
import { getApiKey, buildPathExplorationPrompt, streamConversationTurn } from '../services/gemini'

interface PathExplorePanelProps {
  path: CareerPath
  allPaths: CareerPath[]
  insightProfile: InsightProfile
  messages: ConversationMessage[]
  onAddMessage: (pathId: string, message: ConversationMessage) => void
  onClose: () => void
}

export function PathExplorePanel({
  path,
  allPaths,
  insightProfile,
  messages,
  onAddMessage,
  onClose,
}: PathExplorePanelProps) {
  const [input, setInput] = useState('')
  const [streamingText, setStreamingText] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const sendMessage = useCallback(async () => {
    const apiKey = getApiKey()
    if (!apiKey || !input.trim()) return

    const userMsg: ConversationMessage = { role: 'user', content: input.trim() }
    onAddMessage(path.id, userMsg)
    setInput('')
    setIsThinking(true)
    setStreamingText('')

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const allMessages = [...messages, userMsg]
    const prompt = buildPathExplorationPrompt(insightProfile, path, allPaths, allMessages)

    streamConversationTurn(
      apiKey,
      prompt,
      {
        onText: (text) => {
          if (!controller.signal.aborted) setStreamingText(text)
        },
        onDone: (fullText) => {
          if (controller.signal.aborted) return
          onAddMessage(path.id, { role: 'assistant', content: fullText })
          setStreamingText('')
          setIsThinking(false)
          setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
        },
        onError: () => {
          setIsThinking(false)
          setStreamingText('')
        },
      },
      controller.signal,
    )
  }, [input, path, allPaths, insightProfile, messages, onAddMessage])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div>
          <h3 className="text-sm font-medium text-slate-800">Explore: {path.title}</h3>
          <p className="text-xs text-slate-400">Ask anything about this path</p>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && !isThinking && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-slate-400">Ask anything about this path:</p>
              <div className="mt-3 space-y-1.5">
                {['What would my first year look like?', 'What\'s the worst part of this job?', 'How do my current skills transfer?'].map((q) => (
                  <button
                    key={q}
                    onClick={() => setInput(q)}
                    className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-xs text-slate-500 transition-colors hover:border-indigo-200 hover:text-indigo-600"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {streamingText && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl bg-slate-100 px-4 py-3 text-sm leading-relaxed text-slate-700">
              {streamingText}
            </div>
          </div>
        )}
        {isThinking && !streamingText && (
          <div className="flex justify-start">
            <div className="flex gap-1 rounded-2xl bg-slate-100 px-4 py-3">
              <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]" />
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 p-4">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this path..."
            rows={2}
            className="flex-1 resize-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition-colors placeholder:text-slate-300 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isThinking}
            className={`shrink-0 self-end rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
              input.trim() && !isThinking
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'cursor-not-allowed bg-slate-100 text-slate-300'
            }`}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Add "Explore" button to PathCard**

In `src/components/PathCard.tsx`, add a new prop and button. Update the interface:

```typescript
interface PathCardProps {
  path: CareerPath
  isSelected: boolean
  selectionCount: number
  onToggle: () => void
  explorationCount?: number
  onExplore?: () => void
}
```

Update the component signature:

```typescript
export function PathCard({ path, isSelected, selectionCount, onToggle, explorationCount, onExplore }: PathCardProps) {
```

Add the explore button after the "Day in the life" section, before the closing `</div>`:

```typescript
      {/* Explore */}
      {onExplore && (
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
          <button
            onClick={onExplore}
            className="text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-800"
          >
            Explore this path
          </button>
          {explorationCount != null && explorationCount > 0 && (
            <span className="text-xs text-slate-400">
              {explorationCount} question{explorationCount !== 1 ? 's' : ''} asked
            </span>
          )}
        </div>
      )}
```

- [ ] **Step 4: Wire PathExplorePanel into PathGenerationStep**

In `src/components/PathGenerationStep.tsx`, update the props interface to accept exploration data:

```typescript
interface PathGenerationStepProps {
  reflection: ReflectionAnswers
  paths: CareerPath[]
  selectedPathIds: string[]
  isStale: boolean
  onPathsUpdate: (paths: CareerPath[]) => void
  onTogglePath: (pathId: string) => void
  onComplete: () => void
  onBack: () => void
  canComplete: boolean
  // New props for exploration
  insightProfile?: import('../types').InsightProfile
  pathExplorations?: import('../types').PathExploration[]
  onAddExplorationMessage?: (pathId: string, message: import('../types').ConversationMessage) => void
}
```

Add state and import the panel:

```typescript
import { PathExplorePanel } from './PathExplorePanel'
```

Add state for the currently-exploring path:

```typescript
const [exploringPathId, setExploringPathId] = useState<string | null>(null)
```

In the path cards section, update the PathCard usage:

```typescript
{paths.map((path) => {
  const exploration = pathExplorations?.find((e) => e.pathId === path.id)
  return (
    <PathCard
      key={path.id}
      path={path}
      isSelected={selectedPathIds.includes(path.id)}
      selectionCount={selectedPathIds.length}
      onToggle={() => onTogglePath(path.id)}
      explorationCount={exploration?.messages.filter((m) => m.role === 'user').length}
      onExplore={onAddExplorationMessage ? () => setExploringPathId(path.id) : undefined}
    />
  )
})}
```

Add the panel at the end of the component JSX (before the final `</div>`):

```typescript
      {/* Explore panel */}
      {exploringPathId && onAddExplorationMessage && insightProfile && (
        <PathExplorePanel
          path={paths.find((p) => p.id === exploringPathId)!}
          allPaths={paths}
          insightProfile={insightProfile}
          messages={
            pathExplorations?.find((e) => e.pathId === exploringPathId)?.messages ?? []
          }
          onAddMessage={onAddExplorationMessage}
          onClose={() => setExploringPathId(null)}
        />
      )}
```

- [ ] **Step 5: Update App.tsx to pass exploration props**

In `App.tsx`, update the PathGenerationStep (case 3) to pass the new props:

```typescript
      case 3:
        return (
          <PathGenerationStep
            reflection={state.reflection}
            paths={state.paths}
            selectedPathIds={state.selectedPathIds}
            isStale={staleSteps.includes(3)}
            onPathsUpdate={setPaths}
            onTogglePath={togglePathSelection}
            onComplete={nextStep}
            onBack={prevStep}
            canComplete={canAdvance()}
            insightProfile={state.insightProfile}
            pathExplorations={state.pathExplorations}
            onAddExplorationMessage={addPathExplorationMessage}
          />
        )
```

- [ ] **Step 6: Verify build passes**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/components/PathExplorePanel.tsx src/components/PathCard.tsx src/components/PathGenerationStep.tsx src/services/gemini.ts src/App.tsx
git commit -m "feat: add path exploration chat panel"
```

---

### Task 9: Add scenario modeling to DecisionMatrixStep

**Files:**
- Modify: `src/components/DecisionMatrixStep.tsx`

- [ ] **Step 1: Write failing test for scenario presets**

Create `src/components/__tests__/ScenarioModeling.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DecisionMatrixStep } from '../DecisionMatrixStep'
import { createMockPaths, createMockScores } from '../../test/fixtures'
import { createInitialMatrix } from '../../types'

describe('DecisionMatrixStep scenario modeling', () => {
  const baseProps = {
    paths: createMockPaths(),
    selectedPathIds: ['path-1', 'path-3'],
    matrix: { ...createInitialMatrix(), scores: createMockScores() },
    isStale: false,
    onUpdateWeight: vi.fn(),
    onUpdateScore: vi.fn(),
    onSetScores: vi.fn(),
    onComplete: vi.fn(),
    onBack: vi.fn(),
    canComplete: true,
  }

  it('shows Explore scenarios toggle', () => {
    render(<DecisionMatrixStep {...baseProps} />)
    expect(screen.getByText(/Explore scenarios/i)).toBeTruthy()
  })

  it('shows preset scenario buttons when toggled on', () => {
    render(<DecisionMatrixStep {...baseProps} />)
    fireEvent.click(screen.getByText(/Explore scenarios/i))
    expect(screen.getByText(/money didn't matter/i)).toBeTruthy()
    expect(screen.getByText(/prioritize growth/i)).toBeTruthy()
    expect(screen.getByText(/switch fast/i)).toBeTruthy()
    expect(screen.getByText(/stability is everything/i)).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/__tests__/ScenarioModeling.test.tsx`
Expected: FAIL — no scenario toggle exists.

- [ ] **Step 3: Add scenario modeling UI to DecisionMatrixStep**

In `src/components/DecisionMatrixStep.tsx`, add state and preset scenarios after the existing state declarations:

```typescript
  const [scenarioMode, setScenarioMode] = useState(false)
  const [activeScenario, setActiveScenario] = useState<string | null>(null)
  const [baseWeights] = useState(() => ({ ...matrix.weights }))

  const PRESET_SCENARIOS = [
    { name: 'What if money didn\'t matter?', weights: { salary: 1 } },
    { name: 'What if I prioritize growth?', weights: { learning: 5 } },
    { name: 'What if I need to switch fast?', weights: { transition: 5 } },
    { name: 'What if stability is everything?', weights: { demand: 5, creative: 1 } },
  ]

  const applyScenario = (scenario: typeof PRESET_SCENARIOS[0]) => {
    setActiveScenario(scenario.name)
    for (const [id, weight] of Object.entries(scenario.weights)) {
      onUpdateWeight(id, weight)
    }
  }

  const resetScenario = () => {
    setActiveScenario(null)
    for (const [id, weight] of Object.entries(baseWeights)) {
      onUpdateWeight(id, weight)
    }
  }
```

Add the scenario toggle and presets in the JSX, after the matrix table and before the ranking chart:

```typescript
      {/* Scenario modeling */}
      <div className="mt-6">
        <button
          onClick={() => {
            setScenarioMode(!scenarioMode)
            if (scenarioMode && activeScenario) resetScenario()
          }}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            scenarioMode
              ? 'bg-indigo-100 text-indigo-700'
              : 'border border-slate-200 text-slate-500 hover:border-indigo-200 hover:text-indigo-600'
          }`}
        >
          Explore scenarios
        </button>

        {scenarioMode && (
          <div className="mt-3 space-y-3">
            <div className="flex flex-wrap gap-2">
              {PRESET_SCENARIOS.map((s) => (
                <button
                  key={s.name}
                  onClick={() => activeScenario === s.name ? resetScenario() : applyScenario(s)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeScenario === s.name
                      ? 'bg-indigo-600 text-white'
                      : 'border border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600'
                  }`}
                >
                  {s.name}
                </button>
              ))}
              {activeScenario && (
                <button
                  onClick={resetScenario}
                  className="rounded-full px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-600"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Sensitivity analysis */}
            {rankings.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-medium text-slate-500">Sensitivity analysis</p>
                <p className="mt-1 text-sm text-slate-600">
                  {(() => {
                    const wins: Record<string, number> = {}
                    const total = PRESET_SCENARIOS.length
                    for (const scenario of PRESET_SCENARIOS) {
                      const tempWeights = { ...matrix.weights, ...scenario.weights }
                      let topId = ''
                      let topTotal = -1
                      for (const pid of selectedPathIds) {
                        let t = 0
                        for (const c of MATRIX_CRITERIA) {
                          t += (tempWeights[c.id] ?? 3) * (matrix.scores[pid]?.[c.id]?.score ?? 0)
                        }
                        if (t > topTotal) { topTotal = t; topId = pid }
                      }
                      wins[topId] = (wins[topId] ?? 0) + 1
                    }
                    const currentTop = rankings[0]
                    const currentWins = wins[currentTop.pathId] ?? 0
                    if (currentWins === total) {
                      return `${currentTop.title} stays #1 in all ${total} scenarios — it's a robust choice.`
                    } else if (currentWins >= total / 2) {
                      return `${currentTop.title} stays #1 in ${currentWins}/${total} scenarios — a solid but not unshakeable pick.`
                    } else {
                      const topWinner = Object.entries(wins).sort(([,a], [,b]) => b - a)[0]
                      const winnerPath = paths.find((p) => p.id === topWinner[0])
                      return `${currentTop.title} only wins ${currentWins}/${total} scenarios. ${winnerPath?.title ?? 'Another path'} wins more often — consider what's really driving your preference.`
                    }
                  })()}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
```

Add the `MATRIX_CRITERIA` import to the existing import if not already present (it should be).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/__tests__/ScenarioModeling.test.tsx`
Expected: PASS

- [ ] **Step 5: Verify build passes**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/components/DecisionMatrixStep.tsx src/components/__tests__/ScenarioModeling.test.tsx
git commit -m "feat: add scenario modeling with presets and sensitivity analysis to decision matrix"
```

---

### Task 10: Implement CommitStep (conviction check)

**Files:**
- Modify: `src/components/CommitStep.tsx` (replace placeholder)

- [ ] **Step 1: Write failing test for CommitStep**

Create `src/components/__tests__/CommitStep.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CommitStep } from '../CommitStep'
import { createMockPaths, createMockScores } from '../../test/fixtures'
import { createInitialMatrix } from '../../types'

describe('CommitStep', () => {
  const baseProps = {
    paths: createMockPaths(),
    selectedPathIds: ['path-1', 'path-3'],
    matrix: { ...createInitialMatrix(), scores: createMockScores() },
    convictionCheck: null,
    onSetConvictionCheck: vi.fn(),
    onComplete: vi.fn(),
    onBack: vi.fn(),
    canComplete: false,
  }

  it('shows the top-ranked path name', () => {
    render(<CommitStep {...baseProps} />)
    // path-1 (Senior Frontend Engineer) should be top based on mock scores + default weights
    expect(screen.getByText(/Senior Frontend Engineer/i)).toBeTruthy()
  })

  it('shows three response options', () => {
    render(<CommitStep {...baseProps} />)
    expect(screen.getByText(/Yes, that's the one/i)).toBeTruthy()
    expect(screen.getByText(/not sure/i)).toBeTruthy()
    expect(screen.getByText(/I'd actually pick/i)).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/__tests__/CommitStep.test.tsx`
Expected: FAIL — placeholder doesn't show path name or options.

- [ ] **Step 3: Implement CommitStep**

Replace `src/components/CommitStep.tsx`:

```typescript
import { useState, useMemo } from 'react'
import type { CareerPath, MatrixState, ConvictionCheck } from '../types'
import { MATRIX_CRITERIA } from '../types'

interface CommitStepProps {
  paths: CareerPath[]
  selectedPathIds: string[]
  matrix: MatrixState
  convictionCheck: ConvictionCheck | null
  onSetConvictionCheck: (check: ConvictionCheck) => void
  onComplete: () => void
  onBack: () => void
  canComplete: boolean
}

export function CommitStep({
  paths,
  selectedPathIds,
  matrix,
  convictionCheck,
  onSetConvictionCheck,
  onComplete,
  onBack,
  canComplete,
}: CommitStepProps) {
  const [selectedOverride, setSelectedOverride] = useState<string | null>(null)

  const rankings = useMemo(() => {
    return selectedPathIds
      .map((pid) => {
        const p = paths.find((p) => p.id === pid)
        if (!p) return null
        let total = 0
        for (const c of MATRIX_CRITERIA) {
          total += (matrix.weights[c.id] ?? 3) * (matrix.scores[pid]?.[c.id]?.score ?? 0)
        }
        return { path: p, total }
      })
      .filter(Boolean)
      .sort((a, b) => b!.total - a!.total) as { path: CareerPath; total: number }[]
  }, [paths, selectedPathIds, matrix])

  const topPath = rankings[0]?.path
  const otherPaths = rankings.slice(1).map((r) => r.path)

  const handleYes = () => {
    if (!topPath) return
    onSetConvictionCheck({
      matrixTopPath: topPath.id,
      chosenPath: topPath.id,
      response: 'yes',
      conversation: [],
      reasoning: '',
    })
  }

  const handleUnsure = () => {
    if (!topPath) return
    onSetConvictionCheck({
      matrixTopPath: topPath.id,
      chosenPath: topPath.id,
      response: 'unsure',
      conversation: [],
      reasoning: 'User expressed uncertainty — explore further in action plan.',
    })
  }

  const handleOverride = () => {
    if (!topPath || !selectedOverride) return
    const chosenPath = paths.find((p) => p.id === selectedOverride)
    onSetConvictionCheck({
      matrixTopPath: topPath.id,
      chosenPath: selectedOverride,
      response: 'override',
      conversation: [],
      reasoning: `Chose ${chosenPath?.title ?? selectedOverride} over matrix top pick ${topPath.title}.`,
    })
  }

  if (!topPath) return null

  // Already committed
  if (convictionCheck) {
    const chosenPath = paths.find((p) => p.id === convictionCheck.chosenPath)
    return (
      <div className="flex flex-1 flex-col">
        <div className="mb-8 space-y-2">
          <h2 className="text-2xl font-light tracking-tight text-slate-800">
            You're going with {chosenPath?.title}
          </h2>
          {convictionCheck.response === 'override' && (
            <p className="text-sm text-slate-400">
              The numbers said {topPath.title}, but your gut says {chosenPath?.title} — that's valuable data.
            </p>
          )}
          {convictionCheck.response === 'unsure' && (
            <p className="text-sm text-slate-400">
              It's okay to be uncertain. Your action plan will include checkpoints to reassess.
            </p>
          )}
        </div>

        <div className="flex-1" />

        <button
          onClick={() => onSetConvictionCheck(null as unknown as ConvictionCheck)}
          className="mb-4 self-center text-sm text-slate-400 transition-colors hover:text-indigo-600"
        >
          Reconsider
        </button>

        <div className="mt-auto flex items-center justify-between pt-10">
          <button
            onClick={onBack}
            className="rounded-lg px-5 py-2.5 text-sm font-medium text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-700"
          >
            Back
          </button>
          <button
            onClick={onComplete}
            disabled={!canComplete}
            className={`rounded-lg px-6 py-2.5 text-sm font-medium transition-all duration-200 ${
              canComplete
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'cursor-not-allowed bg-slate-100 text-slate-300'
            }`}
          >
            Generate plan
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-8 space-y-2">
        <h2 className="text-2xl font-light tracking-tight text-slate-800">
          Does this feel right?
        </h2>
        <p className="text-sm text-slate-400">
          Your analysis says this is the best fit. Check in with yourself.
        </p>
      </div>

      {/* Top path card */}
      <div className="mb-8 rounded-2xl border border-indigo-200 bg-indigo-50/30 p-6 text-center">
        <p className="text-xs font-medium text-indigo-500 uppercase tracking-wide">Your top path</p>
        <h3 className="mt-2 text-xl font-medium text-slate-800">{topPath.title}</h3>
        <p className="mt-1 text-sm text-slate-500">{topPath.description}</p>
      </div>

      {/* Response options */}
      <div className="space-y-3">
        <button
          onClick={handleYes}
          className="w-full rounded-xl border border-slate-200 bg-white px-5 py-4 text-left transition-all hover:border-indigo-300 hover:bg-indigo-50/30"
        >
          <p className="text-sm font-medium text-slate-700">Yes, that's the one</p>
          <p className="mt-0.5 text-xs text-slate-400">Let's build a plan around it</p>
        </button>

        <button
          onClick={handleUnsure}
          className="w-full rounded-xl border border-slate-200 bg-white px-5 py-4 text-left transition-all hover:border-amber-300 hover:bg-amber-50/30"
        >
          <p className="text-sm font-medium text-slate-700">I think so, but I'm not sure</p>
          <p className="mt-0.5 text-xs text-slate-400">Something's holding me back — proceed with checkpoints</p>
        </button>

        <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
          <p className="text-sm font-medium text-slate-700">No, I'd actually pick a different path</p>
          <p className="mt-0.5 text-xs text-slate-400">The numbers don't match my gut</p>
          {otherPaths.length > 0 && (
            <div className="mt-3 space-y-2">
              {otherPaths.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedOverride(p.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    selectedOverride === p.id
                      ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                      : 'border-slate-100 text-slate-600 hover:border-slate-200'
                  }`}
                >
                  {p.title}
                </button>
              ))}
              {selectedOverride && (
                <button
                  onClick={handleOverride}
                  className="mt-2 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
                >
                  Go with {paths.find((p) => p.id === selectedOverride)?.title}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-auto flex items-center justify-between pt-10">
        <button
          onClick={onBack}
          className="rounded-lg px-5 py-2.5 text-sm font-medium text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-700"
        >
          Back
        </button>
        <span />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/__tests__/CommitStep.test.tsx`
Expected: PASS

- [ ] **Step 5: Verify build passes**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/components/CommitStep.tsx src/components/__tests__/CommitStep.test.tsx
git commit -m "feat: implement conviction check with yes/unsure/override options"
```

---

## Phase 4: Enhanced Action Plan, Personal Narrative, Updated Summary & PDF

---

### Task 11: Update action plan prompt and service to use insight profile

**Files:**
- Modify: `src/services/gemini.ts`
- Modify: `src/components/ActionPlanStep.tsx`

- [ ] **Step 1: Add buildEnhancedActionPlanPrompt to gemini.ts**

In `src/services/gemini.ts`, add a new function (keep the old one for backward compat, rename the builder):

```typescript
export function buildEnhancedActionPlanPrompt(
  path: CareerPath,
  insightProfile: import('../types').InsightProfile,
  convictionCheck: import('../types').ConvictionCheck | null,
): string {
  const blockersSection = insightProfile.hiddenBlockers.length > 0
    ? `\n**Hidden blockers identified:**\n${insightProfile.hiddenBlockers.map((b) => `- "${b.belief}" (from: ${b.source})`).join('\n')}`
    : ''

  const convictionSection = convictionCheck
    ? `\n**Conviction check:** The user ${
        convictionCheck.response === 'yes' ? 'confirmed this path with confidence.'
        : convictionCheck.response === 'unsure' ? 'expressed uncertainty — include extra reassessment checkpoints.'
        : `overrode the matrix to choose this path over ${convictionCheck.matrixTopPath}. ${convictionCheck.reasoning}`
      }`
    : ''

  return `Create a deeply personalized 30/60/90 day action plan for someone transitioning to: "${path.title}" — ${path.description}.

**About the person (from career coaching conversation):**
${insightProfile.narrative || 'No insight profile available.'}
${blockersSection}
${convictionSection}

**Path details:**
- Skills they have: ${path.skillsHave.join(', ')}
- Skills they need: ${path.skillsNeed.join(', ')}
- Timeline: ${path.timeline}
- Risk level: ${path.riskLevel}

Return ONLY a JSON object (no markdown, no code fences) with this exact shape:
{
  "phases": [
    {
      "title": "Research & Foundations",
      "timeframe": "Days 1-30",
      "items": ["specific action 1", "specific action 2", "specific action 3"]
    },
    {
      "title": "Build & Practice",
      "timeframe": "Days 31-60",
      "items": ["specific action 1", "specific action 2", "specific action 3"]
    },
    {
      "title": "Launch & Apply",
      "timeframe": "Days 61-90",
      "items": ["specific action 1", "specific action 2", "specific action 3"]
    }
  ],
  "resources": ["specific course/book/community"],
  "resumeTips": ["specific tip"],
  "interviewPrep": ["specific guidance"],
  "riskMitigation": ["what to do if X"],
  "biggestRisk": {
    "belief": "The identity barrier or hidden blocker most likely to derail them",
    "reframe": "How to think about it differently",
    "earlyActions": ["Concrete step to disprove this belief within week 1", "Another step"]
  },
  "identityMilestones": [
    { "timeframe": "By day 30", "milestone": "Be able to describe yourself as [role] in conversation" },
    { "timeframe": "By day 60", "milestone": "Identity milestone" }
  ],
  "checkpoints": [
    {
      "timeframe": "Day 30",
      "question": "Am I energized by this work, or just going through the motions?",
      "greenLight": "What 'yes' looks like",
      "offRamp": "If the answer is no, do this instead"
    },
    {
      "timeframe": "Day 60",
      "question": "Self-assessment question",
      "greenLight": "What 'yes' looks like",
      "offRamp": "Alternative path"
    }
  ]
}

Each phase should have 3-5 items. Reference the person's SPECIFIC blockers, values, and situation — not generic advice. If they have hidden blockers, address them head-on in biggestRisk and in the early phase items.`
}
```

- [ ] **Step 2: Add streamEnhancedActionPlan function**

```typescript
export async function streamEnhancedActionPlan(
  apiKey: string,
  path: CareerPath,
  insightProfile: import('../types').InsightProfile,
  convictionCheck: import('../types').ConvictionCheck | null,
  callbacks: ActionPlanStreamCallbacks,
  signal: AbortSignal,
): Promise<void> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' })

  let accumulated = ''

  try {
    const result = await model.generateContentStream({
      contents: [{ role: 'user', parts: [{ text: buildEnhancedActionPlanPrompt(path, insightProfile, convictionCheck) }] }],
    })

    for await (const chunk of result.stream) {
      if (signal.aborted) return
      accumulated += chunk.text()
      callbacks.onText(accumulated)
    }

    const cleaned = accumulated.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '').trim()
    const raw = JSON.parse(cleaned)

    callbacks.onPlan({
      targetPathId: path.id,
      targetPathTitle: path.title,
      phases: raw.phases ?? [],
      resources: raw.resources ?? [],
      resumeTips: raw.resumeTips ?? [],
      interviewPrep: raw.interviewPrep ?? [],
      riskMitigation: raw.riskMitigation ?? [],
      biggestRisk: raw.biggestRisk ?? undefined,
      identityMilestones: raw.identityMilestones ?? undefined,
      checkpoints: raw.checkpoints ?? undefined,
    })
    callbacks.onDone()
  } catch (err: unknown) {
    if (signal.aborted) return
    const message = err instanceof Error ? err.message : 'Failed to generate action plan'
    callbacks.onError(message)
  }
}
```

- [ ] **Step 3: Update ActionPlanStep to accept insight profile and use conviction check**

In `src/components/ActionPlanStep.tsx`, update the props:

```typescript
interface ActionPlanStepProps {
  paths: CareerPath[]
  selectedPathIds: string[]
  matrix: MatrixState
  actionPlan: ActionPlan | null
  isStale: boolean
  onSetPlan: (plan: ActionPlan | null) => void
  onComplete: () => void
  onBack: () => void
  canComplete: boolean
  insightProfile?: import('../types').InsightProfile
  convictionCheck?: import('../types').ConvictionCheck | null
}
```

Update the import and generate function to use the enhanced version when insight profile is available:

```typescript
import { getApiKey, streamActionPlan, streamEnhancedActionPlan } from '../services/gemini'
```

Update `topPath` to respect conviction check:

```typescript
  const topPath = useMemo(() => {
    // If conviction check chose a specific path, use that
    if (convictionCheck?.chosenPath) {
      return paths.find((p) => p.id === convictionCheck.chosenPath) ?? null
    }

    // Otherwise, use matrix ranking
    const ranked = selectedPathIds
      .map((pid) => {
        const p = paths.find((p) => p.id === pid)
        if (!p) return null
        let total = 0
        for (const c of MATRIX_CRITERIA) {
          const w = matrix.weights[c.id] ?? 3
          const s = matrix.scores[pid]?.[c.id]?.score ?? 0
          total += w * s
        }
        return { path: p, total }
      })
      .filter(Boolean)
      .sort((a, b) => b!.total - a!.total)

    return ranked[0]?.path ?? null
  }, [paths, selectedPathIds, matrix, convictionCheck])
```

Update the `generate` function to use enhanced version:

```typescript
  const generate = useCallback(() => {
    const apiKey = getApiKey()
    if (!apiKey || !topPath) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setStatus('streaming')
    setError('')
    setStreamText('')
    onSetPlan(null)

    const streamFn = insightProfile?.narrative
      ? () => streamEnhancedActionPlan(apiKey, topPath, insightProfile, convictionCheck ?? null, callbacks, controller.signal)
      : () => streamActionPlan(apiKey, topPath, callbacks, controller.signal)

    const callbacks = {
      onText: (text: string) => {
        if (!controller.signal.aborted) setStreamText(text)
      },
      onPlan: (plan: ActionPlan) => {
        if (!controller.signal.aborted) onSetPlan(plan)
      },
      onError: (msg: string) => {
        setError(msg)
        setStatus('error')
      },
      onDone: () => {
        if (!controller.signal.aborted) setStatus('done')
      },
    }

    streamFn()
  }, [topPath, onSetPlan, insightProfile, convictionCheck])
```

- [ ] **Step 4: Update App.tsx to pass new props to ActionPlanStep**

In `App.tsx`, update the case 6 (ActionPlanStep):

```typescript
      case 6:
        return (
          <ActionPlanStep
            paths={state.paths}
            selectedPathIds={state.selectedPathIds}
            matrix={state.matrix}
            actionPlan={state.actionPlan}
            isStale={staleSteps.includes(6)}
            onSetPlan={setActionPlan}
            onComplete={nextStep}
            onBack={prevStep}
            canComplete={canAdvance()}
            insightProfile={state.insightProfile}
            convictionCheck={state.convictionCheck}
          />
        )
```

- [ ] **Step 5: Update ActionPlanDisplay for new sections**

In `src/components/ActionPlanDisplay.tsx`, add display for `biggestRisk`, `identityMilestones`, and `checkpoints`:

After the supporting sections `</div>`, add:

```typescript
      {/* Biggest Risk */}
      {plan.biggestRisk && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h4 className="mb-2 text-sm font-medium text-amber-800">Your biggest risk isn't what you think</h4>
          <p className="text-sm text-amber-700">{plan.biggestRisk.belief}</p>
          <p className="mt-2 text-sm text-slate-600"><strong>Reframe:</strong> {plan.biggestRisk.reframe}</p>
          {plan.biggestRisk.earlyActions.length > 0 && (
            <ul className="mt-2 space-y-1">
              {plan.biggestRisk.earlyActions.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                  {a}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Identity Milestones */}
      {plan.identityMilestones && plan.identityMilestones.length > 0 && (
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-5">
          <h4 className="mb-3 text-sm font-medium text-violet-800">Identity milestones</h4>
          <div className="space-y-2">
            {plan.identityMilestones.map((m, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">
                  {m.timeframe}
                </span>
                <p className="text-sm text-slate-700">{m.milestone}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Decision Checkpoints */}
      {plan.checkpoints && plan.checkpoints.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h4 className="mb-3 text-sm font-medium text-slate-700">Decision checkpoints</h4>
          <div className="space-y-4">
            {plan.checkpoints.map((cp, i) => (
              <div key={i} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">
                    {cp.timeframe}
                  </span>
                  <p className="text-sm font-medium text-slate-700">{cp.question}</p>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-emerald-50 p-2.5">
                    <p className="text-xs font-medium text-emerald-700">Green light</p>
                    <p className="mt-0.5 text-xs text-emerald-600">{cp.greenLight}</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-2.5">
                    <p className="text-xs font-medium text-amber-700">Off-ramp</p>
                    <p className="mt-0.5 text-xs text-amber-600">{cp.offRamp}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
```

- [ ] **Step 6: Verify build passes**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/services/gemini.ts src/components/ActionPlanStep.tsx src/components/ActionPlanDisplay.tsx src/App.tsx
git commit -m "feat: enhanced action plan with identity milestones, biggest risk, and checkpoints"
```

---

### Task 12: Add personal narrative generation and update SummaryStep

**Files:**
- Modify: `src/services/gemini.ts`
- Modify: `src/components/SummaryStep.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Add generatePersonalNarrative to gemini.ts**

```typescript
export async function generatePersonalNarrative(
  apiKey: string,
  insightProfile: import('../types').InsightProfile,
  convictionCheck: import('../types').ConvictionCheck | null,
  chosenPath: CareerPath,
  matrixTopPath: CareerPath | null,
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' })

  const convictionContext = convictionCheck
    ? convictionCheck.response === 'override'
      ? `They chose ${chosenPath.title} even though ${matrixTopPath?.title ?? 'another path'} scored higher. ${convictionCheck.reasoning}`
      : convictionCheck.response === 'unsure'
        ? `They went with ${chosenPath.title} but expressed uncertainty.`
        : `They confirmed ${chosenPath.title} with confidence.`
    : ''

  const prompt = `Write a 2-3 paragraph personal narrative for someone who just completed a career clarity exercise. Write in second person ("You're someone who...").

**Their insight profile:**
${insightProfile.narrative}

**Tensions resolved:**
${insightProfile.tensions.map((t) => `- ${t.description}: ${t.resolution}`).join('\n') || 'None identified.'}

**Hidden blockers:**
${insightProfile.hiddenBlockers.map((b) => `- "${b.belief}"`).join('\n') || 'None identified.'}

**Their choice:**
They chose: ${chosenPath.title} — ${chosenPath.description}
${convictionContext}

Write a narrative that:
1. Connects their core values and tensions to why this path makes sense
2. Acknowledges the gap between numbers and gut if they overrode the matrix
3. Names their biggest blocker and frames the action plan as a response to it
4. Feels personal, specific, and insightful — not generic encouragement

Return ONLY the narrative text — no JSON, no formatting, no headers. Just 2-3 paragraphs.`

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  })

  return result.response.text().trim()
}
```

- [ ] **Step 2: Update SummaryStep to show narrative and trigger generation**

In `src/components/SummaryStep.tsx`, update the props and add narrative display:

```typescript
interface SummaryStepProps {
  state: WizardState
  onBack: () => void
  onSetPersonalNarrative?: (narrative: string) => void
}
```

Add narrative generation state and effect:

```typescript
import { useState, useMemo, useEffect } from 'react'
```

Inside the component, add:

```typescript
  const [narrativeLoading, setNarrativeLoading] = useState(false)

  // Auto-generate narrative on mount if not already present
  useEffect(() => {
    if (state.personalNarrative || narrativeLoading || !onSetPersonalNarrative) return
    if (!state.insightProfile?.narrative || !state.actionPlan) return

    const chosenPathId = state.convictionCheck?.chosenPath ?? state.actionPlan.targetPathId
    const chosenPath = state.paths.find((p) => p.id === chosenPathId)
    if (!chosenPath) return

    const matrixTopPathId = state.convictionCheck?.matrixTopPath
    const matrixTopPath = matrixTopPathId ? state.paths.find((p) => p.id === matrixTopPathId) ?? null : null

    setNarrativeLoading(true)

    import('../services/gemini').then(({ getApiKey, generatePersonalNarrative }) => {
      const apiKey = getApiKey()
      if (!apiKey) { setNarrativeLoading(false); return }

      generatePersonalNarrative(apiKey, state.insightProfile, state.convictionCheck, chosenPath, matrixTopPath)
        .then((narrative) => {
          onSetPersonalNarrative(narrative)
          setNarrativeLoading(false)
        })
        .catch(() => setNarrativeLoading(false))
    })
  }, [state.personalNarrative, state.insightProfile, state.actionPlan, state.convictionCheck, state.paths, narrativeLoading, onSetPersonalNarrative])
```

Add the narrative section at the top of the JSX (after the header, before Reflection Highlights):

```typescript
      {/* Personal Narrative */}
      {(state.personalNarrative || narrativeLoading) && (
        <Section title="Your Story">
          {narrativeLoading ? (
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/30 p-6">
              <SkeletonShimmer lines={4} />
            </div>
          ) : (
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/30 p-6">
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
                {state.personalNarrative}
              </p>
            </div>
          )}
        </Section>
      )}
```

Add the import for SkeletonShimmer:

```typescript
import { SkeletonShimmer } from './SkeletonShimmer'
```

- [ ] **Step 3: Update App.tsx to pass narrative setter to SummaryStep**

In `App.tsx`, update the SummaryStep case:

```typescript
      case 7:
        return (
          <SummaryStep
            state={state}
            onBack={prevStep}
            onSetPersonalNarrative={setPersonalNarrative}
          />
        )
```

- [ ] **Step 4: Verify build passes**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 5: Run all tests**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/services/gemini.ts src/components/SummaryStep.tsx src/App.tsx
git commit -m "feat: add personal narrative generation to summary step"
```

---

### Task 13: Comprehensive PDF export — full career coaching document

The PDF should read like a complete career coaching session transcript + action plan. Someone should be able to hand this to a mentor or career coach and they'd have full context.

**Files:**
- Modify: `src/services/pdf.ts`

- [ ] **Step 1: Rewrite exportPdf with all new sections**

Replace the entire `exportPdf` function in `src/services/pdf.ts` with a comprehensive version. The PDF structure is:

1. Title + date
2. Personal narrative ("Your Story")
3. Reflection highlights (original 8 answers + 4 deep questions)
4. Coaching conversation (tensions, resolutions, values hierarchy, hidden blockers)
5. Career paths explored (with path exploration Q&A highlights)
6. Decision matrix rankings + sensitivity analysis
7. Conviction check context
8. Full action plan (phases + biggest risk + identity milestones + checkpoints + supporting sections)

```typescript
export function exportPdf(state: WizardState): void {
  const doc = new jsPDF()
  let y = MARGIN

  const addPage = () => {
    doc.addPage()
    y = MARGIN
  }
  const checkPage = (need: number) => {
    if (y + need > 280) addPage()
  }

  // --- Title ---
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(30, 41, 59) // slate-800
  doc.text('Clarify — Career Clarity Report', MARGIN, y)
  y += 12

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139) // slate-500
  doc.text(`Generated ${new Date().toLocaleDateString()}`, MARGIN, y)
  y += SECTION_GAP + 4

  // ─── 1. Personal Narrative ───
  if (state.personalNarrative) {
    sectionHeading(doc, 'Your Story', y)
    y += 8
    y = wrappedText(doc, y, state.personalNarrative, 10)
    y += SECTION_GAP
  }

  // ─── 2. Reflection Highlights ───
  sectionHeading(doc, 'Reflection', y)
  y += 8

  const r = state.reflection
  y = bulletList(doc, y, [
    `Energizers: ${r.energizers.join(', ')}`,
    `Drainers: ${r.drainers.join(', ')}`,
    `Coding in 5 years: ${r.codingIn5Years}`,
    `Energy level: ${r.energyLevel}/5`,
    `Learning interests: ${r.learningInterests.join(', ')}`,
  ])

  if (r.keepInJob) {
    checkPage(LINE_H * 2)
    y = wrappedText(doc, y, `Would keep: ${r.keepInJob}`)
  }
  if (r.successVision) {
    checkPage(LINE_H * 2)
    y = wrappedText(doc, y, `Success in 2 years: ${r.successVision}`)
  }

  // Top priorities
  const topPriorities = Object.entries(r.priorities)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)
    .map(([key, val]) => `${PRIORITY_LABELS[key] ?? key} (${val}/5)`)
  y += 2
  y = wrappedText(doc, y, `Top priorities: ${topPriorities.join(', ')}`)

  // Deep reflection answers
  const deepAnswers: [string, string][] = [
    ['Career decision regret/near-miss', r.regretDecision],
    ['Good at but don\'t want to do', r.goodAtButDontWant],
    ['If money were equal', r.ifMoneyEqual],
    ['Belief needed to change', r.beliefToChange],
  ]
  for (const [label, value] of deepAnswers) {
    if (value) {
      checkPage(LINE_H * 3)
      y += 2
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(71, 85, 105)
      doc.text(label, MARGIN, y)
      y += LINE_H
      doc.setFont('helvetica', 'normal')
      y = wrappedText(doc, y, value, 9)
    }
  }
  y += SECTION_GAP

  // ─── 3. Coaching Conversation ───
  if (state.insightProfile && state.insightProfile.narrative) {
    checkPage(30)
    sectionHeading(doc, 'Coaching Insights', y)
    y += 8

    // AI synthesis
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.setTextColor(71, 85, 105)
    y = wrappedText(doc, y, state.insightProfile.narrative, 9)
    y += 4

    // Tensions & resolutions
    if (state.insightProfile.tensions.length > 0) {
      checkPage(16)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(30, 41, 59)
      doc.text('Tensions Explored', MARGIN, y)
      y += LINE_H + 1

      for (const tension of state.insightProfile.tensions) {
        checkPage(LINE_H * 6)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.setTextColor(79, 70, 229) // indigo-600
        y = wrappedText(doc, y, `Tension: ${tension.description}`, 9)

        doc.setFont('helvetica', 'normal')
        doc.setTextColor(71, 85, 105)
        if (tension.question) {
          y = wrappedText(doc, y, `Q: ${tension.question}`, 8)
        }
        if (tension.response) {
          y = wrappedText(doc, y, `A: ${tension.response}`, 8)
        }
        if (tension.resolution) {
          doc.setFont('helvetica', 'bold')
          y = wrappedText(doc, y, `Resolution: ${tension.resolution}`, 8)
          doc.setFont('helvetica', 'normal')
        }
        y += 3
      }
    }

    // Values hierarchy
    if (state.valuesHierarchy && state.valuesHierarchy.values.length > 0) {
      checkPage(20)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(30, 41, 59)
      doc.text('Values Hierarchy', MARGIN, y)
      y += LINE_H + 1

      const sortedValues = [...state.valuesHierarchy.values].sort((a, b) => a.userRank - b.userRank)
      for (const v of sortedValues) {
        checkPage(LINE_H * 3)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.setTextColor(30, 41, 59)
        doc.text(`${v.userRank}. ${v.value}`, MARGIN, y)
        y += LINE_H

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(100, 116, 139)
        y = wrappedText(doc, y, `Evidence: ${v.evidence}`, 8)

        if (v.sliderConflict) {
          doc.setTextColor(180, 83, 9) // amber-700
          y = wrappedText(doc, y, `Note: ${v.sliderConflict}`, 8)
          doc.setTextColor(100, 116, 139)
        }
        y += 1
      }
    }

    // Hidden blockers
    if (state.insightProfile.hiddenBlockers.length > 0) {
      checkPage(16)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(180, 83, 9) // amber-700
      doc.text('Hidden Blockers', MARGIN, y)
      y += LINE_H + 1

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(71, 85, 105)
      y = bulletList(
        doc, y,
        state.insightProfile.hiddenBlockers.map((b) => `"${b.belief}" — surfaced from: ${b.source}`),
        9,
      )
    }

    // Conversation log
    if (state.insightProfile.conversationLog.length > 0) {
      checkPage(20)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(30, 41, 59)
      doc.text('Conversation Transcript', MARGIN, y)
      y += LINE_H + 1

      for (const msg of state.insightProfile.conversationLog) {
        checkPage(LINE_H * 3)
        const prefix = msg.role === 'assistant' ? 'Coach' : 'You'
        doc.setFont('helvetica', msg.role === 'assistant' ? 'bold' : 'normal')
        doc.setFontSize(8)
        doc.setTextColor(msg.role === 'assistant' ? 79 : 30, msg.role === 'assistant' ? 70 : 41, msg.role === 'assistant' ? 229 : 59)
        y = wrappedText(doc, y, `${prefix}: ${msg.content}`, 8)
        y += 2
      }
    }

    y += SECTION_GAP
  }

  // ─── 4. Career Paths ───
  checkPage(20)
  sectionHeading(doc, 'Career Paths Explored', y)
  y += 8

  for (const path of state.paths) {
    checkPage(30)
    const isSelected = state.selectedPathIds.includes(path.id)
    doc.setFont('helvetica', isSelected ? 'bold' : 'normal')
    doc.setFontSize(10)
    doc.setTextColor(30, 41, 59)
    const marker = isSelected ? '★ ' : '  '
    doc.text(`${marker}${path.title}`, MARGIN, y)
    y += LINE_H

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(100, 116, 139)
    y = wrappedText(doc, y, path.description, 8)

    if (isSelected) {
      y = wrappedText(doc, y, `Why it fits: ${path.whyItFits}`, 8)
      y = wrappedText(doc, y, `Salary: ${path.salaryRange.entry} → ${path.salaryRange.experienced} | Timeline: ${path.timeline} | Risk: ${path.riskLevel}`, 8)
      y = wrappedText(doc, y, `Skills you have: ${path.skillsHave.join(', ')}`, 8)
      y = wrappedText(doc, y, `Skills to build: ${path.skillsNeed.join(', ')}`, 8)
    }

    // Path exploration Q&A
    const exploration = state.pathExplorations.find((e) => e.pathId === path.id)
    if (exploration && exploration.messages.length > 0) {
      checkPage(16)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(79, 70, 229)
      doc.text(`  Exploration (${exploration.messages.filter((m) => m.role === 'user').length} questions)`, MARGIN, y)
      y += LINE_H

      for (const msg of exploration.messages) {
        checkPage(LINE_H * 2)
        const prefix = msg.role === 'user' ? 'Q' : 'A'
        doc.setFont('helvetica', msg.role === 'user' ? 'bold' : 'normal')
        doc.setFontSize(8)
        doc.setTextColor(71, 85, 105)
        y = wrappedText(doc, y, `  ${prefix}: ${msg.content}`, 8)
        y += 1
      }
    }

    y += 3
  }
  y += SECTION_GAP - 3

  // ─── 5. Decision Matrix Rankings ───
  checkPage(30)
  sectionHeading(doc, 'Decision Matrix Rankings', y)
  y += 8

  const rankings = state.selectedPathIds
    .map((pid) => {
      const p = state.paths.find((p) => p.id === pid)
      let total = 0
      for (const c of MATRIX_CRITERIA) {
        total += (state.matrix.weights[c.id] ?? 3) * (state.matrix.scores[pid]?.[c.id]?.score ?? 0)
      }
      return { title: p?.title ?? pid, total }
    })
    .sort((a, b) => b.total - a.total)

  for (const r of rankings) {
    checkPage(LINE_H)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(30, 41, 59)
    doc.text(`${r.title}`, MARGIN, y)
    doc.text(`${r.total.toFixed(1)}`, MARGIN + PAGE_W, y, { align: 'right' })
    y += LINE_H + 1
  }

  // Weights used
  y += 2
  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139)
  const weightsList = MATRIX_CRITERIA.map((c) => `${c.label}: ${state.matrix.weights[c.id] ?? 3}/5`).join(', ')
  y = wrappedText(doc, y, `Weights: ${weightsList}`, 8)

  // Sensitivity analysis
  const PRESET_SCENARIOS = [
    { name: 'Money doesn\'t matter', weights: { salary: 1 } },
    { name: 'Prioritize growth', weights: { learning: 5 } },
    { name: 'Need to switch fast', weights: { transition: 5 } },
    { name: 'Stability is everything', weights: { demand: 5, creative: 1 } },
  ]

  const scenarioResults: string[] = []
  for (const scenario of PRESET_SCENARIOS) {
    const tempWeights = { ...state.matrix.weights, ...scenario.weights }
    let topTitle = ''
    let topTotal = -1
    for (const pid of state.selectedPathIds) {
      let t = 0
      for (const c of MATRIX_CRITERIA) {
        t += (tempWeights[c.id] ?? 3) * (state.matrix.scores[pid]?.[c.id]?.score ?? 0)
      }
      if (t > topTotal) {
        topTotal = t
        const p = state.paths.find((p) => p.id === pid)
        topTitle = p?.title ?? pid
      }
    }
    scenarioResults.push(`${scenario.name}: ${topTitle} wins`)
  }

  checkPage(LINE_H * (scenarioResults.length + 2))
  y += 4
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(71, 85, 105)
  doc.text('Scenario Analysis', MARGIN, y)
  y += LINE_H
  y = bulletList(doc, y, scenarioResults, 8)

  y += SECTION_GAP

  // ─── 6. Conviction Check ───
  if (state.convictionCheck) {
    checkPage(20)
    sectionHeading(doc, 'Your Decision', y)
    y += 8

    const chosenPath = state.paths.find((p) => p.id === state.convictionCheck!.chosenPath)
    const matrixTopPath = state.paths.find((p) => p.id === state.convictionCheck!.matrixTopPath)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(30, 41, 59)
    doc.text(`Chosen path: ${chosenPath?.title ?? state.convictionCheck.chosenPath}`, MARGIN, y)
    y += LINE_H + 1

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(71, 85, 105)

    if (state.convictionCheck.response === 'yes') {
      y = wrappedText(doc, y, 'Confirmed with confidence — the matrix ranking matched your gut feeling.', 9)
    } else if (state.convictionCheck.response === 'unsure') {
      y = wrappedText(doc, y, 'Expressed some uncertainty. The action plan includes extra checkpoints for reassessment.', 9)
    } else if (state.convictionCheck.response === 'override') {
      y = wrappedText(doc, y, `The matrix ranked ${matrixTopPath?.title ?? 'another path'} highest, but you chose ${chosenPath?.title ?? 'a different path'}. The gap between the numbers and your gut reveals hidden priorities that the scores didn't capture.`, 9)
    }

    if (state.convictionCheck.reasoning) {
      y += 2
      y = wrappedText(doc, y, state.convictionCheck.reasoning, 9)
    }

    // Conviction check conversation if any
    if (state.convictionCheck.conversation.length > 0) {
      y += 2
      for (const msg of state.convictionCheck.conversation) {
        checkPage(LINE_H * 2)
        const prefix = msg.role === 'user' ? 'You' : 'Coach'
        doc.setFont('helvetica', msg.role === 'assistant' ? 'bold' : 'normal')
        doc.setFontSize(8)
        y = wrappedText(doc, y, `${prefix}: ${msg.content}`, 8)
        y += 1
      }
    }

    y += SECTION_GAP
  }

  // ─── 7. Action Plan ───
  if (state.actionPlan) {
    checkPage(20)
    sectionHeading(doc, `Action Plan: ${state.actionPlan.targetPathTitle}`, y)
    y += 8

    // Biggest Risk (lead with this)
    if (state.actionPlan.biggestRisk) {
      checkPage(24)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(180, 83, 9) // amber-700
      doc.text('Your Biggest Risk Isn\'t What You Think', MARGIN, y)
      y += LINE_H + 1
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(71, 85, 105)
      y = wrappedText(doc, y, state.actionPlan.biggestRisk.belief, 9)
      y += 2
      doc.setFont('helvetica', 'bold')
      y = wrappedText(doc, y, `Reframe: ${state.actionPlan.biggestRisk.reframe}`, 9)
      doc.setFont('helvetica', 'normal')
      y += 1
      y = bulletList(doc, y, state.actionPlan.biggestRisk.earlyActions, 8)
      y += 4
    }

    // Phases
    for (const phase of state.actionPlan.phases) {
      checkPage(20)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(30, 41, 59)
      doc.text(`${phase.title} (${phase.timeframe})`, MARGIN, y)
      y += LINE_H + 1

      y = bulletList(doc, y, phase.items)
      y += 4
    }

    // Identity Milestones
    if (state.actionPlan.identityMilestones && state.actionPlan.identityMilestones.length > 0) {
      checkPage(20)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(109, 40, 217) // violet-700
      doc.text('Identity Milestones', MARGIN, y)
      y += LINE_H + 1
      y = bulletList(
        doc, y,
        state.actionPlan.identityMilestones.map((m) => `${m.timeframe}: ${m.milestone}`),
        9,
      )
      y += 4
    }

    // Decision Checkpoints
    if (state.actionPlan.checkpoints && state.actionPlan.checkpoints.length > 0) {
      checkPage(20)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(30, 41, 59)
      doc.text('Decision Checkpoints', MARGIN, y)
      y += LINE_H + 1

      for (const cp of state.actionPlan.checkpoints) {
        checkPage(LINE_H * 5)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.setTextColor(30, 41, 59)
        y = wrappedText(doc, y, `${cp.timeframe}: ${cp.question}`, 9)

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(22, 163, 74) // green-600
        y = wrappedText(doc, y, `  ✓ Green light: ${cp.greenLight}`, 8)
        doc.setTextColor(180, 83, 9) // amber-700
        y = wrappedText(doc, y, `  → Off-ramp: ${cp.offRamp}`, 8)
        y += 3
      }
      y += 2
    }

    // Supporting sections
    const sections: [string, string[]][] = [
      ['Resources', state.actionPlan.resources],
      ['Resume & Portfolio Tips', state.actionPlan.resumeTips],
      ['Interview Prep', state.actionPlan.interviewPrep],
      ['Risk Mitigation', state.actionPlan.riskMitigation],
    ]

    for (const [title, items] of sections) {
      if (items.length === 0) continue
      checkPage(16)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(71, 85, 105) // slate-600
      doc.text(title, MARGIN, y)
      y += LINE_H
      y = bulletList(doc, y, items, 8)
      y += 3
    }
  }

  doc.save('clarify-career-plan.pdf')
}
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Run existing PDF tests**

Run: `npx vitest run src/services/__tests__/pdf.test.ts`
Expected: PASS (tests check for non-zero blob size, which will still work with more content).

- [ ] **Step 4: Commit**

```bash
git add src/services/pdf.ts
git commit -m "feat: comprehensive PDF export with coaching transcript, tensions, values, scenarios, and conviction check"
```

---

### Task 14: Update Gemini path generation prompt to use insight profile

**Files:**
- Modify: `src/services/gemini.ts`
- Modify: `src/components/PathGenerationStep.tsx`

- [ ] **Step 1: Add buildEnhancedReflectionPrompt**

In `src/services/gemini.ts`, add:

```typescript
function buildEnhancedReflectionPrompt(answers: ReflectionAnswers, insightProfile?: import('../types').InsightProfile): string {
  if (!insightProfile?.narrative) {
    return buildReflectionPrompt(answers)
  }

  const priorityLines = Object.entries(answers.priorities)
    .map(([key, val]) => `  ${PRIORITY_LABELS[key] ?? key}: ${val}/5`)
    .join('\n')

  return `Here is a software developer's self-reflection profile, enriched by a coaching conversation:

**Coaching summary:**
${insightProfile.narrative}

**Core values (ranked by conversation, not just sliders):**
${insightProfile.coreValues.map((v) => `${v.rank}. ${v.value} — ${v.evidence}`).join('\n')}

**Hidden blockers:**
${insightProfile.hiddenBlockers.map((b) => `- "${b.belief}" (${b.source})`).join('\n') || 'None identified.'}

**Raw reflection data:**
Energizers: ${answers.energizers.join(', ')}
Drainers: ${answers.drainers.join(', ')}
Would keep: ${answers.keepInJob || '(not specified)'}
Priorities:
${priorityLines}
Coding in 5 years: ${answers.codingIn5Years}
Energy: ${answers.energyLevel}/5
Learning interests: ${answers.learningInterests.join(', ')}
Success vision: ${answers.successVision || '(not specified)'}
Regret: ${answers.regretDecision || '(not specified)'}
Good at but don't want: ${answers.goodAtButDontWant || '(not specified)'}
If money equal: ${answers.ifMoneyEqual || '(not specified)'}
Belief to change: ${answers.beliefToChange || '(not specified)'}

Based on this enriched profile, generate 4-6 personalized career paths. The paths should directly address the person's specific tensions, values, and blockers — not generic career options. Include a mix from these categories:
- Level up in current track
- Specialize
- Adjacent pivot
- Bigger pivot (only if profile suggests low interest in staying in tech)

Return ONLY a JSON array (no markdown, no code fences) where each element has this exact shape:
{
  "id": "path-1",
  "title": "string",
  "description": "one-line description",
  "whyItFits": "why this fits based on their SPECIFIC answers and tensions — reference their actual words",
  "salaryRange": { "entry": "$X", "experienced": "$Y" },
  "skillsHave": ["skill1", "skill2"],
  "skillsNeed": ["skill1", "skill2"],
  "timeline": "realistic transition timeline",
  "riskLevel": "low" | "medium" | "high",
  "dayInTheLife": "3-4 sentence day-in-the-life summary"
}

Use sequential ids. Be specific and realistic — reference the person's actual values and tensions in whyItFits.`
}
```

- [ ] **Step 2: Update streamCareerPaths to accept optional insightProfile**

Update the function signature:

```typescript
export async function streamCareerPaths(
  apiKey: string,
  reflection: ReflectionAnswers,
  callbacks: StreamCallbacks,
  signal: AbortSignal,
  insightProfile?: import('../types').InsightProfile,
): Promise<void> {
```

Update the prompt construction:

```typescript
    const result = await model.generateContentStream({
      contents: [{ role: 'user', parts: [{ text: buildEnhancedReflectionPrompt(reflection, insightProfile) }] }],
    })
```

- [ ] **Step 3: Update PathGenerationStep to pass insightProfile to streamCareerPaths**

In `src/components/PathGenerationStep.tsx`, update the generate callback to pass the insight profile:

```typescript
    streamCareerPaths(
      apiKey,
      reflection,
      {
        // ... callbacks unchanged
      },
      controller.signal,
      insightProfile,
    )
```

- [ ] **Step 4: Verify build passes**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 5: Run all tests**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/services/gemini.ts src/components/PathGenerationStep.tsx
git commit -m "feat: enhance path generation with insight profile for more personalized results"
```

---

### Task 15: Final integration test and cleanup

**Files:**
- Modify: `src/test/fixtures.ts`
- Run: all tests

- [ ] **Step 1: Update fixtures with full insight engine state**

In `src/test/fixtures.ts`, add a `createFullInsightProfile` fixture:

```typescript
import type {
  ReflectionAnswers, CareerPath, MatrixScore, ActionPlan, WizardState,
  InsightProfile, ValuesHierarchy,
} from '../types'
import {
  createInitialReflection, createInitialMatrix,
  createInitialInsightProfile, createInitialValuesHierarchy,
} from '../types'

export function createMockInsightProfile(): InsightProfile {
  return {
    tensions: [
      {
        description: 'Values creative freedom but rates stability highly',
        question: 'You want creative freedom and stability — which would you sacrifice first?',
        response: 'I think stability is more about predictability than safety for me.',
        resolution: 'Reframed stability as predictability — open to risk with clear path.',
      },
    ],
    coreValues: [
      { value: 'Creative problem-solving', rank: 1, evidence: 'Energized by building UI and solving bugs' },
      { value: 'Continuous learning', rank: 2, evidence: 'Rated learning opportunity 5/5, learns tech outside work' },
      { value: 'Autonomy', rank: 3, evidence: 'Flexibility rated 5/5, drained by meetings and unclear requirements' },
    ],
    hiddenBlockers: [
      { belief: 'Too specialized to pivot', source: 'Belief-to-change answer' },
    ],
    narrative: 'You\'re someone who thrives on creative technical challenges but feels trapped by legacy code and meetings. Your desire for stability is really about wanting predictability — you\'d take a risk if you could see the path clearly.',
    conversationLog: [
      { role: 'assistant', content: 'You want creative freedom and stability — which would you sacrifice first?' },
      { role: 'user', content: 'I think stability is more about predictability than safety for me.' },
    ],
  }
}

export function createMockValuesHierarchy(): ValuesHierarchy {
  return {
    values: [
      { value: 'Creative problem-solving', aiRank: 1, userRank: 1, evidence: 'Energized by building UI' },
      { value: 'Continuous learning', aiRank: 2, userRank: 2, evidence: 'Learning opportunity 5/5' },
      { value: 'Autonomy', aiRank: 3, userRank: 3, evidence: 'Flexibility rated 5/5' },
    ],
  }
}
```

Update `createFullWizardState()` to use the new fixtures:

```typescript
export function createFullWizardState(): WizardState {
  return {
    currentStep: 7,
    reflection: createCompletedReflection(),
    insightProfile: createMockInsightProfile(),
    valuesHierarchy: createMockValuesHierarchy(),
    paths: createMockPaths(),
    selectedPathIds: ['path-1', 'path-3'],
    pathExplorations: [],
    matrix: {
      ...createInitialMatrix(),
      scores: createMockScores(),
    },
    scenarios: [],
    convictionCheck: {
      matrixTopPath: 'path-1',
      chosenPath: 'path-1',
      response: 'yes',
      conversation: [],
      reasoning: '',
    },
    actionPlan: createMockActionPlan(),
    personalNarrative: 'You\'re someone who thrives on creative technical challenges.',
  }
}
```

- [ ] **Step 2: Run full test suite**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 3: Run full build**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 4: Run lint**

Run: `npm run lint`
Expected: Lint passes clean (fix any issues before committing).

- [ ] **Step 5: Commit**

```bash
git add src/test/fixtures.ts
git commit -m "feat: update test fixtures for insight engine and verify full build"
```

---

## Summary of Changes

**New files (6):**
- `src/components/DiscoverStep.tsx` — AI conversation + values hierarchy
- `src/components/CommitStep.tsx` — Conviction check
- `src/components/PathExplorePanel.tsx` — Per-path exploration chat
- `src/types.test.ts` — Type factory tests
- `src/components/__tests__/DiscoverStep.test.tsx`
- `src/components/__tests__/CommitStep.test.tsx`
- `src/components/__tests__/ScenarioModeling.test.tsx`
- `src/components/__tests__/ReflectionDeep.test.tsx`
- `src/services/__tests__/gemini.insight.test.ts`
- `src/hooks/__tests__/useWizard.insight.test.ts`
- `.env.example`

**Modified files (12):**
- `src/types.ts` — New interfaces, 7-step wizard, 4 new reflection fields
- `src/hooks/useWizard.ts` — New state, actions, validation for 7 steps
- `src/services/gemini.ts` — 7 new functions for conversation, synthesis, exploration, narrative
- `src/services/pdf.ts` — Narrative + enhanced action plan sections
- `src/App.tsx` — 7-step wizard wiring
- `src/components/ReflectionStep.tsx` — 12 questions
- `src/components/PathGenerationStep.tsx` — Exploration panel integration
- `src/components/PathCard.tsx` — Explore button
- `src/components/DecisionMatrixStep.tsx` — Scenario modeling
- `src/components/ActionPlanStep.tsx` — Enhanced prompts, conviction check support
- `src/components/ActionPlanDisplay.tsx` — New sections display
- `src/components/SummaryStep.tsx` — Narrative display
- `src/test/fixtures.ts` — Full insight engine fixtures
- `.gitignore` — .env entries
