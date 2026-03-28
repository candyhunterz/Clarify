interface OpenEndedProps {
  question: string
  subtitle?: string
  placeholder?: string
  value: string
  onChange: (value: string) => void
}

export function OpenEnded({ question, subtitle, placeholder, value, onChange }: OpenEndedProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-light tracking-tight text-slate-800">{question}</h2>
        {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-700 placeholder-slate-300 transition-colors duration-200 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
      />
    </div>
  )
}
