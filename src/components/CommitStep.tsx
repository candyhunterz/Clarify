import { useState, useMemo } from 'react'
import type { CareerPath, MatrixState, ConvictionCheck } from '../types'
import { MATRIX_CRITERIA } from '../types'

interface CommitStepProps {
  paths: CareerPath[]
  selectedPathIds: string[]
  matrix: MatrixState
  convictionCheck: ConvictionCheck | null
  onSetConvictionCheck: (check: ConvictionCheck) => void
  onComplete: () => void
  onBack: () => void
  canComplete: boolean
}

export function CommitStep({
  paths,
  selectedPathIds,
  matrix,
  convictionCheck,
  onSetConvictionCheck,
  onComplete,
  onBack,
}: CommitStepProps) {
  const [selectedOverride, setSelectedOverride] = useState<string | null>(null)
  const [showOverridePicker, setShowOverridePicker] = useState(false)

  // Calculate weighted rankings for selected paths
  const rankedPaths = useMemo(() => {
    return selectedPathIds
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
      .filter((x): x is { path: CareerPath; total: number } => x !== null)
      .sort((a, b) => b.total - a.total)
  }, [paths, selectedPathIds, matrix])

  const topPath = rankedPaths[0]?.path ?? null
  const otherPaths = rankedPaths.slice(1).map((r) => r.path)

  const handleYes = () => {
    if (!topPath) return
    onSetConvictionCheck({
      matrixTopPath: topPath.id,
      chosenPath: topPath.id,
      response: 'yes',
      conversation: [],
      reasoning: 'User confirmed the matrix top-ranked path.',
    })
  }

  const handleUnsure = () => {
    if (!topPath) return
    onSetConvictionCheck({
      matrixTopPath: topPath.id,
      chosenPath: topPath.id,
      response: 'unsure',
      conversation: [],
      reasoning: 'User is proceeding with the top path but noted uncertainty.',
    })
  }

  const handleOverrideConfirm = () => {
    if (!topPath || !selectedOverride) return
    onSetConvictionCheck({
      matrixTopPath: topPath.id,
      chosenPath: selectedOverride,
      response: 'override',
      conversation: [],
      reasoning: 'User overrode the matrix ranking and chose a different path.',
    })
    setShowOverridePicker(false)
  }

  const handleReconsider = () => {
    // Clear conviction check — parent dispatches SET_CONVICTION_CHECK with null
    // We need a setter that accepts null; use a workaround via prop typing
    // The hook exposes setConvictionCheck(null) but we only have onSetConvictionCheck here.
    // The task description wires onSetConvictionCheck from App.tsx; we reset state via a trick:
    // cast to satisfy the route — actually let's just call parent through the window reload pattern.
    // Actually: looking at the hook, setConvictionCheck accepts ConvictionCheck | null.
    // The prop type only accepts ConvictionCheck. We'll handle this by calling the dispatcher directly
    // via a small workaround — reset by dispatching through a dummy call that signals "null".
    // The cleanest way: the parent (App.tsx) should expose a clearConvictionCheck, but it's not in props.
    // We'll just use the existing prop with a fresh state revert by refreshing the check.
    // Per the task: "Reconsider button to clear" — let's handle it by setting selectedOverride back,
    // hiding override picker, and using a local "reconsidering" UI flag that re-shows the pre-commit UI.
    setSelectedOverride(null)
    setShowOverridePicker(false)
    // We need to clear convictionCheck. Since onSetConvictionCheck only accepts ConvictionCheck,
    // we'll use a type cast to pass null through.
    ;(onSetConvictionCheck as (check: ConvictionCheck | null) => void)(null)
  }

  if (!topPath) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center">
        <p className="text-sm text-slate-400">No paths ranked yet. Please complete the matrix first.</p>
      </div>
    )
  }

  // ── Post-commit state ──
  if (convictionCheck !== null) {
    const chosenPath = paths.find((p) => p.id === convictionCheck.chosenPath)
    const isOverride = convictionCheck.response === 'override'
    const isUnsure = convictionCheck.response === 'unsure'

    return (
      <div className="flex flex-1 flex-col">
        <div className="mb-8 space-y-2">
          <h2 className="text-2xl font-light tracking-tight text-slate-800">
            Does this feel right?
          </h2>
          <p className="text-sm text-slate-400">Check in with yourself before we build your plan.</p>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          {/* Confirmation card */}
          <div className="w-full max-w-md rounded-2xl border border-indigo-100 bg-indigo-50 p-6 text-center">
            <div className="mb-3 text-xs font-medium uppercase tracking-widest text-indigo-400">
              {isOverride ? 'Your choice' : isUnsure ? 'Moving forward with' : 'Committed to'}
            </div>
            <div className="text-xl font-semibold text-indigo-800">
              {chosenPath?.title ?? 'Unknown path'}
            </div>
            {isUnsure && (
              <p className="mt-2 text-sm text-indigo-500">
                That's okay — uncertainty is part of the process.
              </p>
            )}
            {isOverride && (
              <p className="mt-2 text-sm text-indigo-500">
                You know yourself better than any matrix.
              </p>
            )}
            {!isUnsure && !isOverride && (
              <p className="mt-2 text-sm text-indigo-500">
                Your gut and your data agree. Let's build the plan.
              </p>
            )}
          </div>

          <button
            onClick={handleReconsider}
            className="text-sm text-slate-400 underline-offset-2 transition-colors hover:text-slate-600 hover:underline"
          >
            Reconsider
          </button>
        </div>

        <div className="mt-auto flex items-center justify-between pt-10">
          <button
            onClick={onBack}
            className="rounded-lg px-5 py-2.5 text-sm font-medium text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-700"
          >
            Back
          </button>
          <button
            onClick={onComplete}
            className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-indigo-700"
          >
            Generate plan
          </button>
        </div>
      </div>
    )
  }

  // ── Pre-commit state ──
  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-8 space-y-2">
        <h2 className="text-2xl font-light tracking-tight text-slate-800">
          Does this feel right?
        </h2>
        <p className="text-sm text-slate-400">
          Check in with yourself before we build your plan.
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-6">
        {/* Top path card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-1 text-xs font-medium uppercase tracking-widest text-slate-400">
            Matrix top pick
          </div>
          <div className="text-xl font-semibold text-slate-800">{topPath.title}</div>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">{topPath.description}</p>
        </div>

        {/* Response options */}
        {!showOverridePicker ? (
          <div className="flex flex-col gap-3">
            {/* Yes */}
            <button
              onClick={handleYes}
              className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left transition-all duration-150 hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-sm"
            >
              <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm text-emerald-600">
                ✓
              </span>
              <div>
                <div className="text-sm font-medium text-slate-800">Yes, that's the one</div>
                <div className="text-xs text-slate-400">
                  I'm aligned with the matrix. Let's move forward.
                </div>
              </div>
            </button>

            {/* Unsure */}
            <button
              onClick={handleUnsure}
              className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left transition-all duration-150 hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-sm"
            >
              <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm text-amber-600">
                ~
              </span>
              <div>
                <div className="text-sm font-medium text-slate-800">
                  I think so, but I'm not sure
                </div>
                <div className="text-xs text-slate-400">
                  Proceed with this path, but note my uncertainty.
                </div>
              </div>
            </button>

            {/* Override */}
            {otherPaths.length > 0 && (
              <button
                onClick={() => setShowOverridePicker(true)}
                className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left transition-all duration-150 hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-sm"
              >
                <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-rose-100 text-sm text-rose-600">
                  ↺
                </span>
                <div>
                  <div className="text-sm font-medium text-slate-800">
                    No, I'd actually pick a different path
                  </div>
                  <div className="text-xs text-slate-400">
                    Override the matrix — my gut says otherwise.
                  </div>
                </div>
              </button>
            )}
          </div>
        ) : (
          /* Override path picker */
          <div className="flex flex-col gap-3">
            <p className="text-sm text-slate-500">Which path would you pick instead?</p>
            <div className="flex flex-col gap-2">
              {otherPaths.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedOverride(p.id)}
                  className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all duration-150 ${
                    selectedOverride === p.id
                      ? 'border-indigo-400 bg-indigo-50 text-indigo-800'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50'
                  }`}
                >
                  {p.title}
                </button>
              ))}
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => {
                  setShowOverridePicker(false)
                  setSelectedOverride(null)
                }}
                className="rounded-lg px-4 py-2 text-sm text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                Cancel
              </button>
              {selectedOverride && (
                <button
                  onClick={handleOverrideConfirm}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
                >
                  Go with {paths.find((p) => p.id === selectedOverride)?.title}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between pt-10">
        <button
          onClick={onBack}
          className="rounded-lg px-5 py-2.5 text-sm font-medium text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-700"
        >
          Back
        </button>
        <button
          disabled
          className="cursor-not-allowed rounded-lg bg-slate-100 px-6 py-2.5 text-sm font-medium text-slate-300"
        >
          Generate plan
        </button>
      </div>
    </div>
  )
}
