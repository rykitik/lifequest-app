export type SectorKey = 'focus' | 'body' | 'money' | 'stability' | 'energy'
export type ModeKey = 'low' | 'stable' | 'high' | 'drifted'
export type CompanionState =
  | 'idle'
  | 'focused'
  | 'low_energy'
  | 'overloaded'
  | 'recovering'
  | 'evolving'

export type QuestStatus = 'ready' | 'active' | 'complete' | 'parked'
export type QuestClassification =
  | 'focus'
  | 'quick_win'
  | 'body'
  | 'money'
  | 'stability'
  | 'later'

export interface UserProfile {
  id: string
  name: string
  title: string
  mainGoal: string
  relevantGoals: string[]
  timezone: string
}

export interface TodayModeOption {
  key: ModeKey
  label: string
  description: string
  energyHint: string
  companionState: CompanionState
  accent: string
}

export interface QuestStep {
  id: string
  label: string
  minutes: number
  done: boolean
}

export interface QuestItem {
  id: string
  title: string
  subtitle: string
  minutes: number
  xp: number
  sector: SectorKey
  progress: number
  status: QuestStatus
  classification?: QuestClassification
  steps?: QuestStep[]
}

export interface TodayRoute {
  mainQuest: QuestItem
  quickWin: QuestItem
  recoveryQuest: QuestItem
}

export type TodayRouteKey = keyof TodayRoute

export interface SectorProgress {
  key: SectorKey
  label: string
  level: number
  percent: number
  xp: number
  color: string
}

export interface ProgressProfile {
  level: number
  totalXp: number
  currentLevelXp: number
  nextLevelXp: number
  actionXp: number
  consistencyXp: number
  recoveryXp: number
  achievements: string[]
  sectors: SectorProgress[]
}

export interface ProgressReward {
  xp: number
  recoveryXp?: number
  consistencyXp?: number
  sector: SectorKey
}

export interface BodySnapshot {
  weightKg: number
  weightTrendKg: number
  waterLiters: number
  steps: number
  workout: string
  workoutDone: boolean
  foodDiscipline: number
  quickAction: string
}

export interface MoneySnapshot {
  balance: number
  weeklyDelta: number
  debt: number
  debtGoal: number
  calmNote: string
  history: number[]
}

export interface MoneyAction {
  id: string
  label: string
  minutes: number
  completed: boolean
  rewardXp: number
}

export interface RescueProblem {
  id: string
  label: string
  description: string
  suggestion: string
  supportNote: string
  rewardXp: number
  sector: SectorKey
}

export interface RescueSuggestion {
  title: string
  steps: string[]
  rewardXp: number
  sector: SectorKey
  supportNote: string
}

export interface PromptCard {
  id: string
  title: string
  description: string
  promptHint: string
  preferredFormat: string
}

export interface PromptContext {
  currentMode: string
  mainQuest: string
  quickWin: string
  recoveryOption: string
  relevantGoals: string[]
  userRequest: string
  preferredResponseFormat: string
}

export interface CompanionProfile {
  mood: CompanionState
  evolutionLevel: number
  activeMessage: string
  stabilityScore: number
}

export interface CompanionContext {
  mode: ModeKey
  level: number
  stability: number
  isRecovering: boolean
}
