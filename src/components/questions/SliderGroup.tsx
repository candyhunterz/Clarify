interface SliderGroupProps {
  question: string
  subtitle?: string
  items: { key: string; label: string }[]
  values: Record<string, number>
  onChange: (key: string, value: number) => void
}

export function SliderGroup({ question, subtitle, items, values, onChange }: SliderGroupProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-light tracking-tight text-slate-800">{question}</h2>
        {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
      </div>
      <div className="space-y-5">
        {items.map((item) => (
          <div key={item.key} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-600">{item.label}</label>
              <span className="text-xs font-medium text-indigo-500">{values[item.key]}/5</span>
            </div>
            <input
              type="range"
              min={1}
              max={5}
              value={values[item.key]}
              onChange={(e) => onChange(item.key, Number(e.target.value))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-indigo-500"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
