import type { CareerPath, MatrixState, ConvictionCheck } from '../types'

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
  onComplete,
  onBack,
  canComplete,
}: CommitStepProps) {
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

      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-slate-400">Conviction check coming soon.</p>
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
          disabled={!canComplete}
          className={`rounded-lg px-6 py-2.5 text-sm font-medium transition-all duration-200 ${
            canComplete
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'cursor-not-allowed bg-slate-100 text-slate-300'
          }`}
        >
          Generate plan
        </button>
      </div>
    </div>
  )
}
