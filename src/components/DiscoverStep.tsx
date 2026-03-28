import type { ReflectionAnswers, InsightProfile, ValuesHierarchy } from '../types'

interface DiscoverStepProps {
  reflection: ReflectionAnswers
  insightProfile: InsightProfile
  valuesHierarchy: ValuesHierarchy
  isStale: boolean
  onSetInsightProfile: (profile: InsightProfile) => void
  onSetValuesHierarchy: (hierarchy: ValuesHierarchy) => void
  onComplete: () => void
  onBack: () => void
  canComplete: boolean
}

export function DiscoverStep({
  insightProfile,
  onComplete,
  onBack,
  canComplete,
}: DiscoverStepProps) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-8 space-y-2">
        <h2 className="text-2xl font-light tracking-tight text-slate-800">
          Let's dig deeper
        </h2>
        <p className="text-sm text-slate-400">
          A short conversation to surface what really matters to you.
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-slate-400">
          {insightProfile.narrative
            ? 'Conversation complete. Review your values below.'
            : 'AI conversation coming soon.'}
        </p>
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
          Continue
        </button>
      </div>
    </div>
  )
}
