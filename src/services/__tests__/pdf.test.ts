import type { Mock } from 'vitest'
import { createFullWizardState } from '../../test/fixtures'

const mockDoc = {
  setFont: vi.fn(),
  setFontSize: vi.fn(),
  setTextColor: vi.fn(),
  text: vi.fn(),
  splitTextToSize: vi.fn((text: string) => [text]),
  getTextWidth: vi.fn(() => 20),
  addPage: vi.fn(),
  save: vi.fn(),
  internal: { pageSize: { getWidth: () => 210, getHeight: () => 297 } },
}

vi.mock('jspdf', () => {
  const MockJsPDF = vi.fn(function () {
    return mockDoc
  })
  return { jsPDF: MockJsPDF }
})

describe('PDF export', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('generates a PDF and calls save with the correct filename', async () => {
    const { exportPdf } = await import('../pdf')
    const { jsPDF } = await import('jspdf')

    const state = createFullWizardState()
    exportPdf(state)

    // jsPDF constructor was called
    expect(jsPDF).toHaveBeenCalled()

    // doc.save was called with the expected filename
    expect(mockDoc.save).toHaveBeenCalledWith('clarify-career-plan.pdf')
  })

  it('includes summary content: energizers, path titles, and action plan', async () => {
    const { exportPdf } = await import('../pdf')

    const state = createFullWizardState()
    exportPdf(state)

    // Gather all text calls into a single string for easy searching
    const textCalls = (mockDoc.text as Mock).mock.calls.map((call) => {
      // doc.text can be called with a string or array of strings as first arg
      const arg = call[0]
      if (Array.isArray(arg)) return arg.join(' ')
      return String(arg)
    })
    const allText = textCalls.join(' ')

    // Verify reflection data (energizers)
    expect(allText).toContain('Building UI')
    expect(allText).toContain('Solving bugs')

    // Verify path titles
    expect(allText).toContain('Senior Frontend Engineer')
    expect(allText).toContain('Product Manager')
    expect(allText).toContain('UX Engineer')
    expect(allText).toContain('Engineering Manager')

    // Verify action plan content
    expect(allText).toContain('Research & Foundations')
    expect(allText).toContain('Build & Practice')
    expect(allText).toContain('Launch & Apply')

    // Verify action plan items
    expect(allText).toContain('Study system design patterns')

    // Verify section headings
    expect(allText).toContain('Reflection Highlights')
    expect(allText).toContain('Career Paths Explored')
    expect(allText).toContain('Decision Matrix Rankings')
  })
})
