import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Mock } from 'vitest'
import React from 'react'
import App from '../../App'
import { createMockPaths } from '../../test/fixtures'
import { streamCareerPaths } from '../../services/gemini'
import type { StreamCallbacks } from '../../services/gemini'

vi.mock('../../services/gemini', () => ({
  getApiKey: vi.fn(() => 'fake-key'),
  saveApiKey: vi.fn(),
  streamCareerPaths: vi.fn(),
  generateMatrixScores: vi.fn(),
  streamActionPlan: vi.fn(),
  buildTensionPrompt: vi.fn(() => 'tension prompt'),
  buildConversationFollowUpPrompt: vi.fn(() => 'follow-up prompt'),
  streamConversationTurn: vi.fn((_key: string, _prompt: string, callbacks: { onText: (t: string) => void; onDone: (t: string) => void }) => {
    const text = 'What matters most to you about this?'
    callbacks.onText(text)
    callbacks.onDone(text)
    return Promise.resolve()
  }),
  generateInsightSynthesis: vi.fn(() => Promise.resolve({
    profile: {
      tensions: [],
      coreValues: [{ value: 'Growth', rank: 1, evidence: 'test' }],
      hiddenBlockers: [],
      narrative: 'Test narrative for the user.',
      conversationLog: [],
    },
    valuesHierarchy: {
      values: [{ value: 'Growth', aiRank: 1, userRank: 1, evidence: 'test' }],
    },
  })),
}))

vi.mock('@google/generative-ai', () => {
  class MockGoogleGenerativeAI {
    getGenerativeModel() {
      return {
        generateContent: () => Promise.resolve({
          response: {
            text: () => JSON.stringify({
              tensions: [{ description: 'test tension', question: 'What do you think?' }],
              firstQuestion: 'What do you think about your career direction?',
            }),
          },
        }),
      }
    }
  }
  return { GoogleGenerativeAI: MockGoogleGenerativeAI }
})

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => {
      const { className, ...rest } = props
      const htmlProps: Record<string, unknown> = {}
      for (const [key, val] of Object.entries(rest)) {
        if (!['initial', 'animate', 'exit', 'variants', 'transition', 'custom'].includes(key)) {
          htmlProps[key] = val
        }
      }
      return React.createElement('div', { className, ...htmlProps }, children)
    },
  },
}))

/** Navigate through Step 1 (Reflect) and Step 2 (Discover) to reach Step 3 (Explore) */
async function completeReflectionAndDiscoverSteps(user: ReturnType<typeof userEvent.setup>) {
  // Q0: Energizers
  await user.click(screen.getByText('Building UI'))
  await user.click(screen.getByRole('button', { name: 'Next' }))

  // Q1: Drainers
  await user.click(screen.getByText('Meetings'))
  await user.click(screen.getByRole('button', { name: 'Next' }))

  // Q2: Keep in job — skip
  await user.click(screen.getByRole('button', { name: 'Next' }))

  // Q3: Priorities — skip
  await user.click(screen.getByRole('button', { name: 'Next' }))

  // Q4: Coding in 5 years
  await user.click(screen.getByText('Maybe'))
  await user.click(screen.getByRole('button', { name: 'Next' }))

  // Q5: Energy level — skip
  await user.click(screen.getByRole('button', { name: 'Next' }))

  // Q6: Learning interests
  await user.click(screen.getByText('Tech / coding'))
  await user.click(screen.getByRole('button', { name: 'Next' }))

  // Q7: Success vision — skip
  await user.click(screen.getByRole('button', { name: 'Next' }))

  // Q8: Regret decision — skip
  await user.click(screen.getByRole('button', { name: 'Next' }))

  // Q9: Good at but don't want — skip
  await user.click(screen.getByRole('button', { name: 'Next' }))

  // Q10: If money were equal — skip
  await user.click(screen.getByRole('button', { name: 'Next' }))

  // Q11: Belief to change — last question, click Continue to advance to Step 2 (Discover)
  await user.click(screen.getByRole('button', { name: 'Continue' }))

  // Step 2: Discover — complete the AI conversation
  await waitFor(() => {
    expect(screen.getByText("Let's dig deeper")).toBeInTheDocument()
  })

  // Click "Start conversation"
  await user.click(screen.getByRole('button', { name: 'Start conversation' }))

  // Wait for AI's first question to appear
  await waitFor(() => {
    expect(screen.getByText('What do you think about your career direction?')).toBeInTheDocument()
  })

  // Send messages through the conversation (MAX_EXCHANGES = 4, we need to send enough to trigger synthesis)
  for (let i = 0; i < 4; i++) {
    const input = screen.getByPlaceholderText('Type your response...')
    await user.type(input, 'I think growth is important to me.')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    // Wait for next phase (either chatting with next question, or review after synthesis)
    if (i < 3) {
      // Wait for next AI question to appear in messages
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Type your response...')).toBeInTheDocument()
      })
    }
  }

  // Wait for synthesis to complete and review phase
  await waitFor(() => {
    expect(screen.getByText('Test narrative for the user.')).toBeInTheDocument()
  })

  // Continue to Step 3
  await user.click(screen.getByRole('button', { name: 'Continue' }))

  // Now on Step 3 (Explore)
  await waitFor(() => {
    expect(screen.getByText('Your career paths')).toBeInTheDocument()
  })
}

describe('Streaming behavior', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('renders partial content progressively during streaming', async () => {
    const user = userEvent.setup()
    const mockPaths = createMockPaths()

    let capturedCallbacks: StreamCallbacks
    ;(streamCareerPaths as Mock).mockImplementation((_key: string, _reflection: unknown, callbacks: StreamCallbacks) => {
      capturedCallbacks = callbacks
      return new Promise(() => {}) // never resolves — we control callbacks manually
    })

    render(<App />)
    await completeReflectionAndDiscoverSteps(user)

    // Click "Generate paths"
    await user.click(screen.getByRole('button', { name: 'Generate paths' }))

    // Streaming has started, deliver first path
    capturedCallbacks!.onPaths([mockPaths[0]])

    await waitFor(() => {
      expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument()
    })

    // Second path should not be visible yet
    expect(screen.queryByText('Product Manager')).not.toBeInTheDocument()

    // Deliver two paths
    capturedCallbacks!.onPaths([mockPaths[0], mockPaths[1]])

    await waitFor(() => {
      expect(screen.getByText('Product Manager')).toBeInTheDocument()
    })

    // Complete the stream
    capturedCallbacks!.onDone()

    await waitFor(() => {
      // After onDone, both paths should still be visible
      expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument()
      expect(screen.getByText('Product Manager')).toBeInTheDocument()
    })
  })

  it('shows partial content and regenerate option when cancelled mid-stream', async () => {
    const user = userEvent.setup()
    const mockPaths = createMockPaths()

    let capturedCallbacks: StreamCallbacks
    ;(streamCareerPaths as Mock).mockImplementation((_key: string, _reflection: unknown, callbacks: StreamCallbacks) => {
      capturedCallbacks = callbacks
      return new Promise(() => {}) // never resolves
    })

    render(<App />)
    await completeReflectionAndDiscoverSteps(user)

    // Click "Generate paths"
    await user.click(screen.getByRole('button', { name: 'Generate paths' }))

    // Deliver partial data
    capturedCallbacks!.onPaths([mockPaths[0], mockPaths[1]])

    await waitFor(() => {
      expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument()
      expect(screen.getByText('Product Manager')).toBeInTheDocument()
    })

    // Click Cancel (do NOT call onDone)
    await user.click(screen.getByText('Cancel'))

    // Paths should still be visible
    await waitFor(() => {
      expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument()
      expect(screen.getByText('Product Manager')).toBeInTheDocument()
    })

    // Regenerate option should be available
    expect(screen.getByText('regenerate')).toBeInTheDocument()
  })

  it('shows error message and retry button on stream error', async () => {
    const user = userEvent.setup()

    let capturedCallbacks: StreamCallbacks
    ;(streamCareerPaths as Mock).mockImplementation((_key: string, _reflection: unknown, callbacks: StreamCallbacks) => {
      capturedCallbacks = callbacks
      return new Promise(() => {}) // never resolves
    })

    render(<App />)
    await completeReflectionAndDiscoverSteps(user)

    // Click "Generate paths"
    await user.click(screen.getByRole('button', { name: 'Generate paths' }))

    // Trigger error
    capturedCallbacks!.onError('API rate limit exceeded')

    await waitFor(() => {
      expect(screen.getByText('API rate limit exceeded')).toBeInTheDocument()
    })

    // Retry button should be available
    expect(screen.getByText('Retry')).toBeInTheDocument()
  })
})
