import type { ActionPlan } from '../types'

interface ActionPlanDisplayProps {
  plan: ActionPlan
  compact?: boolean
}

const phaseColors = [
  { bg: 'bg-sky-50', border: 'border-sky-200', badge: 'bg-sky-100 text-sky-700', dot: 'bg-sky-400' },
  { bg: 'bg-violet-50', border: 'border-violet-200', badge: 'bg-violet-100 text-violet-700', dot: 'bg-violet-400' },
  { bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-400' },
]

export function ActionPlanDisplay({ plan, compact }: ActionPlanDisplayProps) {
  return (
    <div className="space-y-6">
      {/* Phases */}
      {plan.phases.map((phase, i) => {
        const colors = phaseColors[i] ?? phaseColors[0]
        return (
          <div key={i} className={`rounded-xl border ${colors.border} ${colors.bg} p-5`}>
            <div className="mb-3 flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors.badge}`}>
                {phase.timeframe}
              </span>
              <h3 className="text-sm font-medium text-slate-800">{phase.title}</h3>
            </div>
            <ul className="space-y-2">
              {phase.items.map((item, j) => (
                <li key={j} className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-700">
                  <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${colors.dot}`} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )
      })}

      {/* Supporting sections */}
      <div className={compact ? 'grid grid-cols-2 gap-4' : 'grid grid-cols-1 gap-4 sm:grid-cols-2'}>
        {plan.resources.length > 0 && (
          <SupportSection title="Resources" items={plan.resources} icon="📚" />
        )}
        {plan.resumeTips.length > 0 && (
          <SupportSection title="Resume & Portfolio" items={plan.resumeTips} icon="📄" />
        )}
        {plan.interviewPrep.length > 0 && (
          <SupportSection title="Interview Prep" items={plan.interviewPrep} icon="🎯" />
        )}
        {plan.riskMitigation.length > 0 && (
          <SupportSection title="Risk Mitigation" items={plan.riskMitigation} icon="🛡" />
        )}
      </div>

      {/* Biggest Risk */}
      {plan.biggestRisk && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h4 className="mb-2 text-sm font-medium text-amber-800">Your biggest risk isn't what you think</h4>
          <p className="text-sm text-amber-700">{plan.biggestRisk.belief}</p>
          <p className="mt-2 text-sm text-slate-600"><strong>Reframe:</strong> {plan.biggestRisk.reframe}</p>
          {plan.biggestRisk.earlyActions.length > 0 && (
            <ul className="mt-2 space-y-1">
              {plan.biggestRisk.earlyActions.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                  {a}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Identity Milestones */}
      {plan.identityMilestones && plan.identityMilestones.length > 0 && (
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-5">
          <h4 className="mb-3 text-sm font-medium text-violet-800">Identity milestones</h4>
          <div className="space-y-2">
            {plan.identityMilestones.map((m, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">
                  {m.timeframe}
                </span>
                <p className="text-sm text-slate-700">{m.milestone}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Decision Checkpoints */}
      {plan.checkpoints && plan.checkpoints.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h4 className="mb-3 text-sm font-medium text-slate-700">Decision checkpoints</h4>
          <div className="space-y-4">
            {plan.checkpoints.map((cp, i) => (
              <div key={i} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">
                    {cp.timeframe}
                  </span>
                  <p className="text-sm font-medium text-slate-700">{cp.question}</p>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-emerald-50 p-2.5">
                    <p className="text-xs font-medium text-emerald-700">Green light</p>
                    <p className="mt-0.5 text-xs text-emerald-600">{cp.greenLight}</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-2.5">
                    <p className="text-xs font-medium text-amber-700">Off-ramp</p>
                    <p className="mt-0.5 text-xs text-amber-600">{cp.offRamp}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SupportSection({ title, items, icon }: { title: string; items: string[]; icon: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h4 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-700">
        <span>{icon}</span> {title}
      </h4>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="text-xs leading-relaxed text-slate-500">
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
