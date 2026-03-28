interface SliderProps {
  question: string
  subtitle?: string
  value: number
  min?: number
  max?: number
  minLabel?: string
  maxLabel?: string
  onChange: (value: number) => void
}

export function Slider({
  question,
  subtitle,
  value,
  min = 1,
  max = 5,
  minLabel,
  maxLabel,
  onChange,
}: SliderProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-light tracking-tight text-slate-800">{question}</h2>
        {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
      </div>
      <div className="space-y-3">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="slider-track h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-indigo-500"
        />
        <div className="flex justify-between text-xs text-slate-400">
          <span>{minLabel ?? min}</span>
          <span className="text-sm font-medium text-indigo-600">{value}</span>
          <span>{maxLabel ?? max}</span>
        </div>
      </div>
    </div>
  )
}
