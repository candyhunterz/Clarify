import { useState, useRef, useCallback } from 'react'
import type { ReflectionAnswers, CareerPath } from '../types'
import { getApiKey, saveApiKey, hasEnvApiKey, streamCareerPaths } from '../services/gemini'
import { ApiKeyModal } from './ApiKeyModal'
import { PathCard } from './PathCard'
import { PathExplorePanel } from './PathExplorePanel'
import { SkeletonCard } from './SkeletonShimmer'
import { StaleStepBanner } from './StaleStepBanner'

interface PathGenerationStepProps {
  reflection: ReflectionAnswers
  paths: CareerPath[]
  selectedPathIds: string[]
  isStale: boolean
  onPathsUpdate: (paths: CareerPath[]) => void
  onTogglePath: (pathId: string) => void
  onComplete: () => void
  onBack: () => void
  canComplete: boolean
  // Exploration props
  insightProfile?: import('../types').InsightProfile
  pathExplorations?: import('../types').PathExploration[]
  onAddExplorationMessage?: (pathId: string, message: import('../types').ConversationMessage) => void
}

type Status = 'idle' | 'streaming' | 'done' | 'error' | 'cancelled'

export function PathGenerationStep({
  reflection,
  paths,
  selectedPathIds,
  isStale,
  onPathsUpdate,
  onTogglePath,
  onComplete,
  onBack,
  canComplete,
  insightProfile,
  pathExplorations,
  onAddExplorationMessage,
}: PathGenerationStepProps) {
  const [needsKey, setNeedsKey] = useState(!getApiKey() && !hasEnvApiKey())
  const [status, setStatus] = useState<Status>(paths.length > 0 ? 'done' : 'idle')
  const [error, setError] = useState('')
  const [exploringPathId, setExploringPathId] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const generate = useCallback(() => {
    const apiKey = getApiKey()
    if (!apiKey) {
      if (!hasEnvApiKey()) setNeedsKey(true)
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setStatus('streaming')
    setError('')
    onPathsUpdate([])

    streamCareerPaths(
      apiKey,
      reflection,
      {
        onPaths: (p) => {
          if (!controller.signal.aborted) onPathsUpdate(p)
        },
        onError: (msg) => {
          setError(msg)
          setStatus('error')
        },
        onDone: () => {
          if (!controller.signal.aborted) setStatus('done')
        },
      },
      controller.signal,
    )
  }, [reflection, onPathsUpdate])

  const cancel = () => {
    abortRef.current?.abort()
    abortRef.current = null
    setStatus(paths.length > 0 ? 'cancelled' : 'idle')
  }

  const handleKeySubmit = (key: string) => {
    saveApiKey(key)
    setNeedsKey(false)
  }

  const isStreaming = status === 'streaming'
  const showSelection = paths.length > 0

  return (
    <div className="flex flex-1 flex-col">
      {needsKey && <ApiKeyModal onSubmit={handleKeySubmit} />}

      {/* Header */}
      <div className="mb-8 space-y-2">
        <h2 className="text-2xl font-light tracking-tight text-slate-800">
          Your career paths
        </h2>
        <p className="text-sm text-slate-400">
          {isStreaming
            ? 'Generating personalized paths based on your reflection...'
            : showSelection
              ? `Select 2–4 paths to compare. ${selectedPathIds.length} selected.`
              : 'Ready to explore possibilities based on your reflection.'}
        </p>
      </div>

      {/* Stale data warning */}
      {isStale && paths.length > 0 && !isStreaming && (
        <StaleStepBanner onRegenerate={generate} />
      )}

      {/* Actions */}
      {status === 'idle' && paths.length === 0 && (
        <div className="flex flex-1 items-center justify-center">
          <button
            onClick={generate}
            className="rounded-xl bg-indigo-600 px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            Generate paths
          </button>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={generate}
            className="mt-2 text-sm font-medium text-red-700 underline hover:text-red-800"
          >
            Retry
          </button>
        </div>
      )}

      {/* Streaming indicator */}
      {isStreaming && (
        <div className="mb-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-400 [animation-delay:0ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-400 [animation-delay:150ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-400 [animation-delay:300ms]" />
            </div>
            <span className="text-sm text-slate-400">Thinking...</span>
            <button
              onClick={cancel}
              className="ml-auto text-xs text-slate-400 hover:text-slate-600"
            >
              Cancel
            </button>
          </div>
          {paths.length === 0 && (
            <div className="space-y-4">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          )}
        </div>
      )}

      {/* Path cards */}
      {showSelection && (
        <div className="space-y-4">
          {paths.map((path) => {
            const exploration = pathExplorations?.find((e) => e.pathId === path.id)
            return (
              <PathCard
                key={path.id}
                path={path}
                isSelected={selectedPathIds.includes(path.id)}
                selectionCount={selectedPathIds.length}
                onToggle={() => onTogglePath(path.id)}
                explorationCount={exploration?.messages.filter((m) => m.role === 'user').length}
                onExplore={onAddExplorationMessage ? () => setExploringPathId(path.id) : undefined}
              />
            )
          })}
        </div>
      )}

      {/* Cancelled state */}
      {status === 'cancelled' && paths.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-700">
            Generation was cancelled. You can work with the paths above or{' '}
            <button
              onClick={generate}
              className="font-medium underline hover:text-amber-800"
            >
              regenerate
            </button>
            .
          </p>
        </div>
      )}

      {/* Regenerate button when done */}
      {(status === 'done' || status === 'cancelled') && paths.length > 0 && (
        <button
          onClick={generate}
          className="mt-6 self-center text-sm text-slate-400 transition-colors hover:text-indigo-600"
        >
          Regenerate paths
        </button>
      )}

      {/* Navigation */}
      <div className="mt-auto flex items-center justify-between pt-10">
        <button
          onClick={onBack}
          className="rounded-lg px-5 py-2.5 text-sm font-medium text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-700"
        >
          Back
        </button>

        <button
          onClick={onComplete}
          disabled={!canComplete}
          className={`rounded-lg px-6 py-2.5 text-sm font-medium transition-all duration-200 ${
            canComplete
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'cursor-not-allowed bg-slate-100 text-slate-300'
          }`}
        >
          Compare selected
        </button>
      </div>

      {/* Path exploration panel */}
      {exploringPathId && onAddExplorationMessage && insightProfile && (
        <PathExplorePanel
          path={paths.find((p) => p.id === exploringPathId)!}
          allPaths={paths}
          insightProfile={insightProfile}
          messages={pathExplorations?.find((e) => e.pathId === exploringPathId)?.messages ?? []}
          onAddMessage={onAddExplorationMessage}
          onClose={() => setExploringPathId(null)}
        />
      )}
    </div>
  )
}
