export type SectorKey = 'focus' | 'body' | 'money' | 'stability' | 'energy'
export type ModeKey = 'low' | 'stable' | 'high' | 'drifted'
export type AuthMode = 'local' | 'account'
export type PreferredTone = 'calm' | 'direct' | 'supportive'
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
export type QuestEffort = 'tiny' | 'light' | 'medium' | 'heavy'
export type QuestImpact = 'small' | 'medium' | 'high'

interface UserScopedEntity {
  userId?: string
}

export interface UserProfile extends UserScopedEntity {
  id: string
  name: string
  title: string
  mainGoal: string
  relevantGoals: string[]
  timezone: string
}

export interface SettingsProfile extends UserScopedEntity {
  userName: string
  userRole: string
  preferredTone: PreferredTone
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

export interface Quest extends UserScopedEntity {
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

export type QuestItem = Quest

export interface DailyRoute extends UserScopedEntity {
  date?: string
  mainQuest: Quest | null
  quickWin: Quest | null
  recoveryQuest: Quest | null
}

export type TodayRoute = DailyRoute
export type TodayRouteKey = keyof Pick<DailyRoute, 'mainQuest' | 'quickWin' | 'recoveryQuest'>

export interface SectorProgress {
  key: SectorKey
  label: string
  level: number
  percent: number
  xp: number
  color: string
}

export interface DailyProgressSummary {
  date: string
  xpToday: number
  completedTasks: number
  sectorXp: Record<SectorKey, number>
}

export interface ProgressProfile extends UserScopedEntity {
  level: number
  totalXp: number
  currentLevelXp: number
  nextLevelXp: number
  actionXp: number
  consistencyXp: number
  recoveryXp: number
  achievements: string[]
  sectors: SectorProgress[]
  dailySummary: DailyProgressSummary
}

export interface ProgressReward {
  xp: number
  recoveryXp?: number
  consistencyXp?: number
  sector: SectorKey
  completedTask?: boolean
  sourceId?: string
}

export interface BodySnapshot extends UserScopedEntity {
  weightKg: number
  weightTrendKg: number
  waterLiters: number
  steps: number
  workout: string
  workoutDone: boolean
  foodDiscipline: number
  quickAction: string
}

export interface BodyLog extends BodySnapshot {
  date?: string
}

export interface MoneySnapshot extends UserScopedEntity {
  balance: number
  weeklyDelta: number
  debt: number
  debtGoal: number
  calmNote: string
  history: number[]
}

export interface MoneyLog extends MoneySnapshot {
  date?: string
  notes?: string
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

export interface RescueLog extends UserScopedEntity {
  id: string
  date?: string
  problemId: string
  problemLabel: string
  suggestionTitle: string
  accepted: boolean
  completed: boolean
  sector: SectorKey
  rewardXp: number
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
  preferredTone: PreferredTone
  relevantGoals: string[]
  activeQuests: string[]
  parkedQuests: string[]
  progressSummary: string[]
  userRequest: string
  preferredResponseFormat: string
}

export interface CompanionProfile extends UserScopedEntity {
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
