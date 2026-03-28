import { renderHook, act } from '@testing-library/react'
import { useWizard } from '../useWizard'
import { createCompletedReflection, createMockPaths } from '../../test/fixtures'

describe('useWizard', () => {
  describe('advancing and going back preserves form state', () => {
    it('preserves reflection answers after navigating forward and back', () => {
      const { result } = renderHook(() => useWizard())
      const reflection = createCompletedReflection()

      act(() => {
        result.current.updateReflection(reflection)
      })

      // Advance to step 2
      act(() => {
        result.current.nextStep()
      })
      expect(result.current.state.currentStep).toBe(2)

      // Go back to step 1
      act(() => {
        result.current.prevStep()
      })
      expect(result.current.state.currentStep).toBe(1)

      // Verify reflection is fully preserved
      expect(result.current.state.reflection.energizers).toEqual(reflection.energizers)
      expect(result.current.state.reflection.drainers).toEqual(reflection.drainers)
      expect(result.current.state.reflection.codingIn5Years).toBe(reflection.codingIn5Years)
      expect(result.current.state.reflection.learningInterests).toEqual(reflection.learningInterests)
      expect(result.current.state.reflection.keepInJob).toBe(reflection.keepInJob)
      expect(result.current.state.reflection.successVision).toBe(reflection.successVision)
    })
  })

  describe('step completion gates', () => {
    it('cannot advance past step 1 without answering required questions', () => {
      const { result } = renderHook(() => useWizard())

      expect(result.current.canAdvance()).toBe(false)

      act(() => {
        result.current.nextStep()
      })
      expect(result.current.state.currentStep).toBe(1)
    })

    it('cannot advance with only energizers filled', () => {
      const { result } = renderHook(() => useWizard())

      act(() => {
        result.current.updateReflection({ energizers: ['Building UI'] })
      })

      expect(result.current.canAdvance()).toBe(false)
    })

    it('cannot advance with only energizers and drainers filled', () => {
      const { result } = renderHook(() => useWizard())

      act(() => {
        result.current.updateReflection({
          energizers: ['Building UI'],
          drainers: ['Meetings'],
        })
      })

      expect(result.current.canAdvance()).toBe(false)
    })

    it('cannot advance without learningInterests', () => {
      const { result } = renderHook(() => useWizard())

      act(() => {
        result.current.updateReflection({
          energizers: ['Building UI'],
          drainers: ['Meetings'],
          codingIn5Years: 'yes',
        })
      })

      expect(result.current.canAdvance()).toBe(false)
    })

    it('can advance when all required fields are filled', () => {
      const { result } = renderHook(() => useWizard())

      act(() => {
        result.current.updateReflection({
          energizers: ['Building UI'],
          drainers: ['Meetings'],
          codingIn5Years: 'yes',
          learningInterests: ['Tech / coding'],
        })
      })

      expect(result.current.canAdvance()).toBe(true)

      act(() => {
        result.current.nextStep()
      })
      expect(result.current.state.currentStep).toBe(2)
    })
  })

  describe('selecting and deselecting paths in step 2', () => {
    it('toggles path selection on and off', () => {
      const { result } = renderHook(() => useWizard())
      const paths = createMockPaths()

      // Set up to reach step 2
      act(() => {
        result.current.updateReflection(createCompletedReflection())
      })
      act(() => {
        result.current.nextStep()
      })
      act(() => {
        result.current.setPaths(paths)
      })

      // Select a path
      act(() => {
        result.current.togglePathSelection('path-1')
      })
      expect(result.current.state.selectedPathIds).toContain('path-1')

      // Deselect the same path
      act(() => {
        result.current.togglePathSelection('path-1')
      })
      expect(result.current.state.selectedPathIds).not.toContain('path-1')
    })

    it('allows selecting up to 4 paths', () => {
      const { result } = renderHook(() => useWizard())
      const paths = createMockPaths()

      act(() => {
        result.current.updateReflection(createCompletedReflection())
      })
      act(() => {
        result.current.nextStep()
      })
      act(() => {
        result.current.setPaths(paths)
      })

      // Select 4 paths
      act(() => {
        result.current.togglePathSelection('path-1')
      })
      act(() => {
        result.current.togglePathSelection('path-2')
      })
      act(() => {
        result.current.togglePathSelection('path-3')
      })
      act(() => {
        result.current.togglePathSelection('path-4')
      })

      expect(result.current.state.selectedPathIds).toHaveLength(4)
    })

    it('does not allow selecting more than 4 paths', () => {
      const { result } = renderHook(() => useWizard())
      const paths = createMockPaths()

      act(() => {
        result.current.updateReflection(createCompletedReflection())
      })
      act(() => {
        result.current.nextStep()
      })
      act(() => {
        result.current.setPaths(paths)
      })

      // Select 4 paths
      act(() => {
        result.current.togglePathSelection('path-1')
      })
      act(() => {
        result.current.togglePathSelection('path-2')
      })
      act(() => {
        result.current.togglePathSelection('path-3')
      })
      act(() => {
        result.current.togglePathSelection('path-4')
      })

      // Try to select a 5th path
      act(() => {
        result.current.togglePathSelection('path-5')
      })

      expect(result.current.state.selectedPathIds).toHaveLength(4)
      expect(result.current.state.selectedPathIds).not.toContain('path-5')
    })

    it('can still deselect when at max selections', () => {
      const { result } = renderHook(() => useWizard())
      const paths = createMockPaths()

      act(() => {
        result.current.updateReflection(createCompletedReflection())
      })
      act(() => {
        result.current.nextStep()
      })
      act(() => {
        result.current.setPaths(paths)
      })

      // Select 4 paths
      act(() => {
        result.current.togglePathSelection('path-1')
      })
      act(() => {
        result.current.togglePathSelection('path-2')
      })
      act(() => {
        result.current.togglePathSelection('path-3')
      })
      act(() => {
        result.current.togglePathSelection('path-4')
      })

      // Deselect one
      act(() => {
        result.current.togglePathSelection('path-2')
      })

      expect(result.current.state.selectedPathIds).toHaveLength(3)
      expect(result.current.state.selectedPathIds).not.toContain('path-2')
    })
  })
})
