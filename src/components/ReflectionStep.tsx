import { useState } from 'react'
import type { ReflectionAnswers } from '../types'
import {
  ENERGIZER_OPTIONS,
  DRAINER_OPTIONS,
  LEARNING_OPTIONS,
  CODING_5YR_OPTIONS,
  PRIORITY_KEYS,
  PRIORITY_LABELS,
} from '../types'
import { MultiSelect } from './questions/MultiSelect'
import { OpenEnded } from './questions/OpenEnded'
import { SingleChoice } from './questions/SingleChoice'
import { Slider } from './questions/Slider'
import { SliderGroup } from './questions/SliderGroup'

interface ReflectionStepProps {
  answers: ReflectionAnswers
  onChange: (updates: Partial<ReflectionAnswers>) => void
  onComplete: () => void
  canComplete: boolean
}

const TOTAL_QUESTIONS = 12

export function ReflectionStep({ answers, onChange, onComplete, canComplete }: ReflectionStepProps) {
  const [questionIndex, setQuestionIndex] = useState(0)

  const canGoNext = (): boolean => {
    switch (questionIndex) {
      case 0: return answers.energizers.length > 0
      case 1: return answers.drainers.length > 0
      case 2: return true // open-ended, optional
      case 3: return true // sliders have defaults
      case 4: return answers.codingIn5Years !== ''
      case 5: return true // slider has default
      case 6: return answers.learningInterests.length > 0
      case 7: return true // open-ended, optional
      case 8: return true  // regretDecision, optional
      case 9: return true  // goodAtButDontWant, optional
      case 10: return true // ifMoneyEqual, optional
      case 11: return true // beliefToChange, optional
      default: return false
    }
  }

  const next = () => {
    if (questionIndex < TOTAL_QUESTIONS - 1) {
      setQuestionIndex(questionIndex + 1)
    }
  }

  const back = () => {
    if (questionIndex > 0) {
      setQuestionIndex(questionIndex - 1)
    }
  }

  const isLast = questionIndex === TOTAL_QUESTIONS - 1

  const renderQuestion = () => {
    switch (questionIndex) {
      case 0:
        return (
          <MultiSelect
            question="What parts of your current work make time fly?"
            subtitle="Select all that apply"
            options={ENERGIZER_OPTIONS}
            selected={answers.energizers}
            onChange={(v) => onChange({ energizers: v })}
          />
        )
      case 1:
        return (
          <MultiSelect
            question="What drains you the most?"
            subtitle="Select all that apply"
            options={DRAINER_OPTIONS}
            selected={answers.drainers}
            onChange={(v) => onChange({ drainers: v })}
          />
        )
      case 2:
        return (
          <OpenEnded
            question="If you could redesign your job, what would you keep?"
            subtitle="Optional — but the more you share, the better your results"
            placeholder="The parts that still feel meaningful..."
            value={answers.keepInJob}
            onChange={(v) => onChange({ keepInJob: v })}
          />
        )
      case 3:
        return (
          <SliderGroup
            question="How important is each of these to you?"
            subtitle="Drag each slider from 1 (not important) to 5 (essential)"
            items={PRIORITY_KEYS.map((key) => ({ key, label: PRIORITY_LABELS[key] }))}
            values={answers.priorities}
            onChange={(key, value) =>
              onChange({ priorities: { ...answers.priorities, [key]: value } })
            }
          />
        )
      case 4:
        return (
          <SingleChoice
            question="Do you see yourself writing code in 5 years?"
            options={CODING_5YR_OPTIONS}
            selected={answers.codingIn5Years}
            onChange={(v) => onChange({ codingIn5Years: v })}
          />
        )
      case 5:
        return (
          <Slider
            question="What's your energy level at the end of a work day?"
            value={answers.energyLevel}
            min={1}
            max={5}
            minLabel="Completely drained"
            maxLabel="Energized"
            onChange={(v) => onChange({ energyLevel: v })}
          />
        )
      case 6:
        return (
          <MultiSelect
            question="When you learn something new outside work, what is it?"
            subtitle="Select all that apply"
            options={LEARNING_OPTIONS}
            selected={answers.learningInterests}
            onChange={(v) => onChange({ learningInterests: v })}
          />
        )
      case 7:
        return (
          <OpenEnded
            question="What would success look like in 2 years?"
            subtitle="Optional — paint the picture"
            placeholder="In two years, I'd feel successful if..."
            value={answers.successVision}
            onChange={(v) => onChange({ successVision: v })}
          />
        )
      case 8:
        return (
          <OpenEnded
            question="Think of a career decision you regret — or almost made but didn't. What held you back?"
            subtitle="Optional — this helps us understand what drives your choices under pressure"
            placeholder="I almost took that role at... but I didn't because..."
            value={answers.regretDecision}
            onChange={(v) => onChange({ regretDecision: v })}
          />
        )
      case 9:
        return (
          <OpenEnded
            question="What's something you're good at that you don't want to do anymore?"
            subtitle="Optional — being good at something doesn't mean it's your path"
            placeholder="I'm known for... but honestly I'd rather..."
            value={answers.goodAtButDontWant}
            onChange={(v) => onChange({ goodAtButDontWant: v })}
          />
        )
      case 10:
        return (
          <OpenEnded
            question="If money were equal across all options, what would change about your choice?"
            subtitle="Optional — helps separate financial anxiety from genuine preference"
            placeholder="If salary didn't matter, I'd probably..."
            value={answers.ifMoneyEqual}
            onChange={(v) => onChange({ ifMoneyEqual: v })}
          />
        )
      case 11:
        return (
          <OpenEnded
            question="What would you need to believe about yourself to make a big career change?"
            subtitle="Optional — the biggest blockers are often beliefs, not skills"
            placeholder="I'd need to believe that..."
            value={answers.beliefToChange}
            onChange={(v) => onChange({ beliefToChange: v })}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Sub-progress dots */}
      <div className="flex justify-center gap-1.5 pb-8">
        {Array.from({ length: TOTAL_QUESTIONS }, (_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === questionIndex
                ? 'w-6 bg-indigo-500'
                : i < questionIndex
                  ? 'w-1.5 bg-indigo-300'
                  : 'w-1.5 bg-slate-200'
            }`}
          />
        ))}
      </div>

      {/* Question */}
      <div className="flex-1">{renderQuestion()}</div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-10">
        <button
          onClick={back}
          disabled={questionIndex === 0}
          className={`rounded-lg px-5 py-2.5 text-sm font-medium transition-all duration-200 ${
            questionIndex === 0
              ? 'invisible'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
          }`}
        >
          Back
        </button>

        <span className="text-xs text-slate-300">
          {questionIndex + 1} of {TOTAL_QUESTIONS}
        </span>

        {isLast ? (
          <button
            onClick={onComplete}
            disabled={!canComplete || !canGoNext()}
            className={`rounded-lg px-6 py-2.5 text-sm font-medium transition-all duration-200 ${
              canComplete && canGoNext()
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'cursor-not-allowed bg-slate-100 text-slate-300'
            }`}
          >
            Continue
          </button>
        ) : (
          <button
            onClick={next}
            disabled={!canGoNext()}
            className={`rounded-lg px-6 py-2.5 text-sm font-medium transition-all duration-200 ${
              canGoNext()
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'cursor-not-allowed bg-slate-100 text-slate-300'
            }`}
          >
            Next
          </button>
        )}
      </div>
    </div>
  )
}
