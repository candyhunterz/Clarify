import type { CareerPath } from '../types'

interface PathCardProps {
  path: CareerPath
  isSelected: boolean
  selectionCount: number
  onToggle: () => void
}

const riskColors = {
  low: 'bg-emerald-50 text-emerald-700',
  medium: 'bg-amber-50 text-amber-700',
  high: 'bg-red-50 text-red-700',
}

export function PathCard({ path, isSelected, selectionCount, onToggle }: PathCardProps) {
  const canSelect = isSelected || selectionCount < 4

  return (
    <div
      className={`rounded-2xl border p-6 transition-all duration-200 ${
        isSelected
          ? 'border-indigo-300 bg-indigo-50/30 ring-1 ring-indigo-200'
          : 'border-slate-200 bg-white'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2.5">
            <h3 className="text-lg font-medium text-slate-800">{path.title}</h3>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${riskColors[path.riskLevel]}`}>
              {path.riskLevel} risk
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">{path.description}</p>
        </div>
        <button
          onClick={onToggle}
          disabled={!canSelect}
          className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-medium transition-all duration-200 ${
            isSelected
              ? 'border-indigo-300 bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
              : canSelect
                ? 'border-slate-200 bg-white text-slate-500 hover:border-indigo-300 hover:text-indigo-600'
                : 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300'
          }`}
        >
          {isSelected ? 'Selected' : 'Select'}
        </button>
      </div>

      {/* Why it fits */}
      <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3">
        <p className="text-xs font-medium text-slate-400">Why it fits you</p>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">{path.whyItFits}</p>
      </div>

      {/* Details grid */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-medium text-slate-400">Salary range</p>
          <p className="mt-0.5 text-sm text-slate-700">
            {path.salaryRange.entry} → {path.salaryRange.experienced}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-400">Timeline</p>
          <p className="mt-0.5 text-sm text-slate-700">{path.timeline}</p>
        </div>
      </div>

      {/* Skills */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-medium text-slate-400">Skills you have</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {path.skillsHave.map((s) => (
              <span key={s} className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs text-emerald-700">
                {s}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-400">Skills to build</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {path.skillsNeed.map((s) => (
              <span key={s} className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs text-amber-700">
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Day in the life */}
      <div className="mt-4">
        <p className="text-xs font-medium text-slate-400">A day in the life</p>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">{path.dayInTheLife}</p>
      </div>
    </div>
  )
}
