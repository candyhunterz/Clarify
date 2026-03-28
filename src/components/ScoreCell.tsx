import { useState } from 'react'
import type { MatrixScore } from '../types'

interface ScoreCellProps {
  value: MatrixScore | undefined
  isTopPath: boolean
  onChange: (score: number) => void
}

export function ScoreCell({ value, isTopPath, onChange }: ScoreCellProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const score = value?.score ?? 0
  const rationale = value?.rationale ?? ''
  const isOverridden = value?.isOverridden ?? false

  return (
    <td
      className={`relative border-b border-slate-100 px-3 py-3 text-center ${
        isTopPath ? 'bg-indigo-50/50' : ''
      }`}
    >
      <div className="flex items-center justify-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`h-7 w-7 rounded-md text-xs font-medium transition-all duration-150 ${
              n === score
                ? isOverridden
                  ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-300'
                  : 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300'
                : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'
            }`}
          >
            {n}
          </button>
        ))}
      </div>

      {rationale && (
        <div className="mt-1 flex justify-center">
          <button
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onClick={() => setShowTooltip(!showTooltip)}
            className="text-[10px] text-slate-300 hover:text-slate-500"
          >
            {isOverridden ? 'overridden' : 'why?'}
          </button>

          {showTooltip && (
            <div className="absolute top-full z-10 mt-1 w-48 rounded-lg border border-slate-200 bg-white p-2.5 text-left text-xs leading-relaxed text-slate-600 shadow-lg">
              {rationale}
            </div>
          )}
        </div>
      )}
    </td>
  )
}
