import { useState, useMemo, useEffect } from 'react'
import type { WizardState } from '../types'
import { MATRIX_CRITERIA, PRIORITY_LABELS } from '../types'
import { ActionPlanDisplay } from './ActionPlanDisplay'
import { exportPdf } from '../services/pdf'
import { SkeletonShimmer } from './SkeletonShimmer'

interface SummaryStepProps {
  state: WizardState
  onBack: () => void
  onSetPersonalNarrative?: (narrative: string) => void
}

export function SummaryStep({ state, onBack, onSetPersonalNarrative }: SummaryStepProps) {
  const [emailInput, setEmailInput] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [narrativeLoading, setNarrativeLoading] = useState(false)

  const r = state.reflection

  useEffect(() => {
    if (
      state.personalNarrative ||
      narrativeLoading ||
      !onSetPersonalNarrative ||
      !state.insightProfile?.narrative ||
      !state.actionPlan
    ) {
      return
    }

    const run = async () => {
      setNarrativeLoading(true)
      try {
        const { getApiKey, generatePersonalNarrative } = await import('../services/gemini')
        const apiKey = getApiKey()
        if (!apiKey) return

        // Determine chosen path: from conviction check or action plan target
        const chosenPathId = state.convictionCheck?.chosenPath ?? state.actionPlan!.targetPathId
        const chosenPath = state.paths.find((p) => p.id === chosenPathId)
        if (!chosenPath) return

        // Determine matrix top path from conviction check
        const matrixTopPathId = state.convictionCheck?.matrixTopPath ?? null
        const matrixTopPath = matrixTopPathId
          ? (state.paths.find((p) => p.id === matrixTopPathId) ?? null)
          : null

        const narrative = await generatePersonalNarrative(
          apiKey,
          state.insightProfile,
          state.convictionCheck,
          chosenPath,
          matrixTopPath,
        )
        onSetPersonalNarrative(narrative)
      } catch {
        // silently fail — narrative is a nice-to-have
      } finally {
        setNarrativeLoading(false)
      }
    }

    void run()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const topPriorities = useMemo(
    () =>
      Object.entries(r.priorities)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 4)
        .map(([key, val]) => ({ label: PRIORITY_LABELS[key] ?? key, value: val })),
    [r.priorities],
  )

  const rankings = useMemo(() => {
    return state.selectedPathIds
      .map((pid) => {
        const p = state.paths.find((p) => p.id === pid)
        if (!p) return null
        let total = 0
        for (const c of MATRIX_CRITERIA) {
          total += (state.matrix.weights[c.id] ?? 3) * (state.matrix.scores[pid]?.[c.id]?.score ?? 0)
        }
        return { pathId: pid, title: p.title, total }
      })
      .filter(Boolean)
      .sort((a, b) => b!.total - a!.total) as { pathId: string; title: string; total: number }[]
  }, [state.paths, state.selectedPathIds, state.matrix])

  const maxTotal = rankings.length > 0 ? rankings[0].total : 0

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Placeholder — would integrate EmailJS/Resend here
    setEmailSent(true)
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-8 space-y-2">
        <h2 className="text-2xl font-light tracking-tight text-slate-800">
          Your career clarity
        </h2>
        <p className="text-sm text-slate-400">
          Here's everything from your session in one place.
        </p>
      </div>

      {/* Personal Narrative */}
      {(state.personalNarrative || narrativeLoading) && (
        <Section title="Your Story">
          {narrativeLoading ? (
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/30 p-6">
              <SkeletonShimmer lines={4} />
            </div>
          ) : (
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/30 p-6">
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
                {state.personalNarrative}
              </p>
            </div>
          )}
        </Section>
      )}

      {/* Reflection Highlights */}
      <Section title="Reflection Highlights">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <MiniCard label="Energizers" items={r.energizers} color="emerald" />
          <MiniCard label="Drainers" items={r.drainers} color="red" />
          <MiniCard label="Learning interests" items={r.learningInterests} color="sky" />
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="mb-2 text-xs font-medium text-slate-400">Top priorities</p>
            <div className="space-y-1.5">
              {topPriorities.map((p) => (
                <div key={p.label} className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">{p.label}</span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span
                        key={n}
                        className={`h-1.5 w-3 rounded-full ${
                          n <= p.value ? 'bg-indigo-400' : 'bg-slate-100'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {r.keepInJob && (
          <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-400">Would keep in job</p>
            <p className="mt-1 text-sm text-slate-600">{r.keepInJob}</p>
          </div>
        )}
        {r.successVision && (
          <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-400">Success in 2 years</p>
            <p className="mt-1 text-sm text-slate-600">{r.successVision}</p>
          </div>
        )}
      </Section>

      {/* Career Paths */}
      <Section title="Career Paths">
        <div className="space-y-2">
          {state.paths.map((path) => {
            const isSelected = state.selectedPathIds.includes(path.id)
            return (
              <div
                key={path.id}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                  isSelected
                    ? 'border-indigo-200 bg-indigo-50/50'
                    : 'border-slate-100 bg-white opacity-60'
                }`}
              >
                <div>
                  <span className={`text-sm ${isSelected ? 'font-medium text-slate-800' : 'text-slate-500'}`}>
                    {path.title}
                  </span>
                  <p className="text-xs text-slate-400">{path.description}</p>
                </div>
                {isSelected && (
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-600">
                    Selected
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </Section>

      {/* Rankings */}
      <Section title="Decision Matrix Rankings">
        <div className="space-y-2.5">
          {rankings.map((r, i) => {
            const pct = maxTotal > 0 ? (r.total / maxTotal) * 100 : 0
            const isTop = i === 0
            return (
              <div key={r.pathId} className="space-y-1">
                <div className="flex items-baseline justify-between text-sm">
                  <span className={isTop ? 'font-medium text-indigo-700' : 'text-slate-600'}>
                    {isTop && (
                      <span className="mr-1.5 inline-block rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600">
                        #1
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
                    className={`h-full rounded-full transition-all duration-500 ${isTop ? 'bg-indigo-500' : 'bg-slate-300'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </Section>

      {/* Action Plan */}
      {state.actionPlan && (
        <Section title={`Action Plan: ${state.actionPlan.targetPathTitle}`}>
          <ActionPlanDisplay plan={state.actionPlan} compact />
        </Section>
      )}

      {/* Export Options */}
      <div className="mt-10 space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="text-sm font-medium text-slate-700">Export your plan</h3>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => exportPdf(state)}
            className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            Download PDF
          </button>
          <form onSubmit={handleEmailSubmit} className="flex flex-1 gap-2">
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="your@email.com"
              className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm placeholder-slate-300 transition-colors focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
            <button
              type="submit"
              disabled={!emailInput.trim() || emailSent}
              className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                emailSent
                  ? 'bg-emerald-50 text-emerald-600'
                  : emailInput.trim()
                    ? 'bg-slate-800 text-white hover:bg-slate-900'
                    : 'cursor-not-allowed bg-slate-100 text-slate-300'
              }`}
            >
              {emailSent ? 'Sent!' : 'Email'}
            </button>
          </form>
        </div>
        {emailSent && (
          <p className="text-xs text-slate-400">
            Email integration is a placeholder — connect EmailJS or Resend to enable.
          </p>
        )}
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
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="rounded-lg px-5 py-2.5 text-sm font-medium text-slate-400 transition-all hover:text-indigo-600"
        >
          Back to top
        </button>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h3 className="mb-4 text-sm font-semibold tracking-wide text-indigo-600 uppercase">{title}</h3>
      {children}
    </div>
  )
}

function MiniCard({ label, items, color }: { label: string; items: string[]; color: string }) {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-700',
    sky: 'bg-sky-50 text-sky-700',
  }
  const pillClass = colorMap[color] ?? 'bg-slate-50 text-slate-600'
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="mb-2 text-xs font-medium text-slate-400">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span key={item} className={`rounded-full px-2.5 py-0.5 text-xs ${pillClass}`}>
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}
