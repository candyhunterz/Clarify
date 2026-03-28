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
