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
