import { renderHook, act } from '@testing-library/react'
import { useSessionPersistence } from '../useSessionPersistence'
import {
  createInitialWizardState,
  createCompletedReflection,
  createFullWizardState,
} from '../../test/fixtures'
import type { WizardState } from '../../types'

const STORAGE_KEY = 'clarify-session'

describe('useSessionPersistence', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('save/load round-trips correctly', () => {
    it('saves state to localStorage after startFresh and state change', () => {
      const initialState = createInitialWizardState()
      const onLoadState = vi.fn()

      const { result, rerender } = renderHook(
        ({ state }) => useSessionPersistence(state, onLoadState),
        { initialProps: { state: initialState } },
      )

      // Start fresh to activate the session
      act(() => {
        result.current.startFresh()
      })

      // Trigger a state change by re-rendering with updated state
      const updatedState: WizardState = {
        ...initialState,
        reflection: createCompletedReflection(),
      }

      rerender({ state: updatedState })

      // Read from localStorage
      const raw = localStorage.getItem(STORAGE_KEY)
      expect(raw).not.toBeNull()

      const stored = JSON.parse(raw!)
      expect(stored.state.reflection.energizers).toEqual(updatedState.reflection.energizers)
      expect(stored.state.reflection.drainers).toEqual(updatedState.reflection.drainers)
      expect(stored.state.reflection.codingIn5Years).toBe(updatedState.reflection.codingIn5Years)
      expect(stored.state.reflection.learningInterests).toEqual(updatedState.reflection.learningInterests)
    })

    it('loads a previously saved session via resumeSession', () => {
      const savedState = createFullWizardState()
      const storedSession = {
        version: 1,
        timestamp: Date.now(),
        state: savedState,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(storedSession))

      const onLoadState = vi.fn()

      const { result } = renderHook(() =>
        useSessionPersistence(createInitialWizardState(), onLoadState),
      )

      expect(result.current.sessionStatus.type).toBe('found-session')

      act(() => {
        result.current.resumeSession()
      })

      expect(onLoadState).toHaveBeenCalledWith(savedState)
      expect(result.current.sessionStatus.type).toBe('active')
    })

    it('returns no-session when localStorage is empty', () => {
      const onLoadState = vi.fn()

      const { result } = renderHook(() =>
        useSessionPersistence(createInitialWizardState(), onLoadState),
      )

      expect(result.current.sessionStatus.type).toBe('no-session')
    })
  })

  describe('version counter increments on each save', () => {
    it('increments version on each state change', () => {
      const state1 = createInitialWizardState()
      const onLoadState = vi.fn()

      const { result, rerender } = renderHook(
        ({ state }) => useSessionPersistence(state, onLoadState),
        { initialProps: { state: state1 } },
      )

      // Activate session
      act(() => {
        result.current.startFresh()
      })

      // First state change
      const state2: WizardState = {
        ...state1,
        reflection: { ...state1.reflection, energizers: ['Building UI'] },
      }
      rerender({ state: state2 })

      const raw1 = localStorage.getItem(STORAGE_KEY)
      const stored1 = JSON.parse(raw1!)
      const version1 = stored1.version

      // Second state change
      const state3: WizardState = {
        ...state2,
        reflection: { ...state2.reflection, drainers: ['Meetings'] },
      }
      rerender({ state: state3 })

      const raw2 = localStorage.getItem(STORAGE_KEY)
      const stored2 = JSON.parse(raw2!)
      const version2 = stored2.version

      expect(version2).toBeGreaterThan(version1)

      // Third state change
      const state4: WizardState = {
        ...state3,
        reflection: { ...state3.reflection, codingIn5Years: 'yes' },
      }
      rerender({ state: state4 })

      const raw3 = localStorage.getItem(STORAGE_KEY)
      const stored3 = JSON.parse(raw3!)
      const version3 = stored3.version

      expect(version3).toBeGreaterThan(version2)
    })

    it('starts version from 0 after startFresh', () => {
      const state = createInitialWizardState()
      const onLoadState = vi.fn()

      const { result, rerender } = renderHook(
        ({ s }) => useSessionPersistence(s, onLoadState),
        { initialProps: { s: state } },
      )

      act(() => {
        result.current.startFresh()
      })

      // Trigger first save
      const state2: WizardState = {
        ...state,
        reflection: { ...state.reflection, energizers: ['Building UI'] },
      }
      rerender({ s: state2 })

      const raw = localStorage.getItem(STORAGE_KEY)
      const stored = JSON.parse(raw!)

      // First save after startFresh should be version 1
      expect(stored.version).toBe(1)
    })
  })

  describe('conflict detection', () => {
    it('detects conflict when a higher-version entry appears via storage event', () => {
      const state = createInitialWizardState()
      const onLoadState = vi.fn()

      const { result, rerender } = renderHook(
        ({ s }) => useSessionPersistence(s, onLoadState),
        { initialProps: { s: state } },
      )

      // Activate the session
      act(() => {
        result.current.startFresh()
      })

      // Trigger a save so version becomes 1
      const state2: WizardState = {
        ...state,
        reflection: { ...state.reflection, energizers: ['Building UI'] },
      }
      rerender({ s: state2 })

      // The auto-save effect sets suppressNextStorageEventRef = true (to ignore
      // the StorageEvent triggered by its own write). Flush that flag by
      // dispatching a dummy storage event with the same key first.
      act(() => {
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: STORAGE_KEY,
            newValue: null,
          }),
        )
      })

      // Simulate a remote tab writing a higher-version entry
      const remoteState = createFullWizardState()
      const remoteSession = {
        version: 100,
        timestamp: Date.now(),
        state: remoteState,
      }

      act(() => {
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: STORAGE_KEY,
            newValue: JSON.stringify(remoteSession),
          }),
        )
      })

      expect(result.current.sessionStatus.type).toBe('conflict')
      if (result.current.sessionStatus.type === 'conflict') {
        expect(result.current.sessionStatus.remoteState).toEqual(remoteState)
      }
    })

    it('does not detect conflict for lower-version storage events', () => {
      const savedState = createFullWizardState()
      const storedSession = {
        version: 5,
        timestamp: Date.now(),
        state: savedState,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(storedSession))

      const onLoadState = vi.fn()

      const { result } = renderHook(() =>
        useSessionPersistence(createInitialWizardState(), onLoadState),
      )

      // Resume to activate (version will pick up 5 from stored)
      act(() => {
        result.current.resumeSession()
      })
      expect(result.current.sessionStatus.type).toBe('active')

      // Dispatch a storage event with a lower version
      const lowerVersionSession = {
        version: 3,
        timestamp: Date.now(),
        state: createInitialWizardState(),
      }

      act(() => {
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: STORAGE_KEY,
            newValue: JSON.stringify(lowerVersionSession),
          }),
        )
      })

      // Should remain active, no conflict
      expect(result.current.sessionStatus.type).toBe('active')
    })

    it('acceptRemote loads the remote state and returns to active', () => {
      const state = createInitialWizardState()
      const onLoadState = vi.fn()

      const { result, rerender } = renderHook(
        ({ s }) => useSessionPersistence(s, onLoadState),
        { initialProps: { s: state } },
      )

      // Activate
      act(() => {
        result.current.startFresh()
      })

      // Trigger a save
      const state2: WizardState = {
        ...state,
        reflection: { ...state.reflection, energizers: ['Building UI'] },
      }
      rerender({ s: state2 })

      // Flush the suppress flag from the auto-save
      act(() => {
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: STORAGE_KEY,
            newValue: null,
          }),
        )
      })

      // Create conflict
      const remoteState = createFullWizardState()
      const remoteSession = {
        version: 100,
        timestamp: Date.now(),
        state: remoteState,
      }

      act(() => {
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: STORAGE_KEY,
            newValue: JSON.stringify(remoteSession),
          }),
        )
      })

      expect(result.current.sessionStatus.type).toBe('conflict')

      // Accept the remote state
      act(() => {
        result.current.acceptRemote()
      })

      expect(onLoadState).toHaveBeenCalledWith(remoteState)
      expect(result.current.sessionStatus.type).toBe('active')
    })
  })

  describe('clearSession', () => {
    it('removes stored session from localStorage', () => {
      const state = createInitialWizardState()
      const onLoadState = vi.fn()

      const { result, rerender } = renderHook(
        ({ s }) => useSessionPersistence(s, onLoadState),
        { initialProps: { s: state } },
      )

      act(() => {
        result.current.startFresh()
      })

      // Trigger a save
      const state2: WizardState = {
        ...state,
        reflection: { ...state.reflection, energizers: ['Building UI'] },
      }
      rerender({ s: state2 })

      expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull()

      act(() => {
        result.current.clearSession()
      })

      expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    })
  })
})
