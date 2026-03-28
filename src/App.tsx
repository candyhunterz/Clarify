import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ProgressBar } from './components/ProgressBar'
import { ReflectionStep } from './components/ReflectionStep'
import { DiscoverStep } from './components/DiscoverStep'
import { PathGenerationStep } from './components/PathGenerationStep'
import { DecisionMatrixStep } from './components/DecisionMatrixStep'
import { CommitStep } from './components/CommitStep'
import { ActionPlanStep } from './components/ActionPlanStep'
import { SummaryStep } from './components/SummaryStep'
import { SessionResumeModal } from './components/SessionResumeModal'
import { SessionConflictModal } from './components/SessionConflictModal'
import { useWizard } from './hooks/useWizard'
import { useSessionPersistence } from './hooks/useSessionPersistence'

const SLIDE_OFFSET = 60

function App() {
  const {
    state,
    direction,
    staleSteps,
    canAdvance,
    goToStep,
    nextStep,
    prevStep,
    updateReflection,
    setInsightProfile,
    setValuesHierarchy,
    setPaths,
    togglePathSelection,
    updateWeight,
    updateScore,
    setMatrixScores,
    setConvictionCheck,
    setActionPlan,
    // setPersonalNarrative and addPathExplorationMessage will be used when
    // DiscoverStep and path exploration chat are fully implemented
    undo,
    redo,
    loadState,
  } = useWizard()

  const {
    sessionStatus,
    resumeSession,
    startFresh,
    acceptRemote,
    keepCurrent,
  } = useSessionPersistence(state, loadState)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey) || e.key !== 'z') return
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) {
        return
      }
      e.preventDefault()
      if (e.shiftKey) {
        redo()
      } else {
        undo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])

  const variants = {
    enter: (d: number) => ({ x: d * SLIDE_OFFSET, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d * -SLIDE_OFFSET, opacity: 0 }),
  }

  const renderStep = () => {
    switch (state.currentStep) {
      case 1:
        return (
          <ReflectionStep
            answers={state.reflection}
            onChange={updateReflection}
            onComplete={nextStep}
            canComplete={canAdvance()}
          />
        )
      case 2:
        return (
          <DiscoverStep
            reflection={state.reflection}
            insightProfile={state.insightProfile}
            valuesHierarchy={state.valuesHierarchy}
            isStale={staleSteps.includes(2)}
            onSetInsightProfile={setInsightProfile}
            onSetValuesHierarchy={setValuesHierarchy}
            onComplete={nextStep}
            onBack={prevStep}
            canComplete={canAdvance()}
          />
        )
      case 3:
        return (
          <PathGenerationStep
            reflection={state.reflection}
            paths={state.paths}
            selectedPathIds={state.selectedPathIds}
            isStale={staleSteps.includes(3)}
            onPathsUpdate={setPaths}
            onTogglePath={togglePathSelection}
            onComplete={nextStep}
            onBack={prevStep}
            canComplete={canAdvance()}
          />
        )
      case 4:
        return (
          <DecisionMatrixStep
            paths={state.paths}
            selectedPathIds={state.selectedPathIds}
            matrix={state.matrix}
            isStale={staleSteps.includes(4)}
            onUpdateWeight={updateWeight}
            onUpdateScore={updateScore}
            onSetScores={setMatrixScores}
            onComplete={nextStep}
            onBack={prevStep}
            canComplete={canAdvance()}
          />
        )
      case 5:
        return (
          <CommitStep
            paths={state.paths}
            selectedPathIds={state.selectedPathIds}
            matrix={state.matrix}
            convictionCheck={state.convictionCheck}
            onSetConvictionCheck={setConvictionCheck}
            onComplete={nextStep}
            onBack={prevStep}
            canComplete={canAdvance()}
          />
        )
      case 6:
        return (
          <ActionPlanStep
            paths={state.paths}
            selectedPathIds={state.selectedPathIds}
            matrix={state.matrix}
            actionPlan={state.actionPlan}
            isStale={staleSteps.includes(6)}
            onSetPlan={setActionPlan}
            onComplete={nextStep}
            onBack={prevStep}
            canComplete={canAdvance()}
          />
        )
      case 7:
        return <SummaryStep state={state} onBack={prevStep} />
      default:
        return null
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {sessionStatus.type === 'found-session' && (
        <SessionResumeModal
          savedStep={sessionStatus.savedState.currentStep}
          onResume={resumeSession}
          onStartFresh={startFresh}
        />
      )}
      {sessionStatus.type === 'conflict' && (
        <SessionConflictModal
          onLoadLatest={acceptRemote}
          onKeepCurrent={keepCurrent}
        />
      )}
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-center pt-5 pb-1">
            <h1 className="text-lg font-light tracking-tight text-slate-800">Clarify</h1>
          </div>
          <ProgressBar currentStep={state.currentStep} onStepClick={goToStep} />
        </div>
      </header>
      <main className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col overflow-hidden px-6 py-10">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={state.currentStep}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="flex flex-1 flex-col"
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}

export default App
