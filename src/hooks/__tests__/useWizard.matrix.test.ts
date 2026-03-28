import { renderHook, act } from '@testing-library/react'
import { useWizard } from '../useWizard'
import {
  createCompletedReflection,
  createMockPaths,
  createMockScores,
} from '../../test/fixtures'
import { MATRIX_CRITERIA } from '../../types'

/**
 * Helper: compute the weighted total for a given path from the matrix state.
 */
function computeWeightedTotal(
  pathId: string,
  weights: Record<string, number>,
  scores: Record<string, Record<string, { score: number }>>,
): number {
  let total = 0
  for (const c of MATRIX_CRITERIA) {
    const weight = weights[c.id] ?? 0
    const score = scores[pathId]?.[c.id]?.score ?? 0
    total += weight * score
  }
  return total
}

/**
 * Helper: set up the hook to step 3 with paths selected and matrix scores loaded.
 */
function setupAtStep3() {
  const { result } = renderHook(() => useWizard())
  const paths = createMockPaths()
  const mockScores = createMockScores()

  // Complete step 1
  act(() => {
    result.current.updateReflection(createCompletedReflection())
  })
  act(() => {
    result.current.nextStep()
  })

  // Complete step 2: set paths and select 2
  act(() => {
    result.current.setPaths(paths)
  })
  act(() => {
    result.current.togglePathSelection('path-1')
  })
  act(() => {
    result.current.togglePathSelection('path-2')
  })
  act(() => {
    result.current.nextStep()
  })

  // Load matrix scores
  act(() => {
    result.current.setMatrixScores(mockScores)
  })

  return { result }
}

describe('useWizard - decision matrix logic', () => {
  describe('weight changes recalculate totals correctly', () => {
    it('changes weighted total when a weight is updated', () => {
      const { result } = setupAtStep3()

      const { weights, scores } = result.current.state.matrix

      const totalBefore = computeWeightedTotal('path-1', weights, scores)

      // Change the salary weight from default 3 to 5
      act(() => {
        result.current.updateWeight('salary', 5)
      })

      const updatedWeights = result.current.state.matrix.weights
      const totalAfter = computeWeightedTotal('path-1', updatedWeights, result.current.state.matrix.scores)

      // path-1 salary score is 4; weight changed from 3 to 5, so diff = 4 * (5 - 3) = 8
      expect(totalAfter - totalBefore).toBe(8)
    })

    it('default weight is 3 for all criteria', () => {
      const { result } = setupAtStep3()

      for (const c of MATRIX_CRITERIA) {
        expect(result.current.state.matrix.weights[c.id]).toBe(3)
      }
    })
  })

  describe('score overrides replace LLM-suggested scores', () => {
    it('marks a score as overridden when updated via updateScore', () => {
      const { result } = setupAtStep3()

      // Verify initial scores are not overridden
      expect(result.current.state.matrix.scores['path-1']['salary'].isOverridden).toBe(false)

      // Override the score
      act(() => {
        result.current.updateScore('path-1', 'salary', 2)
      })

      const updated = result.current.state.matrix.scores['path-1']['salary']
      expect(updated.score).toBe(2)
      expect(updated.isOverridden).toBe(true)
    })

    it('preserves rationale when overriding a score', () => {
      const { result } = setupAtStep3()

      const originalRationale = result.current.state.matrix.scores['path-1']['salary'].rationale

      act(() => {
        result.current.updateScore('path-1', 'salary', 1)
      })

      expect(result.current.state.matrix.scores['path-1']['salary'].rationale).toBe(originalRationale)
    })
  })

  describe('ranking updates when scores or weights change', () => {
    it('ranking changes when a weight is adjusted to favor a different path', () => {
      const { result } = setupAtStep3()

      // Select path-4 too so we have 3 paths to compare
      act(() => {
        result.current.togglePathSelection('path-4')
      })
      // Reload scores for path-4
      act(() => {
        result.current.setMatrixScores(createMockScores())
      })

      const selectedIds = result.current.state.selectedPathIds

      // Compute initial ranking
      const initialRanking = [...selectedIds].sort((a, b) => {
        const { weights, scores } = result.current.state.matrix
        return computeWeightedTotal(b, weights, scores) - computeWeightedTotal(a, weights, scores)
      })

      // path-4 has salary score 5 (highest), so boosting salary weight should help it
      act(() => {
        result.current.updateWeight('salary', 5)
      })
      // path-4 has lower creative/transition scores, so also lower those weights
      act(() => {
        result.current.updateWeight('creative', 1)
      })
      act(() => {
        result.current.updateWeight('transition', 1)
      })

      const { weights: newWeights, scores: newScores } = result.current.state.matrix
      const newRanking = [...selectedIds].sort((a, b) => {
        return computeWeightedTotal(b, newWeights, newScores) - computeWeightedTotal(a, newWeights, newScores)
      })

      // Ranking should have changed from initial
      expect(newRanking).not.toEqual(initialRanking)
    })

    it('ranking changes when a score is overridden', () => {
      const { result } = setupAtStep3()

      const { weights, scores } = result.current.state.matrix
      const path1Before = computeWeightedTotal('path-1', weights, scores)
      const path2Before = computeWeightedTotal('path-2', weights, scores)

      // path-1 should be ahead of path-2 initially
      expect(path1Before).toBeGreaterThan(path2Before)

      // Drop all path-1 scores to 1
      for (const c of MATRIX_CRITERIA) {
        act(() => {
          result.current.updateScore('path-1', c.id, 1)
        })
      }

      const { weights: w2, scores: s2 } = result.current.state.matrix
      const path1After = computeWeightedTotal('path-1', w2, s2)
      const path2After = computeWeightedTotal('path-2', w2, s2)

      // Now path-2 should be ahead
      expect(path2After).toBeGreaterThan(path1After)
    })
  })

  describe('tied scores handled deterministically', () => {
    it('produces consistent ordering for paths with identical weighted totals', () => {
      const { result } = setupAtStep3()

      // Set both path-1 and path-2 to identical scores across all criteria
      const identicalScores: Record<string, Record<string, { score: number; rationale: string; isOverridden: boolean }>> = {}
      for (const pathId of ['path-1', 'path-2']) {
        identicalScores[pathId] = {}
        for (const c of MATRIX_CRITERIA) {
          identicalScores[pathId][c.id] = {
            score: 3,
            rationale: 'Same score',
            isOverridden: false,
          }
        }
      }

      act(() => {
        result.current.setMatrixScores(identicalScores)
      })

      const { weights, scores } = result.current.state.matrix
      const total1 = computeWeightedTotal('path-1', weights, scores)
      const total2 = computeWeightedTotal('path-2', weights, scores)

      expect(total1).toBe(total2)

      // Sort deterministically: when tied, use stable sort (original order preserved)
      const selectedIds = result.current.state.selectedPathIds
      const ranking1 = [...selectedIds].sort((a, b) => {
        const diff = computeWeightedTotal(b, weights, scores) - computeWeightedTotal(a, weights, scores)
        return diff !== 0 ? diff : a.localeCompare(b)
      })

      // Run again to verify consistency
      const ranking2 = [...selectedIds].sort((a, b) => {
        const diff = computeWeightedTotal(b, weights, scores) - computeWeightedTotal(a, weights, scores)
        return diff !== 0 ? diff : a.localeCompare(b)
      })

      expect(ranking1).toEqual(ranking2)
    })
  })
})
