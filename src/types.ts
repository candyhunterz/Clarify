export interface ReflectionAnswers {
  energizers: string[]
  drainers: string[]
  keepInJob: string
  priorities: Record<string, number>
  codingIn5Years: string
  energyLevel: number
  learningInterests: string[]
  successVision: string
}

export const PRIORITY_KEYS = [
  'salary',
  'flexibility',
  'creativeFreedom',
  'teamQuality',
  'learningOpportunity',
  'impactMeaning',
  'stability',
  'leadershipPath',
] as const

export const PRIORITY_LABELS: Record<string, string> = {
  salary: 'Salary',
  flexibility: 'Flexibility',
  creativeFreedom: 'Creative Freedom',
  teamQuality: 'Team Quality',
  learningOpportunity: 'Learning Opportunity',
  impactMeaning: 'Impact / Meaning',
  stability: 'Stability',
  leadershipPath: 'Leadership Path',
}

export const ENERGIZER_OPTIONS = [
  'Building UI',
  'Solving bugs',
  'System design',
  'Mentoring',
  'Learning new tech',
  'Writing docs',
  'Talking to users',
  'None of these',
]

export const DRAINER_OPTIONS = [
  'Repetitive tasks',
  'Meetings',
  'Unclear requirements',
  'Legacy code',
  'Lack of growth',
  'Politics',
  'Isolation',
  'On-call',
]

export const LEARNING_OPTIONS = [
  'Tech / coding',
  'Design',
  'Business / startups',
  'Writing',
  'Teaching',
  'Something non-tech',
]

export const CODING_5YR_OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'maybe', label: 'Maybe' },
  { value: 'no', label: 'No' },
  { value: 'not-sure', label: 'Not sure' },
]

export const WIZARD_STEPS = [
  { number: 1, label: 'Reflect' },
  { number: 2, label: 'Explore' },
  { number: 3, label: 'Compare' },
  { number: 4, label: 'Plan' },
  { number: 5, label: 'Summary' },
] as const

export interface CareerPath {
  id: string
  title: string
  description: string
  whyItFits: string
  salaryRange: { entry: string; experienced: string }
  skillsHave: string[]
  skillsNeed: string[]
  timeline: string
  riskLevel: 'low' | 'medium' | 'high'
  dayInTheLife: string
}

export const MATRIX_CRITERIA = [
  { id: 'salary', label: 'Salary / financial growth' },
  { id: 'workLife', label: 'Work-life balance / flexibility' },
  { id: 'learning', label: 'Learning & growth potential' },
  { id: 'creative', label: 'Creative fulfillment' },
  { id: 'demand', label: 'Job market demand / stability' },
  { id: 'transition', label: 'Transition difficulty (easier = higher)' },
] as const

export interface MatrixScore {
  score: number
  rationale: string
  isOverridden: boolean
}

export interface MatrixState {
  weights: Record<string, number>
  scores: Record<string, Record<string, MatrixScore>>
}

export function createInitialMatrix(): MatrixState {
  const weights: Record<string, number> = {}
  for (const c of MATRIX_CRITERIA) {
    weights[c.id] = 3
  }
  return { weights, scores: {} }
}

export interface ActionPlanPhase {
  title: string
  timeframe: string
  items: string[]
}

export interface ActionPlan {
  targetPathId: string
  targetPathTitle: string
  phases: ActionPlanPhase[]
  resources: string[]
  resumeTips: string[]
  interviewPrep: string[]
  riskMitigation: string[]
}

export interface WizardState {
  currentStep: number
  reflection: ReflectionAnswers
  paths: CareerPath[]
  selectedPathIds: string[]
  matrix: MatrixState
  actionPlan: ActionPlan | null
}

export function createInitialReflection(): ReflectionAnswers {
  const priorities: Record<string, number> = {}
  for (const key of PRIORITY_KEYS) {
    priorities[key] = 3
  }
  return {
    energizers: [],
    drainers: [],
    keepInJob: '',
    priorities,
    codingIn5Years: '',
    energyLevel: 3,
    learningInterests: [],
    successVision: '',
  }
}
