import { useState, useRef, useCallback, useMemo } from 'react'
import type { CareerPath, MatrixState, ActionPlan } from '../types'
import { MATRIX_CRITERIA } from '../types'
import { getApiKey, streamActionPlan, streamEnhancedActionPlan } from '../services/gemini'
import { ActionPlanDisplay } from './ActionPlanDisplay'
import { SkeletonShimmer } from './SkeletonShimmer'
import { StaleStepBanner } from './StaleStepBanner'

interface ActionPlanStepProps {
  paths: CareerPath[]
  selectedPathIds: string[]
  matrix: MatrixState
  actionPlan: ActionPlan | null
  isStale: boolean
  onSetPlan: (plan: ActionPlan | null) => void
  onComplete: () => void
  onBack: () => void
  canComplete: boolean
  insightProfile?: import('../types').InsightProfile
  convictionCheck?: import('../types').ConvictionCheck | null
}

type Status = 'idle' | 'streaming' | 'done' | 'error'

export function ActionPlanStep({
  paths,
  selectedPathIds,
  matrix,
  actionPlan,
  isStale,
  onSetPlan,
  onComplete,
  onBack,
  canComplete,
  insightProfile,
  convictionCheck,
}: ActionPlanStepProps) {
  const [status, setStatus] = useState<Status>(actionPlan ? 'done' : 'idle')
  const [streamText, setStreamText] = useState('')
  const [error, setError] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  // Determine the top-ranked path
  const topPath = useMemo(() => {
    if (convictionCheck?.chosenPath) {
      return paths.find((p) => p.id === convictionCheck.chosenPath) ?? null
    }
    const ranked = selectedPathIds
      .map((pid) => {
        const p = paths.find((p) => p.id === pid)
        if (!p) return null
        let total = 0
        for (const c of MATRIX_CRITERIA) {
          const w = matrix.weights[c.id] ?? 3
          const s = matrix.scores[pid]?.[c.id]?.score ?? 0
          total += w * s
        }
        return { path: p, total }
      })
      .filter(Boolean)
      .sort((a, b) => b!.total - a!.total)

    return ranked[0]?.path ?? null
  }, [paths, selectedPathIds, matrix, convictionCheck])

  const generate = useCallback(() => {
    const apiKey = getApiKey()
    if (!apiKey || !topPath) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setStatus('streaming')
    setError('')
    setStreamText('')
    onSetPlan(null)

    const callbacks = {
      onText: (text: string) => {
        if (!controller.signal.aborted) setStreamText(text)
      },
      onPlan: (plan: ActionPlan) => {
        if (!controller.signal.aborted) onSetPlan(plan)
      },
      onError: (msg: string) => {
        setError(msg)
        setStatus('error')
      },
      onDone: () => {
        if (!controller.signal.aborted) setStatus('done')
      },
    }

    void (insightProfile?.narrative
      ? streamEnhancedActionPlan(apiKey, topPath, insightProfile, convictionCheck ?? null, callbacks, controller.signal)
      : streamActionPlan(apiKey, topPath, callbacks, controller.signal))
  }, [topPath, onSetPlan, insightProfile, convictionCheck])

  const cancel = () => {
    abortRef.current?.abort()
    abortRef.current = null
    setStatus(actionPlan ? 'done' : 'idle')
  }

  const isStreaming = status === 'streaming'

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="mb-8 space-y-2">
        <h2 className="text-2xl font-light tracking-tight text-slate-800">
          Your action plan
        </h2>
        {topPath && (
          <p className="text-sm text-slate-400">
            A 30/60/90 day roadmap for{' '}
            <span className="font-medium text-indigo-600">{topPath.title}</span>
          </p>
        )}
      </div>

      {/* Stale data warning */}
      {isStale && actionPlan && !isStreaming && (
        <StaleStepBanner onRegenerate={generate} />
      )}

      {/* Generate button */}
      {status === 'idle' && (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            {topPath && (
              <p className="mb-4 text-sm text-slate-500">
                Based on your rankings, we'll create a plan for{' '}
                <span className="font-medium text-slate-700">{topPath.title}</span>
              </p>
            )}
            <button
              onClick={generate}
              className="rounded-xl bg-indigo-600 px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
            >
              Generate action plan
            </button>
          </div>
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

      {/* Streaming state */}
      {isStreaming && (
        <>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex gap-1">
              <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-400 [animation-delay:0ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-400 [animation-delay:150ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-400 [animation-delay:300ms]" />
            </div>
            <span className="text-sm text-slate-400">Building your plan...</span>
            <button
              onClick={cancel}
              className="ml-auto text-xs text-slate-400 hover:text-slate-600"
            >
              Cancel
            </button>
          </div>
          {streamText ? (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <pre className="whitespace-pre-wrap text-sm leading-relaxed text-slate-500">
                {streamText}
              </pre>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <SkeletonShimmer lines={6} />
            </div>
          )}
        </>
      )}

      {/* Completed plan display */}
      {status === 'done' && actionPlan && (
        <>
          <ActionPlanDisplay plan={actionPlan} />
          <button
            onClick={generate}
            className="mt-6 self-center text-sm text-slate-400 transition-colors hover:text-indigo-600"
          >
            Regenerate plan
          </button>
        </>
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
          View summary
        </button>
      </div>
    </div>
  )
}
