import { useState, useCallback, useMemo } from 'react'
import type { CareerPath, MatrixState, MatrixScore } from '../types'
import { MATRIX_CRITERIA } from '../types'
import { getApiKey, generateMatrixScores } from '../services/gemini'
import { ScoreCell } from './ScoreCell'
import { RankingChart } from './RankingChart'
import { SkeletonShimmer } from './SkeletonShimmer'
import { StaleStepBanner } from './StaleStepBanner'

interface DecisionMatrixStepProps {
  paths: CareerPath[]
  selectedPathIds: string[]
  matrix: MatrixState
  isStale: boolean
  onUpdateWeight: (criterionId: string, weight: number) => void
  onUpdateScore: (pathId: string, criterionId: string, score: number) => void
  onSetScores: (scores: Record<string, Record<string, MatrixScore>>) => void
  onComplete: () => void
  onBack: () => void
  canComplete: boolean
}

type LoadStatus = 'idle' | 'loading' | 'done' | 'error'

export function DecisionMatrixStep({
  paths,
  selectedPathIds,
  matrix,
  isStale,
  onUpdateWeight,
  onUpdateScore,
  onSetScores,
  onComplete,
  onBack,
  canComplete,
}: DecisionMatrixStepProps) {
  const [loadStatus, setLoadStatus] = useState<LoadStatus>(
    hasAllScores(matrix.scores, selectedPathIds) ? 'done' : 'idle',
  )
  const [error, setError] = useState('')
  const [scenarioMode, setScenarioMode] = useState(false)
  const [activeScenario, setActiveScenario] = useState<string | null>(null)
  const [baseWeights] = useState(() => ({ ...matrix.weights }))

  const PRESET_SCENARIOS: { name: string; weights: Record<string, number> }[] = [
    { name: "What if money didn't matter?", weights: { salary: 1 } },
    { name: 'What if I prioritize growth?', weights: { learning: 5 } },
    { name: 'What if I need to switch fast?', weights: { transition: 5 } },
    { name: 'What if stability is everything?', weights: { demand: 5, creative: 1 } },
  ]

  const applyScenario = (scenario: typeof PRESET_SCENARIOS[0]) => {
    setActiveScenario(scenario.name)
    for (const [id, weight] of Object.entries(scenario.weights)) {
      onUpdateWeight(id, weight)
    }
  }

  const resetScenario = () => {
    setActiveScenario(null)
    for (const [id, weight] of Object.entries(baseWeights)) {
      onUpdateWeight(id, weight)
    }
  }

  const selectedPaths = useMemo(
    () => selectedPathIds.map((id) => paths.find((p) => p.id === id)!).filter(Boolean),
    [paths, selectedPathIds],
  )

  const prefillScores = useCallback(async () => {
    const apiKey = getApiKey()
    if (!apiKey) return

    setLoadStatus('loading')
    setError('')
    try {
      const scores = await generateMatrixScores(apiKey, selectedPaths)
      onSetScores(scores)
      setLoadStatus('done')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate scores'
      setError(msg)
      setLoadStatus('error')
    }
  }, [selectedPaths, onSetScores])

  // Calculate weighted totals
  const rankings = useMemo(() => {
    const results = selectedPaths.map((path) => {
      let total = 0
      for (const c of MATRIX_CRITERIA) {
        const weight = matrix.weights[c.id] ?? 3
        const score = matrix.scores[path.id]?.[c.id]?.score ?? 0
        total += weight * score
      }
      return { pathId: path.id, title: path.title, total }
    })
    results.sort((a, b) => b.total - a.total)
    return results
  }, [selectedPaths, matrix])

  const maxTotal = rankings.length > 0 ? rankings[0].total : 0
  const topPathId = rankings.length > 0 && maxTotal > 0 ? rankings[0].pathId : null

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="mb-6 space-y-2">
        <h2 className="text-2xl font-light tracking-tight text-slate-800">
          Compare your paths
        </h2>
        <p className="text-sm text-slate-400">
          Adjust weights for what matters most, then review or override scores.
        </p>
      </div>

      {/* Stale data warning */}
      {isStale && hasAllScores(matrix.scores, selectedPathIds) && loadStatus !== 'loading' && (
        <StaleStepBanner onRegenerate={prefillScores} />
      )}

      {/* Pre-fill button */}
      {loadStatus === 'idle' && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="flex-1 text-sm text-slate-500">
            Let AI suggest scores for each path?
          </p>
          <button
            onClick={prefillScores}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-indigo-700"
          >
            Auto-score
          </button>
        </div>
      )}

      {loadStatus === 'loading' && (
        <div className="mb-6 space-y-3 rounded-xl border border-indigo-100 bg-indigo-50/50 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:300ms]" />
            </div>
            <span className="text-sm text-indigo-600">Scoring paths...</span>
          </div>
          <SkeletonShimmer lines={4} />
        </div>
      )}

      {loadStatus === 'error' && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={prefillScores}
            className="mt-1 text-sm font-medium text-red-700 underline hover:text-red-800"
          >
            Retry
          </button>
        </div>
      )}

      {/* Matrix table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="px-4 py-3 text-left font-medium text-slate-500">Criterion</th>
              <th className="w-20 px-3 py-3 text-center font-medium text-slate-400">Weight</th>
              {selectedPaths.map((p) => (
                <th
                  key={p.id}
                  className={`px-3 py-3 text-center font-medium ${
                    p.id === topPathId ? 'text-indigo-700' : 'text-slate-600'
                  }`}
                >
                  <span className="line-clamp-2 text-xs">{p.title}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MATRIX_CRITERIA.map((criterion) => (
              <tr key={criterion.id}>
                <td className="border-b border-slate-100 px-4 py-3">
                  <span className="text-sm text-slate-700">{criterion.label}</span>
                </td>
                <td className="border-b border-slate-100 px-3 py-3">
                  <div className="flex flex-col items-center gap-1">
                    <input
                      type="range"
                      min={1}
                      max={5}
                      value={matrix.weights[criterion.id] ?? 3}
                      onChange={(e) => onUpdateWeight(criterion.id, Number(e.target.value))}
                      className="h-1 w-14 cursor-pointer appearance-none rounded-full bg-slate-200 accent-indigo-500"
                    />
                    <span className="text-[10px] tabular-nums text-slate-400">
                      {matrix.weights[criterion.id] ?? 3}
                    </span>
                  </div>
                </td>
                {selectedPaths.map((p) => (
                  <ScoreCell
                    key={`${p.id}-${criterion.id}`}
                    value={matrix.scores[p.id]?.[criterion.id]}
                    isTopPath={p.id === topPathId}
                    onChange={(score) => onUpdateScore(p.id, criterion.id, score)}
                  />
                ))}
              </tr>
            ))}

            {/* Weighted totals row */}
            <tr className="bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-700" colSpan={2}>
                Weighted Total
              </td>
              {selectedPaths.map((p) => {
                const r = rankings.find((r) => r.pathId === p.id)
                const isTop = p.id === topPathId
                return (
                  <td
                    key={p.id}
                    className={`px-3 py-3 text-center tabular-nums ${
                      isTop ? 'font-semibold text-indigo-700' : 'font-medium text-slate-600'
                    }`}
                  >
                    {r?.total.toFixed(1) ?? '—'}
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Rescore button */}
      {loadStatus === 'done' && (
        <button
          onClick={prefillScores}
          className="mt-4 self-center text-sm text-slate-400 transition-colors hover:text-indigo-600"
        >
          Re-score with AI
        </button>
      )}

      {/* Scenario modeling */}
      <div className="mt-4 space-y-3">
        <button
          onClick={() => {
            const next = !scenarioMode
            setScenarioMode(next)
            if (!next && activeScenario) resetScenario()
          }}
          className={`text-sm font-medium transition-colors ${
            scenarioMode ? 'text-indigo-600 hover:text-indigo-700' : 'text-slate-400 hover:text-indigo-600'
          }`}
        >
          {scenarioMode ? 'Hide scenarios' : 'Explore scenarios'}
        </button>

        {scenarioMode && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {PRESET_SCENARIOS.map((scenario) => (
                <button
                  key={scenario.name}
                  onClick={() => applyScenario(scenario)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    activeScenario === scenario.name
                      ? 'bg-indigo-600 text-white'
                      : 'border border-slate-300 text-slate-600 hover:border-indigo-400 hover:text-indigo-600'
                  }`}
                >
                  {scenario.name}
                </button>
              ))}
              {activeScenario && (
                <button
                  onClick={resetScenario}
                  className="rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-500 transition-colors hover:border-red-400 hover:text-red-700"
                >
                  Reset
                </button>
              )}
            </div>

            {rankings.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-medium text-slate-500">Sensitivity analysis</p>
                <p className="mt-1 text-sm text-slate-600">
                  {(() => {
                    const wins: Record<string, number> = {}
                    const total = PRESET_SCENARIOS.length
                    for (const scenario of PRESET_SCENARIOS) {
                      const tempWeights = { ...matrix.weights, ...scenario.weights }
                      let topId = ''
                      let topTotal = -1
                      for (const pid of selectedPathIds) {
                        let t = 0
                        for (const c of MATRIX_CRITERIA) {
                          t += (tempWeights[c.id] ?? 3) * (matrix.scores[pid]?.[c.id]?.score ?? 0)
                        }
                        if (t > topTotal) { topTotal = t; topId = pid }
                      }
                      wins[topId] = (wins[topId] ?? 0) + 1
                    }
                    const currentTop = rankings[0]
                    const currentWins = wins[currentTop.pathId] ?? 0
                    if (currentWins === total) {
                      return `${currentTop.title} stays #1 in all ${total} scenarios — it's a robust choice.`
                    } else if (currentWins >= total / 2) {
                      return `${currentTop.title} stays #1 in ${currentWins}/${total} scenarios — a solid but not unshakeable pick.`
                    } else {
                      const topWinner = Object.entries(wins).sort(([,a], [,b]) => b - a)[0]
                      const winnerPath = paths.find((p) => p.id === topWinner[0])
                      return `${currentTop.title} only wins ${currentWins}/${total} scenarios. ${winnerPath?.title ?? 'Another path'} wins more often — consider what's really driving your preference.`
                    }
                  })()}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ranking chart */}
      <div className="mt-8">
        <RankingChart rankings={rankings} maxTotal={maxTotal} />
      </div>

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
          Generate action plan
        </button>
      </div>
    </div>
  )
}

function hasAllScores(
  scores: Record<string, Record<string, MatrixScore>>,
  pathIds: string[],
): boolean {
  return pathIds.every(
    (pid) =>
      scores[pid] && MATRIX_CRITERIA.every((c) => scores[pid][c.id]?.score > 0),
  )
}
