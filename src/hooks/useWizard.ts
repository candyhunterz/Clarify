import { useReducer, useCallback } from 'react'
import type {
  WizardState, ReflectionAnswers, CareerPath, MatrixScore, ActionPlan,
  InsightProfile, ValuesHierarchy, ConvictionCheck, ConversationMessage,
  Scenario,
} from '../types'
import {
  createInitialReflection, createInitialMatrix, createInitialInsightProfile,
  createInitialValuesHierarchy, WIZARD_STEPS, MATRIX_CRITERIA,
} from '../types'

const MAX_UNDO_STACK = 50

// ── History types ──

interface HistoryEntry {
  state: WizardState
  staleSteps: number[]
}

interface WizardHistory {
  current: WizardState
  past: HistoryEntry[]
  future: HistoryEntry[]
  staleSteps: number[]
  direction: number
}

// ── Actions ──

type WizardAction =
  // Undoable user actions
  | { type: 'UPDATE_REFLECTION'; updates: Partial<ReflectionAnswers> }
  | { type: 'TOGGLE_PATH_SELECTION'; pathId: string }
  | { type: 'UPDATE_WEIGHT'; criterionId: string; weight: number }
  | { type: 'UPDATE_SCORE'; pathId: string; criterionId: string; score: number }
  // Non-undoable (LLM / system)
  | { type: 'SET_PATHS'; paths: CareerPath[] }
  | { type: 'SET_MATRIX_SCORES'; scores: Record<string, Record<string, MatrixScore>> }
  | { type: 'SET_ACTION_PLAN'; plan: ActionPlan | null }
  // Insight engine actions (non-undoable, LLM / system)
  | { type: 'SET_INSIGHT_PROFILE'; profile: InsightProfile }
  | { type: 'SET_VALUES_HIERARCHY'; hierarchy: ValuesHierarchy }
  | { type: 'SET_CONVICTION_CHECK'; check: ConvictionCheck | null }
  | { type: 'SET_PERSONAL_NARRATIVE'; narrative: string }
  | { type: 'ADD_PATH_EXPLORATION_MESSAGE'; pathId: string; message: ConversationMessage }
  | { type: 'SET_SCENARIOS'; scenarios: Scenario[] }
  // Navigation
  | { type: 'GO_TO_STEP'; step: number }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  // History
  | { type: 'UNDO' }
  | { type: 'REDO' }
  // Session
  | { type: 'LOAD_STATE'; state: WizardState }

// ── Helpers ──

function pushEntry(past: HistoryEntry[], current: WizardState, staleSteps: number[]): HistoryEntry[] {
  const entry: HistoryEntry = { state: current, staleSteps }
  const next = past.length >= MAX_UNDO_STACK ? past.slice(1) : past
  return [...next, entry]
}

function addStaleDownstream(staleSteps: number[], fromStep: number): number[] {
  const set = new Set(staleSteps)
  for (let s = fromStep + 1; s <= 6; s++) set.add(s)
  return Array.from(set)
}

// ── Reducer ──

function wizardReducer(history: WizardHistory, action: WizardAction): WizardHistory {
  const { current, past, future, staleSteps, direction } = history

  switch (action.type) {
    // ── Undoable user actions ──

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

    case 'TOGGLE_PATH_SELECTION': {
      const isSelected = current.selectedPathIds.includes(action.pathId)
      let nextIds: string[]
      if (isSelected) {
        nextIds = current.selectedPathIds.filter((id) => id !== action.pathId)
      } else if (current.selectedPathIds.length < 4) {
        nextIds = [...current.selectedPathIds, action.pathId]
      } else {
        return history
      }
      return {
        current: { ...current, selectedPathIds: nextIds },
        past: pushEntry(past, current, staleSteps),
        future: [],
        staleSteps: addStaleDownstream(staleSteps, 3),
        direction,
      }
    }

    case 'UPDATE_WEIGHT':
      return {
        current: {
          ...current,
          matrix: {
            ...current.matrix,
            weights: { ...current.matrix.weights, [action.criterionId]: action.weight },
          },
        },
        past: pushEntry(past, current, staleSteps),
        future: [],
        staleSteps: addStaleDownstream(staleSteps, 4),
        direction,
      }

    case 'UPDATE_SCORE': {
      const pathScores = current.matrix.scores[action.pathId] ?? {}
      const existing = pathScores[action.criterionId]
      const updated: MatrixScore = {
        score: action.score,
        rationale: existing?.rationale ?? '',
        isOverridden: true,
      }
      return {
        current: {
          ...current,
          matrix: {
            ...current.matrix,
            scores: {
              ...current.matrix.scores,
              [action.pathId]: { ...pathScores, [action.criterionId]: updated },
            },
          },
        },
        past: pushEntry(past, current, staleSteps),
        future: [],
        staleSteps: addStaleDownstream(staleSteps, 4),
        direction,
      }
    }

    // ── Non-undoable (LLM / system) ──

    case 'SET_PATHS':
      return {
        ...history,
        current: { ...current, paths: action.paths },
        staleSteps: staleSteps.filter((s) => s !== 3),
      }

    case 'SET_MATRIX_SCORES':
      return {
        ...history,
        current: {
          ...current,
          matrix: { ...current.matrix, scores: { ...current.matrix.scores, ...action.scores } },
        },
        staleSteps: staleSteps.filter((s) => s !== 4),
      }

    case 'SET_ACTION_PLAN':
      return {
        ...history,
        current: { ...current, actionPlan: action.plan },
        staleSteps: staleSteps.filter((s) => s !== 6),
      }

    // ── Insight engine actions ──

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

    // ── Navigation ──

    case 'GO_TO_STEP': {
      if (action.step < 1 || action.step > WIZARD_STEPS.length) return history
      if (action.step > current.currentStep + 1) return history
      return {
        ...history,
        current: { ...current, currentStep: action.step },
        direction: action.step >= current.currentStep ? 1 : -1,
      }
    }

    case 'NEXT_STEP':
      return {
        ...history,
        current: {
          ...current,
          currentStep: Math.min(current.currentStep + 1, WIZARD_STEPS.length),
        },
        direction: 1,
      }

    case 'PREV_STEP':
      return {
        ...history,
        current: {
          ...current,
          currentStep: Math.max(current.currentStep - 1, 1),
        },
        direction: -1,
      }

    // ── History ──

    case 'UNDO': {
      if (past.length === 0) return history
      const entry = past[past.length - 1]
      return {
        current: { ...entry.state, currentStep: current.currentStep },
        past: past.slice(0, -1),
        future: [...future, { state: current, staleSteps }],
        staleSteps: entry.staleSteps,
        direction,
      }
    }

    case 'REDO': {
      if (future.length === 0) return history
      const entry = future[future.length - 1]
      return {
        current: { ...entry.state, currentStep: current.currentStep },
        past: [...past, { state: current, staleSteps }],
        future: future.slice(0, -1),
        staleSteps: entry.staleSteps,
        direction,
      }
    }

    // ── Session ──

    case 'LOAD_STATE':
      return {
        current: action.state,
        past: [],
        future: [],
        staleSteps: [],
        direction: 1,
      }
  }
}

// ── Validation ──

function isReflectionComplete(r: ReflectionAnswers): boolean {
  return (
    r.energizers.length > 0 &&
    r.drainers.length > 0 &&
    r.codingIn5Years !== '' &&
    r.learningInterests.length > 0
  )
}

// ── Hook ──

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

export function useWizard() {
  const [history, dispatch] = useReducer(wizardReducer, initialHistory)
  const { current: state, direction, staleSteps, past, future } = history

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
        // Placeholder: always allow advancing until CommitStep is fully implemented
        return true
      case 6:
        return state.actionPlan !== null
      default:
        return false
    }
  }, [state])

  const nextStep = useCallback(() => {
    if (!canAdvance()) return
    dispatch({ type: 'NEXT_STEP' })
  }, [canAdvance])

  return {
    state,
    direction,
    staleSteps,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    canAdvance,
    goToStep: useCallback((step: number) => dispatch({ type: 'GO_TO_STEP', step }), []),
    nextStep,
    prevStep: useCallback(() => dispatch({ type: 'PREV_STEP' }), []),
    updateReflection: useCallback(
      (updates: Partial<ReflectionAnswers>) => dispatch({ type: 'UPDATE_REFLECTION', updates }),
      [],
    ),
    setPaths: useCallback((paths: CareerPath[]) => dispatch({ type: 'SET_PATHS', paths }), []),
    togglePathSelection: useCallback(
      (pathId: string) => dispatch({ type: 'TOGGLE_PATH_SELECTION', pathId }),
      [],
    ),
    updateWeight: useCallback(
      (criterionId: string, weight: number) => dispatch({ type: 'UPDATE_WEIGHT', criterionId, weight }),
      [],
    ),
    updateScore: useCallback(
      (pathId: string, criterionId: string, score: number) =>
        dispatch({ type: 'UPDATE_SCORE', pathId, criterionId, score }),
      [],
    ),
    setMatrixScores: useCallback(
      (scores: Record<string, Record<string, MatrixScore>>) =>
        dispatch({ type: 'SET_MATRIX_SCORES', scores }),
      [],
    ),
    setActionPlan: useCallback(
      (plan: ActionPlan | null) => dispatch({ type: 'SET_ACTION_PLAN', plan }),
      [],
    ),
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
      (scenarios: Scenario[]) => dispatch({ type: 'SET_SCENARIOS', scenarios }),
      [],
    ),
    undo: useCallback(() => dispatch({ type: 'UNDO' }), []),
    redo: useCallback(() => dispatch({ type: 'REDO' }), []),
    loadState: useCallback(
      (saved: WizardState) => dispatch({ type: 'LOAD_STATE', state: saved }),
      [],
    ),
  }
}
