import { useEffect, useRef, useCallback, useState } from 'react'
import type { WizardState } from '../types'

const STORAGE_KEY = 'clarify-session'

interface StoredSession {
  version: number
  timestamp: number
  state: WizardState
}

export type SessionStatus =
  | { type: 'no-session' }
  | { type: 'found-session'; savedState: WizardState }
  | { type: 'active' }
  | { type: 'conflict'; remoteState: WizardState }

function readStoredSession(): StoredSession | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredSession
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

export function useSessionPersistence(
  state: WizardState,
  onLoadState: (state: WizardState) => void,
) {
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>(() => {
    const stored = readStoredSession()
    return stored ? { type: 'found-session', savedState: stored.state } : { type: 'no-session' }
  })
  const versionRef = useRef(readStoredSession()?.version ?? 0)
  const isInitializedRef = useRef(false)
  const suppressNextStorageEventRef = useRef(false)

  // Auto-save on state changes (only after initialized)
  useEffect(() => {
    if (!isInitializedRef.current) return

    versionRef.current += 1
    suppressNextStorageEventRef.current = true
    const session: StoredSession = {
      version: versionRef.current,
      timestamp: Date.now(),
      state,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  }, [state])

  // Cross-tab conflict detection via storage event
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY || !isInitializedRef.current) return

      if (suppressNextStorageEventRef.current) {
        suppressNextStorageEventRef.current = false
        return
      }

      if (!e.newValue) return

      try {
        const remote: StoredSession = JSON.parse(e.newValue)
        if (remote.version > versionRef.current) {
          setSessionStatus({ type: 'conflict', remoteState: remote.state })
        }
      } catch {
        // Ignore malformed data
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const resumeSession = useCallback(() => {
    if (sessionStatus.type === 'found-session') {
      onLoadState(sessionStatus.savedState)
    }
    isInitializedRef.current = true
    setSessionStatus({ type: 'active' })
  }, [sessionStatus, onLoadState])

  const startFresh = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    versionRef.current = 0
    isInitializedRef.current = true
    setSessionStatus({ type: 'active' })
  }, [])

  const acceptRemote = useCallback(() => {
    if (sessionStatus.type === 'conflict') {
      onLoadState(sessionStatus.remoteState)
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        try {
          const stored: StoredSession = JSON.parse(raw)
          versionRef.current = stored.version
        } catch {
          // keep current version
        }
      }
    }
    setSessionStatus({ type: 'active' })
  }, [sessionStatus, onLoadState])

  const keepCurrent = useCallback(() => {
    // Force save current state to override remote
    versionRef.current += 1
    suppressNextStorageEventRef.current = true
    const session: StoredSession = {
      version: versionRef.current,
      timestamp: Date.now(),
      state,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    setSessionStatus({ type: 'active' })
  }, [state])

  const clearSession = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    versionRef.current = 0
  }, [])

  return {
    sessionStatus,
    resumeSession,
    startFresh,
    acceptRemote,
    keepCurrent,
    clearSession,
  }
}
