interface SingleChoiceProps {
  question: string
  subtitle?: string
  options: { value: string; label: string }[]
  selected: string
  onChange: (value: string) => void
}

export function SingleChoice({ question, subtitle, options, selected, onChange }: SingleChoiceProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-light tracking-tight text-slate-800">{question}</h2>
        {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap gap-3">
        {options.map((option) => {
          const isSelected = selected === option.value
          return (
            <button
              key={option.value}
              onClick={() => onChange(option.value)}
              className={`rounded-full border px-5 py-2.5 text-sm font-medium transition-all duration-200 ${
                isSelected
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
