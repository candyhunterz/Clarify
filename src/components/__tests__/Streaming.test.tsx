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
}))

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

/** Navigate through Step 1 (Reflect) with minimal required answers to reach Step 2 */
async function completeReflectionStep(user: ReturnType<typeof userEvent.setup>) {
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

  // Q7: Success vision — click Continue
  await user.click(screen.getByRole('button', { name: 'Continue' }))

  // Now on Step 2
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
    await completeReflectionStep(user)

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
    await completeReflectionStep(user)

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
    await completeReflectionStep(user)

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
