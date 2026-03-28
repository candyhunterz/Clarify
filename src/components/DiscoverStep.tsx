import { useState, useRef, useCallback, useEffect } from 'react'
import type { ReflectionAnswers, InsightProfile, ValuesHierarchy, ConversationMessage } from '../types'
import {
  getApiKey,
  buildTensionPrompt,
  buildConversationFollowUpPrompt,
  streamConversationTurn,
  generateInsightSynthesis,
} from '../services/gemini'
import { SkeletonShimmer } from './SkeletonShimmer'
import { StaleStepBanner } from './StaleStepBanner'

type Phase = 'idle' | 'thinking' | 'chatting' | 'synthesizing' | 'review' | 'error'

const MAX_EXCHANGES = 4

interface DiscoverStepProps {
  reflection: ReflectionAnswers
  insightProfile: InsightProfile
  valuesHierarchy: ValuesHierarchy
  isStale: boolean
  onSetInsightProfile: (profile: InsightProfile) => void
  onSetValuesHierarchy: (hierarchy: ValuesHierarchy) => void
  onComplete: () => void
  onBack: () => void
  canComplete: boolean
}

export function DiscoverStep({
  reflection,
  insightProfile,
  valuesHierarchy,
  isStale,
  onSetInsightProfile,
  onSetValuesHierarchy,
  onComplete,
  onBack,
  canComplete,
}: DiscoverStepProps) {
  const [phase, setPhase] = useState<Phase>(insightProfile.narrative ? 'review' : 'idle')
  const [messages, setMessages] = useState<ConversationMessage[]>(insightProfile.conversationLog)
  const [streamingText, setStreamingText] = useState('')
  const [userInput, setUserInput] = useState('')
  const [exchangeCount, setExchangeCount] = useState(0)
  const [error, setError] = useState('')
  const [editingNarrative, setEditingNarrative] = useState(false)
  const [narrativeEdit, setNarrativeEdit] = useState('')

  const abortRef = useRef<AbortController | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to latest message
  useEffect(() => {
    if (chatEndRef.current && typeof chatEndRef.current.scrollIntoView === 'function') {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, streamingText])

  // Focus input when chatting
  useEffect(() => {
    if (phase === 'chatting') {
      inputRef.current?.focus()
    }
  }, [phase])

  const startConversation = useCallback(async () => {
    const apiKey = getApiKey()
    if (!apiKey) {
      setError('No API key found. Please set your Gemini API key in Settings.')
      setPhase('error')
      return
    }

    setPhase('thinking')
    setError('')

    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      const ai = new GoogleGenerativeAI(apiKey)
      const model = ai.getGenerativeModel({ model: 'gemini-flash-latest' })

      const prompt = buildTensionPrompt(reflection)
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      })

      const text = result.response.text()
      const cleaned = text.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '').trim()
      const parsed = JSON.parse(cleaned) as {
        tensions?: Array<{ description: string; question: string }>
        firstQuestion?: string
      }

      const firstQuestion = parsed.firstQuestion ?? parsed.tensions?.[0]?.question ?? ''
      if (!firstQuestion) {
        throw new Error('No question generated from tension analysis')
      }

      const assistantMessage: ConversationMessage = {
        role: 'assistant',
        content: firstQuestion,
      }
      setMessages([assistantMessage])
      setExchangeCount(1)
      setPhase('chatting')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to start conversation'
      setError(message)
      setPhase('error')
    }
  }, [reflection])

  const sendMessage = useCallback(async () => {
    const trimmed = userInput.trim()
    if (!trimmed || phase !== 'chatting') return

    const apiKey = getApiKey()
    if (!apiKey) {
      setError('No API key found.')
      setPhase('error')
      return
    }

    const userMessage: ConversationMessage = { role: 'user', content: trimmed }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setUserInput('')
    const nextExchange = exchangeCount + 1

    // If we've hit the max, go to synthesis
    if (nextExchange > MAX_EXCHANGES) {
      setPhase('synthesizing')

      try {
        const { profile, valuesHierarchy: vh } = await generateInsightSynthesis(
          apiKey,
          reflection,
          updatedMessages,
        )
        // Preserve conversation log
        profile.conversationLog = updatedMessages
        onSetInsightProfile(profile)
        onSetValuesHierarchy(vh)
        setPhase('review')
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to generate synthesis'
        setError(message)
        setPhase('error')
      }
      return
    }

    // Otherwise, get next AI question
    setPhase('thinking')
    setStreamingText('')

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const prompt = buildConversationFollowUpPrompt(updatedMessages, nextExchange, MAX_EXCHANGES)

    streamConversationTurn(apiKey, prompt, {
      onText: (text) => {
        if (!controller.signal.aborted) {
          setStreamingText((prev) => prev + text)
        }
      },
      onDone: (fullText) => {
        if (controller.signal.aborted) return
        const assistantMessage: ConversationMessage = {
          role: 'assistant',
          content: fullText,
        }
        setMessages((prev) => [...prev, assistantMessage])
        setStreamingText('')
        setExchangeCount(nextExchange)
        setPhase('chatting')
      },
      onError: (errMsg) => {
        if (controller.signal.aborted) return
        setStreamingText('')
        setError(errMsg)
        setPhase('error')
      },
    }, controller.signal)
  }, [userInput, phase, messages, exchangeCount, reflection, onSetInsightProfile, onSetValuesHierarchy])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }, [sendMessage])

  const handleStartOver = useCallback(() => {
    abortRef.current?.abort()
    setPhase('idle')
    setMessages([])
    setStreamingText('')
    setUserInput('')
    setExchangeCount(0)
    setError('')
    setEditingNarrative(false)
    setNarrativeEdit('')
    onSetInsightProfile({
      tensions: [],
      coreValues: [],
      hiddenBlockers: [],
      narrative: '',
      conversationLog: [],
    })
    onSetValuesHierarchy({ values: [] })
  }, [onSetInsightProfile, onSetValuesHierarchy])

  const handleSaveNarrative = useCallback(() => {
    onSetInsightProfile({
      ...insightProfile,
      narrative: narrativeEdit,
    })
    setEditingNarrative(false)
  }, [insightProfile, narrativeEdit, onSetInsightProfile])

  const sortedValues = [...valuesHierarchy.values].sort((a, b) => a.userRank - b.userRank)

  return (
    <div className="flex flex-1 flex-col">
      {/* Stale banner */}
      {isStale && insightProfile.narrative && phase === 'review' && (
        <StaleStepBanner onRegenerate={handleStartOver} />
      )}

      <div className="mb-8 space-y-2">
        <h2 className="text-2xl font-light tracking-tight text-slate-800">
          Let's dig deeper
        </h2>
        <p className="text-sm text-slate-400">
          A short conversation to surface what really matters to you.
        </p>
      </div>

      {/* ── Idle Phase ── */}
      {phase === 'idle' && (
        <div className="flex flex-1 flex-col items-center justify-center space-y-6">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50">
              <svg className="h-8 w-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
              </svg>
            </div>
            <p className="text-sm leading-relaxed text-slate-500">
              Based on your reflections, I'll identify some interesting tensions in your
              answers and ask a few follow-up questions. This helps surface values you
              might not have articulated yet.
            </p>
          </div>
          <button
            onClick={startConversation}
            className="rounded-xl bg-indigo-600 px-8 py-3 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-indigo-700 hover:shadow-md"
          >
            Start conversation
          </button>
        </div>
      )}

      {/* ── Chat Phase (thinking / chatting) ── */}
      {(phase === 'thinking' || phase === 'chatting') && (
        <div className="flex flex-1 flex-col">
          {/* Exchange counter */}
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              {exchangeCount} of {MAX_EXCHANGES} exchanges
            </span>
            <div className="flex gap-1.5">
              {Array.from({ length: MAX_EXCHANGES }, (_, i) => (
                <div
                  key={i}
                  className={`h-1.5 w-6 rounded-full transition-colors duration-300 ${
                    i < exchangeCount ? 'bg-indigo-400' : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-4 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/50 p-4" style={{ maxHeight: '400px' }}>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-slate-700 shadow-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Streaming text */}
            {streamingText && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl bg-white px-4 py-3 text-sm leading-relaxed text-slate-700 shadow-sm">
                  {streamingText}
                </div>
              </div>
            )}

            {/* Thinking dots */}
            {phase === 'thinking' && !streamingText && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                  <div className="flex space-x-1.5">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-slate-300" style={{ animationDelay: '0ms' }} />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-slate-300" style={{ animationDelay: '150ms' }} />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-slate-300" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input area */}
          {phase === 'chatting' && (
            <div className="mt-4 flex items-end gap-3">
              <textarea
                ref={inputRef}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your response..."
                rows={2}
                className="flex-1 resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 placeholder-slate-300 transition-colors focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
              <button
                onClick={sendMessage}
                disabled={!userInput.trim()}
                className={`rounded-xl px-5 py-3 text-sm font-medium transition-all duration-200 ${
                  userInput.trim()
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'cursor-not-allowed bg-slate-100 text-slate-300'
                }`}
              >
                Send
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Synthesizing Phase ── */}
      {phase === 'synthesizing' && (
        <div className="flex flex-1 flex-col items-center justify-center space-y-6">
          <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50">
            <svg className="h-8 w-8 animate-spin text-indigo-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-slate-600">Synthesizing your insights...</p>
            <p className="mt-1 text-xs text-slate-400">Building your values profile from the conversation</p>
          </div>
          <SkeletonShimmer lines={4} className="w-64" />
        </div>
      )}

      {/* ── Review Phase ── */}
      {phase === 'review' && (
        <div className="flex-1 space-y-6 overflow-y-auto">
          {/* Narrative card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">Your Story</h3>
              {editingNarrative ? (
                <button
                  onClick={handleSaveNarrative}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                >
                  Save
                </button>
              ) : (
                <button
                  onClick={() => {
                    setNarrativeEdit(insightProfile.narrative)
                    setEditingNarrative(true)
                  }}
                  className="text-xs font-medium text-slate-400 hover:text-slate-600"
                >
                  Edit
                </button>
              )}
            </div>
            {editingNarrative ? (
              <textarea
                value={narrativeEdit}
                onChange={(e) => setNarrativeEdit(e.target.value)}
                rows={4}
                className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm leading-relaxed text-slate-600 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            ) : (
              <p className="text-sm leading-relaxed text-slate-600">
                {insightProfile.narrative}
              </p>
            )}
          </div>

          {/* Values hierarchy */}
          {sortedValues.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="mb-4 text-sm font-semibold text-slate-700">Your Values</h3>
              <ol className="space-y-3">
                {sortedValues.map((v, i) => (
                  <li key={v.value} className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-600">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-700">{v.value}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{v.evidence}</p>
                      {v.sliderConflict && (
                        <p className="mt-1 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-600">
                          Conflict: {v.sliderConflict}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Hidden blockers */}
          {insightProfile.hiddenBlockers.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
              <h3 className="mb-3 text-sm font-semibold text-amber-800">Hidden Blockers</h3>
              <ul className="space-y-3">
                {insightProfile.hiddenBlockers.map((blocker, i) => (
                  <li key={i}>
                    <p className="text-sm font-medium text-amber-700">{blocker.belief}</p>
                    <p className="mt-0.5 text-xs text-amber-600">Source: {blocker.source}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Start over */}
          <div className="flex justify-center pt-2">
            <button
              onClick={handleStartOver}
              className="text-xs text-slate-400 transition-colors hover:text-slate-600"
            >
              Start over
            </button>
          </div>
        </div>
      )}

      {/* ── Error Phase ── */}
      {phase === 'error' && (
        <div className="flex flex-1 flex-col items-center justify-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
            <svg className="h-7 w-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <p className="max-w-sm text-center text-sm text-slate-500">{error}</p>
          <button
            onClick={() => {
              setError('')
              if (messages.length > 0) {
                setPhase('chatting')
              } else {
                setPhase('idle')
              }
            }}
            className="rounded-lg bg-slate-100 px-5 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200"
          >
            Try again
          </button>
        </div>
      )}

      {/* ── Navigation ── */}
      <div className="mt-auto flex items-center justify-between pt-10">
        <button
          onClick={onBack}
          className="rounded-lg px-5 py-2.5 text-sm font-medium text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-700"
        >
          Back
        </button>
        <button
          onClick={onComplete}
          disabled={!canComplete}
          className={`rounded-lg px-6 py-2.5 text-sm font-medium transition-all duration-200 ${
            canComplete
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'cursor-not-allowed bg-slate-100 text-slate-300'
          }`}
        >
          Continue
        </button>
      </div>
    </div>
  )
}
