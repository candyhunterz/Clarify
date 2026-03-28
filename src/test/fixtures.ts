import type { ReflectionAnswers, CareerPath, MatrixScore, ActionPlan, WizardState } from '../types'
import { createInitialReflection, createInitialMatrix } from '../types'

export function createCompletedReflection(): ReflectionAnswers {
  return {
    energizers: ['Building UI', 'Solving bugs'],
    drainers: ['Meetings', 'Legacy code'],
    keepInJob: 'The creative problem-solving aspects',
    priorities: {
      salary: 4,
      flexibility: 5,
      creativeFreedom: 4,
      teamQuality: 3,
      learningOpportunity: 5,
      impactMeaning: 3,
      stability: 2,
      leadershipPath: 2,
    },
    codingIn5Years: 'maybe',
    energyLevel: 3,
    learningInterests: ['Tech / coding', 'Design'],
    successVision: 'Leading a small product team',
  }
}

export function createMockPaths(): CareerPath[] {
  return [
    {
      id: 'path-1',
      title: 'Senior Frontend Engineer',
      description: 'Specialize in frontend architecture and design systems',
      whyItFits: 'Strong UI building interest and design curiosity',
      salaryRange: { entry: '$130k', experienced: '$180k' },
      skillsHave: ['React', 'TypeScript', 'CSS'],
      skillsNeed: ['System design', 'Performance optimization'],
      timeline: '6-12 months',
      riskLevel: 'low',
      dayInTheLife: 'Morning standup, then deep work on component architecture.',
    },
    {
      id: 'path-2',
      title: 'Product Manager',
      description: 'Transition from engineering to product leadership',
      whyItFits: 'Interest in talking to users and creative freedom',
      salaryRange: { entry: '$120k', experienced: '$170k' },
      skillsHave: ['Technical understanding', 'Problem-solving'],
      skillsNeed: ['Product strategy', 'User research'],
      timeline: '3-6 months',
      riskLevel: 'medium',
      dayInTheLife: 'Prioritizing features, running user interviews, working with designers.',
    },
    {
      id: 'path-3',
      title: 'UX Engineer',
      description: 'Bridge design and engineering with a focus on user experience',
      whyItFits: 'Combines UI building with design interest',
      salaryRange: { entry: '$115k', experienced: '$160k' },
      skillsHave: ['Frontend development', 'CSS'],
      skillsNeed: ['Figma', 'User research', 'Prototyping'],
      timeline: '3-6 months',
      riskLevel: 'low',
      dayInTheLife: 'Building interactive prototypes and refining design systems.',
    },
    {
      id: 'path-4',
      title: 'Engineering Manager',
      description: 'Lead and grow a team of engineers',
      whyItFits: 'Interest in mentoring and team quality',
      salaryRange: { entry: '$140k', experienced: '$200k' },
      skillsHave: ['Technical skills', 'Collaboration'],
      skillsNeed: ['People management', 'Hiring', 'Coaching'],
      timeline: '1-2 years',
      riskLevel: 'medium',
      dayInTheLife: 'One-on-ones, sprint planning, removing blockers for the team.',
    },
  ]
}

export function createMockScores(): Record<string, Record<string, MatrixScore>> {
  const paths = ['path-1', 'path-2', 'path-3', 'path-4']
  const criteria = ['salary', 'workLife', 'learning', 'creative', 'demand', 'transition']
  const scoreData: number[][] = [
    [4, 4, 5, 4, 5, 5], // path-1
    [3, 3, 4, 3, 4, 3], // path-2
    [3, 4, 4, 5, 3, 4], // path-3
    [5, 3, 3, 2, 4, 2], // path-4
  ]
  const scores: Record<string, Record<string, MatrixScore>> = {}
  for (let p = 0; p < paths.length; p++) {
    scores[paths[p]] = {}
    for (let c = 0; c < criteria.length; c++) {
      scores[paths[p]][criteria[c]] = {
        score: scoreData[p][c],
        rationale: `Rationale for ${paths[p]} ${criteria[c]}`,
        isOverridden: false,
      }
    }
  }
  return scores
}

export function createMockActionPlan(): ActionPlan {
  return {
    targetPathId: 'path-1',
    targetPathTitle: 'Senior Frontend Engineer',
    phases: [
      {
        title: 'Research & Foundations',
        timeframe: 'Days 1-30',
        items: ['Study system design patterns', 'Set up a design system project', 'Read "Refactoring UI"'],
      },
      {
        title: 'Build & Practice',
        timeframe: 'Days 31-60',
        items: ['Build a component library', 'Contribute to open source', 'Practice performance audits'],
      },
      {
        title: 'Launch & Apply',
        timeframe: 'Days 61-90',
        items: ['Apply to senior roles', 'Prepare portfolio', 'Do mock interviews'],
      },
    ],
    resources: ['Frontend Masters', 'Kent C. Dodds blog'],
    resumeTips: ['Highlight architecture decisions', 'Show measurable impact'],
    interviewPrep: ['Practice system design', 'Prepare STAR stories'],
    riskMitigation: ['Keep current job while interviewing', 'Build network first'],
  }
}

export function createFullWizardState(): WizardState {
  return {
    currentStep: 5,
    reflection: createCompletedReflection(),
    paths: createMockPaths(),
    selectedPathIds: ['path-1', 'path-3'],
    matrix: {
      ...createInitialMatrix(),
      scores: createMockScores(),
    },
    actionPlan: createMockActionPlan(),
  }
}

export function createInitialWizardState(): WizardState {
  return {
    currentStep: 1,
    reflection: createInitialReflection(),
    paths: [],
    selectedPathIds: [],
    matrix: createInitialMatrix(),
    actionPlan: null,
  }
}
