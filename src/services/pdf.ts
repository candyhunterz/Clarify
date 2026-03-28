import { jsPDF } from 'jspdf'
import type { WizardState } from '../types'
import { MATRIX_CRITERIA, PRIORITY_LABELS } from '../types'

const MARGIN = 20
const PAGE_W = 210 - MARGIN * 2 // A4 usable width
const LINE_H = 6
const SECTION_GAP = 10

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

  // --- Title ---
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(30, 41, 59) // slate-800
  doc.text('Clarify — Career Plan', MARGIN, y)
  y += 12

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139) // slate-500
  doc.text(`Generated ${new Date().toLocaleDateString()}`, MARGIN, y)
  y += SECTION_GAP + 4

  // --- Reflection Highlights ---
  sectionHeading(doc, 'Reflection Highlights', y)
  y += 8

  const r = state.reflection
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
  y += SECTION_GAP

  // --- Career Paths ---
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
    y += 3
  }
  y += SECTION_GAP - 3

  // --- Decision Matrix Rankings ---
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
      return { title: p?.title ?? pid, total }
    })
    .sort((a, b) => b.total - a.total)

  for (const r of rankings) {
    checkPage(LINE_H)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(30, 41, 59)
    doc.text(`${r.title}`, MARGIN, y)
    doc.text(`${r.total.toFixed(1)}`, MARGIN + PAGE_W, y, { align: 'right' })
    y += LINE_H + 1
  }
  y += SECTION_GAP

  // --- Action Plan ---
  if (state.actionPlan) {
    checkPage(20)
    sectionHeading(doc, `Action Plan: ${state.actionPlan.targetPathTitle}`, y)
    y += 8

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
      doc.setTextColor(71, 85, 105) // slate-600
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
