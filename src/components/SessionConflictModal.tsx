interface SessionConflictModalProps {
  onLoadLatest: () => void
  onKeepCurrent: () => void
}

export function SessionConflictModal({ onLoadLatest, onKeepCurrent }: SessionConflictModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <h2 className="text-xl font-light tracking-tight text-slate-800">
          Session updated elsewhere
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          This session was updated in another tab. Would you like to load the latest
          version or keep your current progress?
        </p>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onKeepCurrent}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 transition-all duration-200 hover:bg-slate-50"
          >
            Keep current
          </button>
          <button
            onClick={onLoadLatest}
            className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition-all duration-200 hover:bg-indigo-700"
          >
            Load latest
          </button>
        </div>
      </div>
    </div>
  )
}
