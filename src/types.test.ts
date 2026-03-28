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
