interface StaleStepBannerProps {
  onRegenerate: () => void
}

export function StaleStepBanner({ onRegenerate }: StaleStepBannerProps) {
  return (
    <div className="mb-6 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <p className="text-sm text-amber-700">
        Your earlier answers changed — this data may be outdated.
      </p>
      <button
        onClick={onRegenerate}
        className="ml-3 shrink-0 text-sm font-medium text-amber-700 underline hover:text-amber-800"
      >
        Regenerate
      </button>
    </div>
  )
}
