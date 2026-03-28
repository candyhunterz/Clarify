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
    expect(result.current.staleSteps).toContain(3)
    expect(result.current.staleSteps).toContain(4)
    expect(result.current.staleSteps).toContain(5)
    expect(result.current.staleSteps).toContain(6)
  })

  it('addPathExplorationMessage adds exploration for a path', () => {
    const { result } = renderHook(() => useWizard())
    act(() => {
      result.current.addPathExplorationMessage('path-1', { role: 'user', content: 'hello' })
    })
    expect(result.current.state.pathExplorations).toHaveLength(1)
    expect(result.current.state.pathExplorations[0].pathId).toBe('path-1')
    expect(result.current.state.pathExplorations[0].messages).toHaveLength(1)
  })

  it('addPathExplorationMessage appends to existing exploration', () => {
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
