import { WIZARD_STEPS } from '../types'

interface SessionResumeModalProps {
  savedStep: number
  onResume: () => void
  onStartFresh: () => void
}

export function SessionResumeModal({ savedStep, onResume, onStartFresh }: SessionResumeModalProps) {
  const stepLabel = WIZARD_STEPS.find((s) => s.number === savedStep)?.label ?? 'Unknown'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <h2 className="text-xl font-light tracking-tight text-slate-800">
          Welcome back
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          You have a session in progress — you were on{' '}
          <span className="font-medium text-slate-700">Step {savedStep}: {stepLabel}</span>.
        </p>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onStartFresh}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 transition-all duration-200 hover:bg-slate-50"
          >
            Start fresh
          </button>
          <button
            onClick={onResume}
            className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition-all duration-200 hover:bg-indigo-700"
          >
            Resume
          </button>
        </div>
      </div>
    </div>
  )
}
