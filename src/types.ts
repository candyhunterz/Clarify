export interface ReflectionAnswers {
  energizers: string[]
  drainers: string[]
  keepInJob: string
  priorities: Record<string, number>
  codingIn5Years: string
  energyLevel: number
  learningInterests: string[]
  successVision: string
  // Deep reflection questions
  regretDecision: string
  goodAtButDontWant: string
  ifMoneyEqual: string
  beliefToChange: string
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
  { number: 2, label: 'Discover' },
  { number: 3, label: 'Explore' },
  { number: 4, label: 'Compare' },
  { number: 5, label: 'Commit' },
  { number: 6, label: 'Plan' },
  { number: 7, label: 'Summary' },
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
  // Enhanced fields
  biggestRisk?: {
    belief: string
    reframe: string
    earlyActions: string[]
  }
  identityMilestones?: Array<{
    timeframe: string
    milestone: string
  }>
  checkpoints?: Array<{
    timeframe: string
    question: string
    greenLight: string
    offRamp: string
  }>
}

export interface Tension {
  description: string
  question: string
  response: string
  resolution: string
}

export interface CoreValue {
  value: string
  rank: number
  evidence: string
}

export interface HiddenBlocker {
  belief: string
  source: string
}

export interface ConversationMessage {
  role: 'assistant' | 'user'
  content: string
}

export interface InsightProfile {
  tensions: Tension[]
  coreValues: CoreValue[]
  hiddenBlockers: HiddenBlocker[]
  narrative: string
  conversationLog: ConversationMessage[]
}

export function createInitialInsightProfile(): InsightProfile {
  return {
    tensions: [],
    coreValues: [],
    hiddenBlockers: [],
    narrative: '',
    conversationLog: [],
  }
}

export interface ValueEntry {
  value: string
  aiRank: number
  userRank: number
  evidence: string
  sliderConflict?: string
}

export interface ValuesHierarchy {
  values: ValueEntry[]
}

export function createInitialValuesHierarchy(): ValuesHierarchy {
  return { values: [] }
}

export interface ScoreAdjustment {
  criterionId: string
  suggestedScore: number
  rationale: string
  accepted: boolean | null
}

export interface PathExploration {
  pathId: string
  messages: ConversationMessage[]
  suggestedScoreAdjustments: ScoreAdjustment[]
}

export interface ConvictionCheck {
  matrixTopPath: string
  chosenPath: string
  response: 'yes' | 'unsure' | 'override'
  conversation: ConversationMessage[]
  reasoning: string
}

export interface Scenario {
  name: string
  weights: Record<string, number>
  isPreset: boolean
}

export interface SensitivityResult {
  pathId: string
  winsInScenarios: number
  totalScenarios: number
  isRobust: boolean
}

export interface WizardState {
  currentStep: number
  reflection: ReflectionAnswers
  insightProfile: InsightProfile
  valuesHierarchy: ValuesHierarchy
  paths: CareerPath[]
  selectedPathIds: string[]
  pathExplorations: PathExploration[]
  matrix: MatrixState
  scenarios: Scenario[]
  convictionCheck: ConvictionCheck | null
  actionPlan: ActionPlan | null
  personalNarrative: string
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
    regretDecision: '',
    goodAtButDontWant: '',
    ifMoneyEqual: '',
    beliefToChange: '',
  }
}
