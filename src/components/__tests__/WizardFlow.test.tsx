import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Mock } from 'vitest'
import React from 'react'
import App from '../../App'
import { createMockPaths, createMockScores, createMockActionPlan } from '../../test/fixtures'
import { streamCareerPaths, generateMatrixScores, streamActionPlan } from '../../services/gemini'

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

describe('WizardFlow integration', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('completes the full flow: reflect -> generate paths -> select paths -> score matrix -> generate action plan -> view summary', async () => {
    const user = userEvent.setup()

    // Set up mocks
    ;(streamCareerPaths as Mock).mockImplementation((_key: string, _reflection: unknown, callbacks: { onPaths: (p: unknown) => void; onDone: () => void }) => {
      callbacks.onPaths(createMockPaths())
      callbacks.onDone()
      return Promise.resolve()
    })
    ;(generateMatrixScores as Mock).mockResolvedValue(createMockScores())

    const mockPlan = createMockActionPlan()
    ;(streamActionPlan as Mock).mockImplementation((_key: string, _path: unknown, callbacks: { onText: (t: string) => void; onPlan: (p: unknown) => void; onDone: () => void }) => {
      callbacks.onText('generating...')
      callbacks.onPlan(mockPlan)
      callbacks.onDone()
      return Promise.resolve()
    })

    render(<App />)

    // ────────────────────────────────────────────
    // Step 1: Reflect
    // ────────────────────────────────────────────

    // Q0: Energizers (MultiSelect) — select two options
    expect(screen.getByText('What parts of your current work make time fly?')).toBeInTheDocument()
    await user.click(screen.getByText('Building UI'))
    await user.click(screen.getByText('Solving bugs'))
    await user.click(screen.getByRole('button', { name: 'Next' }))

    // Q1: Drainers (MultiSelect) — select two options
    expect(screen.getByText('What drains you the most?')).toBeInTheDocument()
    await user.click(screen.getByText('Meetings'))
    await user.click(screen.getByText('Legacy code'))
    await user.click(screen.getByRole('button', { name: 'Next' }))

    // Q2: Keep in job (OpenEnded) — skip
    expect(screen.getByText('If you could redesign your job, what would you keep?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next' }))

    // Q3: Priorities (SliderGroup) — skip (defaults are fine)
    expect(screen.getByText('How important is each of these to you?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next' }))

    // Q4: Coding in 5 years (SingleChoice) — select "Maybe"
    expect(screen.getByText('Do you see yourself writing code in 5 years?')).toBeInTheDocument()
    await user.click(screen.getByText('Maybe'))
    await user.click(screen.getByRole('button', { name: 'Next' }))

    // Q5: Energy level (Slider) — skip (default is fine)
    expect(screen.getByText("What's your energy level at the end of a work day?")).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next' }))

    // Q6: Learning interests (MultiSelect) — select options
    expect(screen.getByText('When you learn something new outside work, what is it?')).toBeInTheDocument()
    await user.click(screen.getByText('Tech / coding'))
    await user.click(screen.getByText('Design'))
    await user.click(screen.getByRole('button', { name: 'Next' }))

    // Q7: Success vision (OpenEnded) — skip
    expect(screen.getByText('What would success look like in 2 years?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next' }))

    // Q8: Regret decision (OpenEnded) — skip
    expect(screen.getByText(/Think of a career decision you regret/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next' }))

    // Q9: Good at but don't want (OpenEnded) — skip
    expect(screen.getByText(/What's something you're good at/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next' }))

    // Q10: If money were equal (OpenEnded) — skip
    expect(screen.getByText(/If money were equal/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next' }))

    // Q11: Belief to change (OpenEnded) — last question, click "Continue"
    expect(screen.getByText(/What would you need to believe/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    // ────────────────────────────────────────────
    // Step 2: Discover (placeholder)
    // ────────────────────────────────────────────

    await waitFor(() => {
      expect(screen.getByText("Let's dig deeper")).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    // ────────────────────────────────────────────
    // Step 3: Explore
    // ────────────────────────────────────────────

    await waitFor(() => {
      expect(screen.getByText('Your career paths')).toBeInTheDocument()
    })

    // Click "Generate paths"
    await user.click(screen.getByRole('button', { name: 'Generate paths' }))

    // Wait for paths to render
    await waitFor(() => {
      expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument()
      expect(screen.getByText('Product Manager')).toBeInTheDocument()
      expect(screen.getByText('UX Engineer')).toBeInTheDocument()
      expect(screen.getByText('Engineering Manager')).toBeInTheDocument()
    })

    // Select 2 paths — click the "Select" buttons on path cards
    const selectButtons = screen.getAllByRole('button', { name: 'Select' })
    await user.click(selectButtons[0]) // Senior Frontend Engineer
    await user.click(selectButtons[1]) // Product Manager

    // Click "Compare selected"
    await user.click(screen.getByRole('button', { name: 'Compare selected' }))

    // ────────────────────────────────────────────
    // Step 4: Compare (Decision Matrix)
    // ────────────────────────────────────────────

    await waitFor(() => {
      expect(screen.getByText('Compare your paths')).toBeInTheDocument()
    })

    // Click "Auto-score"
    await user.click(screen.getByRole('button', { name: 'Auto-score' }))

    // Wait for scores to load
    await waitFor(() => {
      expect(screen.getByText('Weighted Total')).toBeInTheDocument()
    })

    // Click "Generate action plan" to advance
    await user.click(screen.getByRole('button', { name: 'Generate action plan' }))

    // ────────────────────────────────────────────
    // Step 5: Commit (placeholder)
    // ────────────────────────────────────────────

    await waitFor(() => {
      expect(screen.getByText('Does this feel right?')).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: 'Generate plan' }))

    // ────────────────────────────────────────────
    // Step 6: Plan (Action Plan)
    // ────────────────────────────────────────────

    await waitFor(() => {
      expect(screen.getByText('Your action plan')).toBeInTheDocument()
    })

    // Click "Generate action plan" button (the one in the center of the step)
    const generatePlanButton = screen.getByRole('button', { name: 'Generate action plan' })
    await user.click(generatePlanButton)

    // Wait for action plan to render
    await waitFor(() => {
      expect(screen.getByText('Research & Foundations')).toBeInTheDocument()
    })

    // Click "View summary" to advance
    await user.click(screen.getByRole('button', { name: 'View summary' }))

    // ────────────────────────────────────────────
    // Step 7: Summary
    // ────────────────────────────────────────────

    await waitFor(() => {
      expect(screen.getByText('Your career clarity')).toBeInTheDocument()
    })

    // Verify reflection data is shown
    expect(screen.getByText('Energizers')).toBeInTheDocument()
    expect(screen.getByText('Drainers')).toBeInTheDocument()

    // Verify path titles appear in summary (may appear in multiple sections)
    expect(screen.getAllByText('Senior Frontend Engineer').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Product Manager').length).toBeGreaterThanOrEqual(1)

    // Verify action plan content is present
    expect(screen.getByText(/Action Plan/)).toBeInTheDocument()
    expect(screen.getByText('Research & Foundations')).toBeInTheDocument()

    // Verify decision matrix rankings section exists
    expect(screen.getByText('Decision Matrix Rankings')).toBeInTheDocument()
  })
})
