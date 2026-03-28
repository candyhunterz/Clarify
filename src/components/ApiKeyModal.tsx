import { useState } from 'react'

interface ApiKeyModalProps {
  onSubmit: (key: string) => void
}

export function ApiKeyModal({ onSubmit }: ApiKeyModalProps) {
  const [key, setKey] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = key.trim()
    if (trimmed) onSubmit(trimmed)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="mx-4 w-full max-w-md rounded-2xl bg-white p-8 shadow-xl"
      >
        <h2 className="text-xl font-light tracking-tight text-slate-800">
          Connect to Gemini
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Clarify uses Google's Gemini API to generate personalized career paths.
          Enter your API key to continue.
        </p>

        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="AIza..."
          autoFocus
          className="mt-5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 placeholder-slate-300 transition-colors focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />

        <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2">
          <p className="text-xs leading-relaxed text-amber-700">
            Your key is stored in this browser's localStorage only. It is never
            sent anywhere except directly to Google's API.
          </p>
        </div>

        <button
          type="submit"
          disabled={!key.trim()}
          className={`mt-5 w-full rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
            key.trim()
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'cursor-not-allowed bg-slate-100 text-slate-300'
          }`}
        >
          Save & continue
        </button>
      </form>
    </div>
  )
}
