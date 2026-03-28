import { WIZARD_STEPS } from '../types'

interface ProgressBarProps {
  currentStep: number
  onStepClick: (step: number) => void
}

export function ProgressBar({ currentStep, onStepClick }: ProgressBarProps) {
  return (
    <nav className="flex items-center justify-center gap-2 px-6 py-5">
      {WIZARD_STEPS.map((step, i) => {
        const isActive = step.number === currentStep
        const isCompleted = step.number < currentStep
        const isClickable = step.number <= currentStep

        return (
          <div key={step.number} className="flex items-center gap-2">
            {i > 0 && (
              <div
                className={`h-px w-8 transition-colors duration-300 ${
                  isCompleted ? 'bg-indigo-400' : 'bg-slate-200'
                }`}
              />
            )}
            <button
              onClick={() => isClickable && onStepClick(step.number)}
              disabled={!isClickable}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-300 ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : isCompleted
                    ? 'cursor-pointer text-indigo-500 hover:bg-indigo-50/50'
                    : 'cursor-default text-slate-300'
              }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs transition-all duration-300 ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : isCompleted
                      ? 'bg-indigo-100 text-indigo-600'
                      : 'bg-slate-100 text-slate-400'
                }`}
              >
                {isCompleted ? (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step.number
                )}
              </span>
              <span className="hidden sm:inline">{step.label}</span>
            </button>
          </div>
        )
      })}
    </nav>
  )
}
