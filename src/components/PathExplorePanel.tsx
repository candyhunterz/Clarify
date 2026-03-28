import { useState, useRef, useCallback, useEffect } from 'react'
import type { CareerPath, InsightProfile, ConversationMessage } from '../types'
import { getApiKey, buildPathExplorationPrompt, streamConversationTurn } from '../services/gemini'

interface PathExplorePanelProps {
  path: CareerPath
  allPaths: CareerPath[]
  insightProfile: InsightProfile
  messages: ConversationMessage[]
  onAddMessage: (pathId: string, message: ConversationMessage) => void
  onClose: () => void
}

const SUGGESTIONS = [
  "What would my first year look like?",
  "What's the worst part of this job?",
  "How do my current skills transfer?",
]

export function PathExplorePanel({
  path,
  allPaths,
  insightProfile,
  messages,
  onAddMessage,
  onClose,
}: PathExplorePanelProps) {
  const [input, setInput] = useState('')
  const [streamingText, setStreamingText] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  // Scroll to bottom whenever messages or streaming text changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isThinking) return

      const apiKey = getApiKey()
      if (!apiKey) return

      const userMsg: ConversationMessage = { role: 'user', content: trimmed }
      onAddMessage(path.id, userMsg)
      setInput('')
      setIsThinking(true)
      setStreamingText('')

      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      const history = [...messages, userMsg]
      const prompt = buildPathExplorationPrompt(insightProfile, path, allPaths, history)

      let accumulated = ''

      await streamConversationTurn(
        apiKey,
        prompt,
        {
          onText: (chunk) => {
            accumulated += chunk
            setStreamingText(accumulated)
          },
          onDone: (fullText) => {
            setStreamingText('')
            setIsThinking(false)
            const aiMsg: ConversationMessage = { role: 'assistant', content: fullText }
            onAddMessage(path.id, aiMsg)
          },
          onError: () => {
            setStreamingText('')
            setIsThinking(false)
          },
        },
        controller.signal,
      )
    },
    [isThinking, messages, insightProfile, path, allPaths, onAddMessage],
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void send(input)
    }
  }

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Exploring</p>
          <h3 className="text-sm font-medium text-slate-800">{path.title}</h3>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          aria-label="Close panel"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.length === 0 && !isThinking && (
          <div className="space-y-3">
            <p className="text-sm text-slate-400">Ask anything about this path. Some ideas:</p>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => void send(s)}
                className="block w-full rounded-xl border border-slate-200 px-4 py-2.5 text-left text-sm text-slate-600 transition-colors hover:border-indigo-300 hover:text-indigo-700"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Streaming response */}
        {isThinking && !streamingText && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-slate-100 px-4 py-3">
              <div className="flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        {streamingText && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl bg-slate-100 px-4 py-2.5 text-sm leading-relaxed text-slate-700">
              {streamingText}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-100 px-5 py-4">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question..."
            disabled={isThinking}
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition-colors focus:border-indigo-300 focus:bg-white disabled:opacity-50"
          />
          <button
            onClick={() => void send(input)}
            disabled={!input.trim() || isThinking}
            className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
