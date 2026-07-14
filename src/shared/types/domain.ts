export type SectorKey = 'focus' | 'body' | 'money' | 'stability' | 'energy'
export type ModeKey = 'low' | 'stable' | 'high' | 'drifted'
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
  heightCm?: number
  birthYear?: number
  sex?: 'male' | 'female' | 'not_specified'
  bodyGoal?: 'weight_loss' | 'maintain' | 'energy' | 'health' | 'not_set'
  targetWeightKg?: number
  targetPace?: 'calm' | 'moderate' | 'active'
  activityLevel?: 'low' | 'medium' | 'high'
  usualSleepTime?: string
  usualWakeTime?: string
  bodyLimitations?: string
}

export interface AccountSettingsProfile extends SettingsProfile {
  userId: string
  syncVersion: number
  updatedAt: string
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

export type BodyNutritionStatus =
  | 'Не выбрано'
  | 'Нормально'
  | 'Переел'
  | 'Сорвался'
  | 'Мало белка'
  | 'Поздний ужин'
  | 'Сладкое'

export type BodyMovementType =
  | 'Не выбрано'
  | 'Без тренировки'
  | 'Прогулка'
  | 'Домашняя'
  | 'Зал'
  | 'Растяжка'

export interface BodySnapshot extends UserScopedEntity {
  date: string
  weightKg: number
  weightTrendKg: number
  waterLiters: number
  steps: number
  workout: string
  workoutDone: boolean
  foodDiscipline: number
  nutritionStatus: BodyNutritionStatus
  movementType: BodyMovementType
  quickAction: string
}

export interface BodyDailyLog extends UserScopedEntity {
  date: string
  weightKg?: number
  waterLiters: number
  steps: number
  workoutDone: boolean
  workout?: string
  nutritionStatus?: BodyNutritionStatus
  movementType?: BodyMovementType
}

export interface BodyLog extends BodyDailyLog {
  weightTrendKg?: number
  foodDiscipline?: number
  quickAction?: string
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

export type MoneyAccountType = 'cash' | 'debit_card' | 'savings' | 'credit_card' | 'other'
export type MoneyTransactionType = 'income' | 'expense' | 'adjustment'
export type MoneyAdjustmentDirection = 'increase' | 'decrease'
export type MoneyTransactionSource = 'manual' | 'sber_pdf' | 'sber_text' | 'unknown'
export type MoneyAccountSource = 'manual' | 'sber' | 'unknown'
export type MoneyExpenseCategory =
  | 'food'
  | 'transport'
  | 'housing'
  | 'health'
  | 'education'
  | 'subscriptions'
  | 'entertainment'
  | 'debt_payment'
  | 'savings'
  | 'other'
export type MoneyIncomeCategory =
  | 'salary'
  | 'scholarship'
  | 'gift'
  | 'refund'
  | 'freelance'
  | 'other_income'
export type MoneyCategory = MoneyExpenseCategory | MoneyIncomeCategory
export type PlannedPaymentType = 'expense' | 'income'
export type PlannedPaymentStatus = 'planned' | 'completed' | 'skipped'
export type DebtStatus = 'active' | 'closed'

export interface MoneyAccount extends UserScopedEntity {
  id: string
  name: string
  type: MoneyAccountType
  openingBalance: number
  createdAt: string
  updatedAt: string
  isArchived: boolean
  source?: MoneyAccountSource
  last4?: string
  creditLimit?: number
  debt?: number
}

export interface MoneyTransaction extends UserScopedEntity {
  id: string
  accountId: string
  type: MoneyTransactionType
  amount: number
  category: MoneyCategory
  title: string
  transactionDate: string
  note?: string
  createdAt: string
  updatedAt: string
  plannedPaymentId?: string
  debtId?: string
  adjustmentDirection?: MoneyAdjustmentDirection
  idempotencyKey?: string
  source?: MoneyTransactionSource
  importHash?: string
  importFingerprint?: string
  externalId?: string
  accountLast4?: string
  rawDescription?: string
}

export interface PlannedPayment extends UserScopedEntity {
  id: string
  title: string
  amount: number
  type: PlannedPaymentType
  category: MoneyCategory
  accountId?: string
  dueDate: string
  note?: string
  isMandatory: boolean
  status: PlannedPaymentStatus
  completedTransactionId?: string
  repeatMonthly?: boolean
  createdAt: string
  updatedAt: string
}

export interface Debt extends UserScopedEntity {
  id: string
  title: string
  originalAmount: number
  remainingAmount: number
  minimumPayment?: number
  nextPaymentDate?: string
  note?: string
  status: DebtStatus
  createdAt: string
  updatedAt: string
}

export interface MonthlyMoneyPlan extends UserScopedEntity {
  id: string
  month: string
  expectedIncome: number
  mandatoryExpenses: number
  debtPaymentTarget: number
  savingsTarget: number
  flexibleSpendingLimit: number
  note?: string
  createdAt: string
  updatedAt: string
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

export type PromptImportDomain = 'today' | 'plan' | 'body' | 'money' | 'rescue' | 'core'
export type PromptImportDifficulty = 'easy' | 'medium' | 'hard'

export interface LifeQuestSuggestedAction {
  title: string
  domain: PromptImportDomain
  difficulty: PromptImportDifficulty
  xp: number
}

export interface LifeQuestPromptResponse {
  summary: string
  todayMainQuest: string
  quickWin: string
  recoveryAction: string
  bodyFocus: string
  moneyFocus: string
  risk: string
  coreMessage: string
  suggestedActions: LifeQuestSuggestedAction[]
}

export type WeeklyReviewDataQuality = 'low' | 'medium' | 'good'

export interface WeeklyReviewRecord extends UserScopedEntity {
  id: string
  createdAt: string
  weekStart?: string
  weekEnd?: string
  dataQuality?: WeeklyReviewDataQuality
  summary: string
  bodyFocus?: string
  moneyFocus?: string
  risk?: string
  coreMessage?: string
  suggestedActionsCount: number
  appliedActionsCount: number
  rawTextNote?: string
}

export interface WeeklyReviewSummary extends WeeklyReviewRecord {
  periodStart: string
  periodEnd: string
  coreMessage: string
  bodyFocus: string
  moneyFocus: string
  risk: string
  suggestedActions: LifeQuestSuggestedAction[]
  source: 'weekly_review'
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
