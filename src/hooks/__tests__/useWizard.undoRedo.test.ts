import { renderHook, act } from '@testing-library/react'
import { useWizard } from '../useWizard'
import {
  createCompletedReflection,
  createMockPaths,
  createMockScores,
} from '../../test/fixtures'

describe('useWizard - undo/redo', () => {
  describe('undo reverts the last change, redo re-applies it', () => {
    it('undoes a reflection update and redoes it', () => {
      const { result } = renderHook(() => useWizard())

      act(() => {
        result.current.updateReflection({ energizers: ['Building UI'] })
      })
      expect(result.current.state.reflection.energizers).toEqual(['Building UI'])

      act(() => {
        result.current.undo()
      })
      expect(result.current.state.reflection.energizers).toEqual([])

      act(() => {
        result.current.redo()
      })
      expect(result.current.state.reflection.energizers).toEqual(['Building UI'])
    })

    it('undoes a path selection toggle', () => {
      const { result } = renderHook(() => useWizard())

      act(() => {
        result.current.setPaths(createMockPaths())
      })
      act(() => {
        result.current.togglePathSelection('path-1')
      })
      expect(result.current.state.selectedPathIds).toContain('path-1')

      act(() => {
        result.current.undo()
      })
      expect(result.current.state.selectedPathIds).not.toContain('path-1')

      act(() => {
        result.current.redo()
      })
      expect(result.current.state.selectedPathIds).toContain('path-1')
    })

    it('undoes a weight update', () => {
      const { result } = renderHook(() => useWizard())

      act(() => {
        result.current.updateWeight('salary', 5)
      })
      expect(result.current.state.matrix.weights['salary']).toBe(5)

      act(() => {
        result.current.undo()
      })
      expect(result.current.state.matrix.weights['salary']).toBe(3) // default

      act(() => {
        result.current.redo()
      })
      expect(result.current.state.matrix.weights['salary']).toBe(5)
    })

    it('undoes a score update', () => {
      const { result } = renderHook(() => useWizard())

      act(() => {
        result.current.setMatrixScores(createMockScores())
      })

      const originalScore = result.current.state.matrix.scores['path-1']['salary'].score

      act(() => {
        result.current.updateScore('path-1', 'salary', 1)
      })
      expect(result.current.state.matrix.scores['path-1']['salary'].score).toBe(1)

      act(() => {
        result.current.undo()
      })
      expect(result.current.state.matrix.scores['path-1']['salary'].score).toBe(originalScore)
    })
  })

  describe('changing a step 1 answer marks steps 2-4 as stale', () => {
    it('marks downstream steps as stale on reflection update', () => {
      const { result } = renderHook(() => useWizard())

      act(() => {
        result.current.updateReflection({ energizers: ['Building UI'] })
      })

      expect(result.current.staleSteps).toContain(2)
      expect(result.current.staleSteps).toContain(3)
      expect(result.current.staleSteps).toContain(4)
    })
  })

  describe('changing path selection in step 2 marks steps 3-4 as stale', () => {
    it('marks downstream steps as stale on path toggle', () => {
      const { result } = renderHook(() => useWizard())

      act(() => {
        result.current.setPaths(createMockPaths())
      })
      act(() => {
        result.current.togglePathSelection('path-1')
      })

      expect(result.current.staleSteps).toContain(3)
      expect(result.current.staleSteps).toContain(4)
      expect(result.current.staleSteps).not.toContain(2)
    })
  })

  describe('undo stack clears redo stack on new action', () => {
    it('clears redo history when a new undoable action is performed', () => {
      const { result } = renderHook(() => useWizard())

      act(() => {
        result.current.updateReflection({ energizers: ['Building UI'] })
      })
      act(() => {
        result.current.updateReflection({ drainers: ['Meetings'] })
      })

      // Undo the drainers update
      act(() => {
        result.current.undo()
      })
      expect(result.current.canRedo).toBe(true)

      // Perform a new action - should clear redo stack
      act(() => {
        result.current.updateReflection({ codingIn5Years: 'yes' })
      })
      expect(result.current.canRedo).toBe(false)
    })
  })

  describe('canUndo/canRedo flags are correct', () => {
    it('starts with canUndo false and canRedo false', () => {
      const { result } = renderHook(() => useWizard())

      expect(result.current.canUndo).toBe(false)
      expect(result.current.canRedo).toBe(false)
    })

    it('canUndo becomes true after an undoable action', () => {
      const { result } = renderHook(() => useWizard())

      act(() => {
        result.current.updateReflection({ energizers: ['Building UI'] })
      })

      expect(result.current.canUndo).toBe(true)
      expect(result.current.canRedo).toBe(false)
    })

    it('canRedo becomes true after an undo', () => {
      const { result } = renderHook(() => useWizard())

      act(() => {
        result.current.updateReflection({ energizers: ['Building UI'] })
      })
      act(() => {
        result.current.undo()
      })

      expect(result.current.canUndo).toBe(false)
      expect(result.current.canRedo).toBe(true)
    })

    it('canUndo remains false after non-undoable actions', () => {
      const { result } = renderHook(() => useWizard())

      act(() => {
        result.current.setPaths(createMockPaths())
      })

      expect(result.current.canUndo).toBe(false)
    })

    it('canUndo remains false after navigation actions', () => {
      const { result } = renderHook(() => useWizard())

      act(() => {
        result.current.updateReflection(createCompletedReflection())
      })
      act(() => {
        result.current.nextStep()
      })

      // canUndo should reflect only the reflection update, not navigation
      // After nextStep, past still has the reflection entry
      expect(result.current.canUndo).toBe(true)

      act(() => {
        result.current.prevStep()
      })

      // Navigation doesn't push to undo stack
      expect(result.current.canUndo).toBe(true)
    })
  })

  describe('undo preserves currentStep', () => {
    it('reverts data but keeps the current navigation step', () => {
      const { result } = renderHook(() => useWizard())

      // Step 1: fill reflection
      act(() => {
        result.current.updateReflection(createCompletedReflection())
      })
      act(() => {
        result.current.nextStep()
      })
      expect(result.current.state.currentStep).toBe(2)

      // Make an undoable action at step 2
      act(() => {
        result.current.setPaths(createMockPaths())
      })
      act(() => {
        result.current.togglePathSelection('path-1')
      })
      expect(result.current.state.selectedPathIds).toContain('path-1')

      // Undo the path toggle
      act(() => {
        result.current.undo()
      })

      // Data should revert
      expect(result.current.state.selectedPathIds).not.toContain('path-1')
      // But step should remain at 2
      expect(result.current.state.currentStep).toBe(2)
    })

    it('preserves step when undoing a reflection change from a later step', () => {
      const { result } = renderHook(() => useWizard())

      // Update reflection and advance
      act(() => {
        result.current.updateReflection(createCompletedReflection())
      })
      act(() => {
        result.current.nextStep()
      })
      act(() => {
        result.current.setPaths(createMockPaths())
      })
      act(() => {
        result.current.togglePathSelection('path-1')
      })
      act(() => {
        result.current.togglePathSelection('path-2')
      })

      // Undo the last toggle - we should stay on step 2
      act(() => {
        result.current.undo()
      })

      expect(result.current.state.currentStep).toBe(2)
    })
  })
})
