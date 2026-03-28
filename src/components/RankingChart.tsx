interface RankingChartProps {
  rankings: { pathId: string; title: string; total: number }[]
  maxTotal: number
}

export function RankingChart({ rankings, maxTotal }: RankingChartProps) {
  if (rankings.length === 0 || maxTotal === 0) return null

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-slate-500">Rankings</h3>
      <div className="space-y-2.5">
        {rankings.map((r, i) => {
          const pct = (r.total / maxTotal) * 100
          const isTop = i === 0
          return (
            <div key={r.pathId} className="space-y-1">
              <div className="flex items-baseline justify-between text-sm">
                <span className={isTop ? 'font-medium text-indigo-700' : 'text-slate-600'}>
                  {isTop && (
                    <span className="mr-1.5 inline-block rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600">
                      TOP
                    </span>
                  )}
                  {r.title}
                </span>
                <span className={`tabular-nums ${isTop ? 'font-medium text-indigo-700' : 'text-slate-400'}`}>
                  {r.total.toFixed(1)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isTop ? 'bg-indigo-500' : 'bg-slate-300'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
