import { jsPDF } from 'jspdf'
import type { WizardState } from '../types'
import { MATRIX_CRITERIA, PRIORITY_LABELS } from '../types'

const MARGIN = 20
const PAGE_W = 210 - MARGIN * 2 // A4 usable width
const LINE_H = 6
const SECTION_GAP = 10

// Preset scenarios (mirror DecisionMatrixStep)
const PRESET_SCENARIOS: { name: string; weights: Record<string, number> }[] = [
  { name: "What if money didn't matter?", weights: { salary: 1 } },
  { name: 'What if I prioritize growth?', weights: { learning: 5 } },
  { name: 'What if I need to switch fast?', weights: { transition: 5 } },
  { name: 'What if stability is everything?', weights: { demand: 5, creative: 1 } },
]

export function exportPdf(state: WizardState): void {
  const doc = new jsPDF()
  let y = MARGIN

  const addPage = () => {
    doc.addPage()
    y = MARGIN
  }
  const checkPage = (need: number) => {
    if (y + need > 280) addPage()
  }

  // ─────────────────────────────────────────────
  // 1. TITLE
  // ─────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(30, 41, 59) // slate-800
  doc.text('Clarify — Career Clarity Report', MARGIN, y)
  y += 10

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139) // slate-500
  doc.text(`Generated ${new Date().toLocaleDateString()}`, MARGIN, y)
  y += SECTION_GAP + 4

  // ─────────────────────────────────────────────
  // 2. PERSONAL NARRATIVE
  // ─────────────────────────────────────────────
  if (state.personalNarrative) {
    checkPage(20)
    sectionHeading(doc, 'Your Story', y)
    y += 8
    y = wrappedText(doc, y, state.personalNarrative, 10)
    y += SECTION_GAP
  }

  // ─────────────────────────────────────────────
  // 3. REFLECTION — all 12 answers
  // ─────────────────────────────────────────────
  checkPage(20)
  sectionHeading(doc, 'Reflection Highlights', y)
  y += 8

  const r = state.reflection

  // Core quick answers
  y = bulletList(doc, y, [
    `Energizers: ${r.energizers.join(', ')}`,
    `Drainers: ${r.drainers.join(', ')}`,
    `Coding in 5 years: ${r.codingIn5Years}`,
    `Energy level: ${r.energyLevel}/5`,
    `Learning interests: ${r.learningInterests.join(', ')}`,
  ])

  if (r.keepInJob) {
    checkPage(LINE_H * 2)
    y = wrappedText(doc, y, `Would keep: ${r.keepInJob}`)
  }
  if (r.successVision) {
    checkPage(LINE_H * 2)
    y = wrappedText(doc, y, `Success in 2 years: ${r.successVision}`)
  }

  // Top priorities
  const topPriorities = Object.entries(r.priorities)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)
    .map(([key, val]) => `${PRIORITY_LABELS[key] ?? key} (${val}/5)`)
  y += 2
  y = wrappedText(doc, y, `Top priorities: ${topPriorities.join(', ')}`)

  // Deep questions
  const deepQuestions: [string, string][] = [
    ['A decision you almost made but didn\'t', r.regretDecision],
    ['Good at but don\'t want to keep doing', r.goodAtButDontWant],
    ['If money were equal, I\'d pursue', r.ifMoneyEqual],
    ['A belief I\'d like to change', r.beliefToChange],
  ]

  for (const [label, answer] of deepQuestions) {
    if (answer) {
      checkPage(LINE_H * 3)
      y += 2
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(71, 85, 105)
      doc.text(label + ':', MARGIN, y)
      y += LINE_H
      y = wrappedText(doc, y, answer)
    }
  }

  y += SECTION_GAP

  // ─────────────────────────────────────────────
  // 4. COACHING INSIGHTS
  // ─────────────────────────────────────────────
  const ip = state.insightProfile
  const vh = state.valuesHierarchy

  const hasInsights =
    (ip && (ip.narrative || ip.tensions.length > 0 || ip.coreValues.length > 0 || ip.hiddenBlockers.length > 0 || ip.conversationLog.length > 0)) ||
    (vh && vh.values.length > 0)

  if (hasInsights) {
    checkPage(20)
    sectionHeading(doc, 'Coaching Insights', y)
    y += 8

    // AI synthesis narrative
    if (ip.narrative) {
      checkPage(LINE_H * 3)
      subHeading(doc, 'AI Synthesis', y)
      y += LINE_H + 1
      y = wrappedText(doc, y, ip.narrative)
      y += SECTION_GAP - 4
    }

    // Tensions explored
    if (ip.tensions.length > 0) {
      checkPage(20)
      subHeading(doc, 'Tensions Explored', y)
      y += LINE_H + 1
      for (const tension of ip.tensions) {
        checkPage(LINE_H * 5)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.setTextColor(71, 85, 105)
        y = wrappedText(doc, y, tension.description, 9)
        y += 1
        if (tension.question) {
          doc.setFont('helvetica', 'italic')
          doc.setFontSize(8)
          doc.setTextColor(100, 116, 139)
          y = wrappedText(doc, y, `Q: ${tension.question}`, 8)
        }
        if (tension.response) {
          y = wrappedText(doc, y, `A: ${tension.response}`, 8)
        }
        if (tension.resolution) {
          doc.setFont('helvetica', 'normal')
          y = wrappedText(doc, y, `Resolution: ${tension.resolution}`, 8)
        }
        y += 3
      }
      y += SECTION_GAP - 4
    }

    // Values hierarchy — prefer ValuesHierarchy entries, fall back to InsightProfile coreValues
    const useVH = vh && vh.values.length > 0
    const hasValues = useVH || ip.coreValues.length > 0

    if (hasValues) {
      checkPage(20)
      subHeading(doc, 'Values Hierarchy', y)
      y += LINE_H + 1

      if (useVH) {
        for (const v of vh.values) {
          checkPage(LINE_H * 3)
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(9)
          doc.setTextColor(71, 85, 105)
          doc.text(`${v.userRank}. ${v.value}`, MARGIN, y)
          y += LINE_H
          if (v.evidence) {
            y = wrappedText(doc, y, `  Evidence: ${v.evidence}`, 8)
          }
          if (v.sliderConflict) {
            y = wrappedText(doc, y, `  Conflict: ${v.sliderConflict}`, 8)
          }
          y += 1
        }
      } else {
        for (let i = 0; i < ip.coreValues.length; i++) {
          const cv = ip.coreValues[i]
          checkPage(LINE_H * 3)
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(9)
          doc.setTextColor(71, 85, 105)
          doc.text(`${i + 1}. ${cv.value}`, MARGIN, y)
          y += LINE_H
          if (cv.evidence) {
            y = wrappedText(doc, y, `  Evidence: ${cv.evidence}`, 8)
          }
          y += 1
        }
      }
      y += SECTION_GAP - 4
    }

    // Hidden blockers
    if (ip.hiddenBlockers.length > 0) {
      checkPage(20)
      subHeading(doc, 'Hidden Blockers', y)
      y += LINE_H + 1
      for (const blocker of ip.hiddenBlockers) {
        checkPage(LINE_H * 3)
        y = wrappedText(doc, y, `• Belief: ${blocker.belief}`, 9)
        if (blocker.source) {
          y = wrappedText(doc, y, `  Source: ${blocker.source}`, 8)
        }
        y += 2
      }
      y += SECTION_GAP - 4
    }

    // Conversation transcript
    if (ip.conversationLog.length > 0) {
      checkPage(20)
      subHeading(doc, 'Coaching Conversation', y)
      y += LINE_H + 1
      for (const msg of ip.conversationLog) {
        checkPage(LINE_H * 3)
        const isCoach = msg.role === 'assistant'
        const label = isCoach ? 'Coach:' : 'You:'
        const labelWidth = doc.getTextWidth(label + ' ')

        doc.setFont('helvetica', isCoach ? 'bold' : 'normal')
        doc.setFontSize(8)
        doc.setTextColor(isCoach ? 79 : 71, isCoach ? 70 : 85, isCoach ? 229 : 105)
        doc.text(label, MARGIN, y)

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(71, 85, 105)
        const contentLines = doc.splitTextToSize(msg.content, PAGE_W - labelWidth)
        doc.text(contentLines, MARGIN + labelWidth, y)
        y += contentLines.length * 5 + 2
      }
      y += SECTION_GAP - 4
    }
  }

  // ─────────────────────────────────────────────
  // 5. CAREER PATHS EXPLORED
  // ─────────────────────────────────────────────
  checkPage(20)
  sectionHeading(doc, 'Career Paths Explored', y)
  y += 8

  for (const path of state.paths) {
    checkPage(24)
    const isSelected = state.selectedPathIds.includes(path.id)
    doc.setFont('helvetica', isSelected ? 'bold' : 'normal')
    doc.setFontSize(10)
    doc.setTextColor(30, 41, 59)
    const marker = isSelected ? '★ ' : '  '
    doc.text(`${marker}${path.title}`, MARGIN, y)
    y += LINE_H

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(100, 116, 139)
    y = wrappedText(doc, y, path.description, 8)

    if (isSelected) {
      // Show full detail for selected paths
      if (path.whyItFits) {
        checkPage(LINE_H * 2)
        y = wrappedText(doc, y, `Why it fits: ${path.whyItFits}`, 8)
      }
      if (path.salaryRange) {
        checkPage(LINE_H)
        y = wrappedText(doc, y, `Salary: ${path.salaryRange.entry} → ${path.salaryRange.experienced}`, 8)
      }
      if (path.skillsHave.length > 0) {
        checkPage(LINE_H)
        y = wrappedText(doc, y, `Skills you have: ${path.skillsHave.join(', ')}`, 8)
      }
      if (path.skillsNeed.length > 0) {
        checkPage(LINE_H)
        y = wrappedText(doc, y, `Skills to build: ${path.skillsNeed.join(', ')}`, 8)
      }
      if (path.timeline) {
        checkPage(LINE_H)
        y = wrappedText(doc, y, `Timeline: ${path.timeline} | Risk: ${path.riskLevel}`, 8)
      }
      if (path.dayInTheLife) {
        checkPage(LINE_H * 2)
        y = wrappedText(doc, y, `Day in the life: ${path.dayInTheLife}`, 8)
      }

      // Path exploration Q&A
      const exploration = state.pathExplorations?.find((pe) => pe.pathId === path.id)
      if (exploration && exploration.messages.length > 0) {
        checkPage(16)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.setTextColor(79, 70, 229)
        doc.text('Path Exploration Conversation', MARGIN + 4, y)
        y += LINE_H
        for (const msg of exploration.messages) {
          checkPage(LINE_H * 2)
          const isCoach = msg.role === 'assistant'
          const label = isCoach ? 'Coach:' : 'You:'
          const labelWidth = doc.getTextWidth(label + ' ')
          doc.setFont('helvetica', isCoach ? 'bold' : 'normal')
          doc.setFontSize(8)
          doc.setTextColor(isCoach ? 79 : 71, isCoach ? 70 : 85, isCoach ? 229 : 105)
          doc.text(label, MARGIN + 4, y)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(71, 85, 105)
          const contentLines = doc.splitTextToSize(msg.content, PAGE_W - labelWidth - 4)
          doc.text(contentLines, MARGIN + 4 + labelWidth, y)
          y += contentLines.length * 5 + 1
        }
      }
    }

    y += 3
  }
  y += SECTION_GAP - 3

  // ─────────────────────────────────────────────
  // 6. DECISION MATRIX RANKINGS
  // ─────────────────────────────────────────────
  checkPage(30)
  sectionHeading(doc, 'Decision Matrix Rankings', y)
  y += 8

  const rankings = state.selectedPathIds
    .map((pid) => {
      const p = state.paths.find((p) => p.id === pid)
      let total = 0
      for (const c of MATRIX_CRITERIA) {
        total += (state.matrix.weights[c.id] ?? 3) * (state.matrix.scores[pid]?.[c.id]?.score ?? 0)
      }
      return { pathId: pid, title: p?.title ?? pid, total }
    })
    .sort((a, b) => b.total - a.total)

  // Weights header
  if (Object.keys(state.matrix.weights).length > 0) {
    checkPage(LINE_H)
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8)
    doc.setTextColor(100, 116, 139)
    const weightStr = MATRIX_CRITERIA.map((c) => `${c.label}: ${state.matrix.weights[c.id] ?? 3}`).join(' | ')
    y = wrappedText(doc, y, `Weights — ${weightStr}`, 8)
    y += 2
  }

  for (const rank of rankings) {
    checkPage(LINE_H + 4)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(30, 41, 59)
    doc.text(`${rank.title}`, MARGIN, y)
    doc.text(`${rank.total.toFixed(1)}`, MARGIN + PAGE_W, y, { align: 'right' })
    y += LINE_H

    // Per-criterion scores
    const scoreRow = MATRIX_CRITERIA
      .map((c) => {
        const s = state.matrix.scores[rank.pathId]?.[c.id]
        return s ? `${c.label}: ${s.score}` : null
      })
      .filter(Boolean)
      .join('  ')
    if (scoreRow) {
      doc.setFontSize(7)
      doc.setTextColor(100, 116, 139)
      y = wrappedText(doc, y, scoreRow, 7)
    }
    y += 1
  }

  // Scenario analysis
  if (rankings.length > 1) {
    checkPage(20)
    y += 4
    subHeading(doc, 'Scenario Analysis', y)
    y += LINE_H + 1

    for (const scenario of PRESET_SCENARIOS) {
      checkPage(LINE_H * 2)
      const tempWeights = { ...state.matrix.weights, ...scenario.weights }
      let topId = ''
      let topTotal = -1
      for (const pid of state.selectedPathIds) {
        let t = 0
        for (const c of MATRIX_CRITERIA) {
          t += (tempWeights[c.id] ?? 3) * (state.matrix.scores[pid]?.[c.id]?.score ?? 0)
        }
        if (t > topTotal) {
          topTotal = t
          topId = pid
        }
      }
      const winnerPath = state.paths.find((p) => p.id === topId)
      const winnerTitle = winnerPath?.title ?? topId
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(71, 85, 105)
      y = wrappedText(doc, y, `"${scenario.name}" → ${winnerTitle} (${topTotal.toFixed(1)})`, 8)
      y += 1
    }

    // Robustness summary
    if (rankings.length > 0) {
      checkPage(LINE_H * 3)
      y += 2
      const wins: Record<string, number> = {}
      const total = PRESET_SCENARIOS.length
      for (const scenario of PRESET_SCENARIOS) {
        const tempWeights = { ...state.matrix.weights, ...scenario.weights }
        let topId = ''
        let topTotal = -1
        for (const pid of state.selectedPathIds) {
          let t = 0
          for (const c of MATRIX_CRITERIA) {
            t += (tempWeights[c.id] ?? 3) * (state.matrix.scores[pid]?.[c.id]?.score ?? 0)
          }
          if (t > topTotal) { topTotal = t; topId = pid }
        }
        wins[topId] = (wins[topId] ?? 0) + 1
      }
      const currentTop = rankings[0]
      const currentWins = wins[currentTop.pathId] ?? 0
      let robustnessText: string
      if (currentWins === total) {
        robustnessText = `${currentTop.title} stays #1 in all ${total} scenarios — it's a robust choice.`
      } else if (currentWins >= total / 2) {
        robustnessText = `${currentTop.title} stays #1 in ${currentWins}/${total} scenarios — a solid but not unshakeable pick.`
      } else {
        const topWinner = Object.entries(wins).sort(([, a], [, b]) => b - a)[0]
        const winnerPath = state.paths.find((p) => p.id === topWinner[0])
        robustnessText = `${currentTop.title} only wins ${currentWins}/${total} scenarios. ${winnerPath?.title ?? 'Another path'} wins more often — consider what's really driving your preference.`
      }
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(9)
      doc.setTextColor(30, 41, 59)
      y = wrappedText(doc, y, robustnessText, 9)
    }
  }

  y += SECTION_GAP

  // ─────────────────────────────────────────────
  // 7. YOUR DECISION (conviction check)
  // ─────────────────────────────────────────────
  if (state.convictionCheck) {
    checkPage(20)
    sectionHeading(doc, 'Your Decision', y)
    y += 8

    const cc = state.convictionCheck
    const responseLabel: Record<string, string> = {
      yes: 'Yes — I agree with the matrix',
      unsure: 'I\'m still unsure',
      override: 'I\'m choosing differently',
    }

    y = bulletList(doc, y, [
      `Matrix suggested: ${cc.matrixTopPath}`,
      `You chose: ${cc.chosenPath}`,
      `Response: ${responseLabel[cc.response] ?? cc.response}`,
    ])

    if (cc.reasoning) {
      checkPage(LINE_H * 3)
      y += 2
      y = wrappedText(doc, y, `Your reasoning: ${cc.reasoning}`)
    }

    if (cc.conversation.length > 0) {
      checkPage(16)
      y += 2
      subHeading(doc, 'Conviction Conversation', y)
      y += LINE_H + 1
      for (const msg of cc.conversation) {
        checkPage(LINE_H * 2)
        const isCoach = msg.role === 'assistant'
        const label = isCoach ? 'Coach:' : 'You:'
        const labelWidth = doc.getTextWidth(label + ' ')
        doc.setFont('helvetica', isCoach ? 'bold' : 'normal')
        doc.setFontSize(8)
        doc.setTextColor(isCoach ? 79 : 71, isCoach ? 70 : 85, isCoach ? 229 : 105)
        doc.text(label, MARGIN, y)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(71, 85, 105)
        const contentLines = doc.splitTextToSize(msg.content, PAGE_W - labelWidth)
        doc.text(contentLines, MARGIN + labelWidth, y)
        y += contentLines.length * 5 + 2
      }
    }

    y += SECTION_GAP
  }

  // ─────────────────────────────────────────────
  // 8. ACTION PLAN
  // ─────────────────────────────────────────────
  if (state.actionPlan) {
    checkPage(20)
    sectionHeading(doc, `Action Plan: ${state.actionPlan.targetPathTitle}`, y)
    y += 8

    // Biggest risk first
    if (state.actionPlan.biggestRisk) {
      checkPage(20)
      subHeading(doc, 'Biggest Risk to Address First', y)
      y += LINE_H + 1
      const br = state.actionPlan.biggestRisk
      y = wrappedText(doc, y, `Belief: ${br.belief}`)
      y = wrappedText(doc, y, `Reframe: ${br.reframe}`)
      if (br.earlyActions.length > 0) {
        y += 1
        y = bulletList(doc, y, br.earlyActions)
      }
      y += SECTION_GAP - 4
    }

    // Phases
    for (const phase of state.actionPlan.phases) {
      checkPage(20)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(30, 41, 59)
      doc.text(`${phase.title} (${phase.timeframe})`, MARGIN, y)
      y += LINE_H + 1
      y = bulletList(doc, y, phase.items)
      y += 4
    }

    // Identity milestones
    if (state.actionPlan.identityMilestones && state.actionPlan.identityMilestones.length > 0) {
      checkPage(20)
      subHeading(doc, 'Identity Milestones', y)
      y += LINE_H + 1
      for (const im of state.actionPlan.identityMilestones) {
        checkPage(LINE_H * 2)
        y = wrappedText(doc, y, `${im.timeframe}: ${im.milestone}`)
        y += 1
      }
      y += SECTION_GAP - 4
    }

    // Checkpoints
    if (state.actionPlan.checkpoints && state.actionPlan.checkpoints.length > 0) {
      checkPage(20)
      subHeading(doc, 'Decision Checkpoints', y)
      y += LINE_H + 1
      for (const cp of state.actionPlan.checkpoints) {
        checkPage(LINE_H * 4)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.setTextColor(71, 85, 105)
        y = wrappedText(doc, y, `${cp.timeframe}: ${cp.question}`, 9)
        y = wrappedText(doc, y, `  Green light: ${cp.greenLight}`, 8)
        y = wrappedText(doc, y, `  Off-ramp: ${cp.offRamp}`, 8)
        y += 2
      }
      y += SECTION_GAP - 4
    }

    // Supporting sections
    const sections: [string, string[]][] = [
      ['Resources', state.actionPlan.resources],
      ['Resume & Portfolio Tips', state.actionPlan.resumeTips],
      ['Interview Prep', state.actionPlan.interviewPrep],
      ['Risk Mitigation', state.actionPlan.riskMitigation],
    ]

    for (const [title, items] of sections) {
      if (items.length === 0) continue
      checkPage(16)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(71, 85, 105)
      doc.text(title, MARGIN, y)
      y += LINE_H
      y = bulletList(doc, y, items, 8)
      y += 3
    }
  }

  doc.save('clarify-career-plan.pdf')
}

function sectionHeading(doc: jsPDF, text: string, y: number) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(79, 70, 229) // indigo-600
  doc.text(text, MARGIN, y)
}

function subHeading(doc: jsPDF, text: string, y: number) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(71, 85, 105) // slate-600
  doc.text(text, MARGIN, y)
}

function bulletList(doc: jsPDF, y: number, items: string[], fontSize = 9): number {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(fontSize)
  doc.setTextColor(71, 85, 105)
  for (const item of items) {
    if (y > 275) {
      doc.addPage()
      y = MARGIN
    }
    const lines = doc.splitTextToSize(`• ${item}`, PAGE_W - 4)
    doc.text(lines, MARGIN + 2, y)
    y += lines.length * (fontSize * 0.5 + 1.5)
  }
  return y
}

function wrappedText(doc: jsPDF, y: number, text: string, fontSize = 9): number {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(fontSize)
  doc.setTextColor(71, 85, 105)
  const lines = doc.splitTextToSize(text, PAGE_W)
  doc.text(lines, MARGIN, y)
  return y + lines.length * (fontSize * 0.5 + 1.5)
}
