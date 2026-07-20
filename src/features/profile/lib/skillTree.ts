import { defaultCompanionCustomization } from '@/features/companion/lib/customization'
import { getLocalDateKey } from '@/shared/lib/date'
import type {
  BodyDailyLog,
  BodySnapshot,
  CompanionProfile,
  DailyProgressSummary,
  DailyQuest,
  DailyQuestCompletion,
  LifeQuestMilestone,
  LifeQuestMilestoneDomain,
  ModeKey,
  MoneyAccount,
  MoneyTransaction,
  PlannedPayment,
  Debt,
  SectorProgress,
  TodayRoute,
} from '@/shared/types'

export type LifeQuestSkillModuleId =
  | 'body'
  | 'money'
  | 'focus'
  | 'recovery'
  | 'system'
  | 'companion'

export type LifeQuestSkillModuleState = 'locked' | 'forming' | 'active' | 'stable' | 'evolving'

export interface LifeQuestSkillModule {
  id: LifeQuestSkillModuleId
  label: string
  levelLabel: string
  progressPercent: number
  state: LifeQuestSkillModuleState
  summary: string
  nextSignal: string
  relatedMilestoneCount: number
  recentMilestones: Array<{
    id: string
    title: string
  }>
  linkedQuest?: {
    title: string
    status: 'waiting' | 'completed'
  }
}

interface SkillTreeSettingsInput {
  onboarding?: {
    completed: boolean
    skipped: boolean
  }
  lastBackupAt?: string | null
  lastBackupExportAt?: string | null
  userName?: string
  userRole?: string
  heightCm?: number
  bodyGoal?: string
  targetWeightKg?: number
  activityLevel?: string
  usualSleepTime?: string
  usualWakeTime?: string
}

interface SkillTreeProgressInput {
  level: number
  currentLevelXp: number
  nextLevelXp: number
  recoveryXp: number
  sectors: SectorProgress[]
  dailySummary: DailyProgressSummary
}

interface SkillTreeBodyInput {
  today: BodySnapshot
  dailyLogs: BodyDailyLog[]
}

interface SkillTreeMoneyInput {
  accounts: MoneyAccount[]
  transactions: MoneyTransaction[]
  plannedPayments?: PlannedPayment[]
  debts?: Debt[]
  trackingStartDate?: string
  lastImportAt?: string
  lastBalanceCheckAt?: string
  importWarnings: string[]
}

interface SkillTreeWeeklyInput {
  summaries: Array<{
    id: string
    createdAt: string
  }>
}

interface SkillTreeTodayInput {
  currentMode: ModeKey
  route: TodayRoute
  dailyQuest?: DailyQuest
  dailyQuestCompletion?: DailyQuestCompletion | null
}

export interface SkillTreeInput {
  settings: SkillTreeSettingsInput
  progress: SkillTreeProgressInput
  companion: CompanionProfile
  body: SkillTreeBodyInput
  money: SkillTreeMoneyInput
  weekly: SkillTreeWeeklyInput
  today: SkillTreeTodayInput
  milestones: LifeQuestMilestone[]
}

const stateLabels: Record<LifeQuestSkillModuleState, string> = {
  locked: 'Нужны первые сигналы',
  forming: 'База собирается',
  active: 'Модуль активен',
  stable: 'База стабильна',
  evolving: 'Готовится виток',
}

const milestoneDomainsByModule: Record<LifeQuestSkillModuleId, LifeQuestMilestoneDomain[]> = {
  body: ['body'],
  money: ['money'],
  focus: ['focus'],
  recovery: ['recovery', 'system'],
  system: ['system'],
  companion: ['companion'],
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.min(100, Math.max(0, Math.round(value)))
}

function getSectorPercent(sectors: SectorProgress[], keys: string[]) {
  const matched = sectors.filter((sector) => keys.includes(sector.key))

  if (!matched.length) {
    return undefined
  }

  return clampPercent(matched.reduce((sum, sector) => sum + sector.percent, 0) / matched.length)
}

function hasBodySignal(body: SkillTreeBodyInput) {
  return (
    body.today.waterLiters > 0 ||
    body.today.steps > 0 ||
    body.today.workoutDone ||
    body.today.nutritionStatus !== 'Не выбрано' ||
    body.today.movementType !== 'Не выбрано' ||
    body.dailyLogs.length > 0
  )
}

function hasRoute(route: TodayRoute) {
  return Boolean(route.mainQuest || route.quickWin || route.recoveryQuest)
}

function hasCompletedRouteItem(route: TodayRoute) {
  return [route.mainQuest, route.quickWin, route.recoveryQuest].some((quest) => quest?.status === 'complete')
}

function hasCompanionCustomization(companion: CompanionProfile) {
  const customization = companion.customization ?? defaultCompanionCustomization

  return (
    customization.displayName !== defaultCompanionCustomization.displayName ||
    customization.accent !== defaultCompanionCustomization.accent ||
    customization.shell !== defaultCompanionCustomization.shell
  )
}

function getModuleState(progressPercent: number, hasSignal: boolean): LifeQuestSkillModuleState {
  if (!hasSignal) {
    return 'locked'
  }

  if (progressPercent >= 88) return 'evolving'
  if (progressPercent >= 68) return 'stable'
  if (progressPercent >= 35) return 'active'

  return 'forming'
}

function getMilestonesForModule(moduleId: LifeQuestSkillModuleId, milestones: LifeQuestMilestone[]) {
  const domains = milestoneDomainsByModule[moduleId]

  return milestones
    .filter((milestone) => domains.includes(milestone.domain))
    .sort((left, right) => Date.parse(right.unlockedAt) - Date.parse(left.unlockedAt))
}

function compactTitle(value: string | undefined, fallback: string, maxLength = 64) {
  const text = value?.replace(/\s+/g, ' ').trim() ?? ''
  const safeText = text || fallback

  if (safeText.length <= maxLength) {
    return safeText
  }

  return `${safeText.slice(0, maxLength - 1).trim()}…`
}

function getSafeLinkedQuestTitle(quest: DailyQuest) {
  if (quest.domain === 'focus') {
    return 'Закрыть один быстрый шаг'
  }

  const titles: Record<DailyQuest['domain'], string> = {
    body: 'Собрать сигнал тела',
    money: 'Проверить финансовую базу',
    focus: 'Закрыть один быстрый шаг',
    recovery: 'Снизить перегруз',
    system: 'Укрепить систему',
  }

  return compactTitle(quest.title, titles[quest.domain])
}

function getLinkedQuest(moduleId: LifeQuestSkillModuleId, input: SkillTreeInput) {
  const quest = input.today.dailyQuest

  if (!quest) {
    return undefined
  }

  const questModuleId: LifeQuestSkillModuleId =
    quest.domain === 'recovery' || quest.domain === 'system' ? quest.domain : quest.domain

  if (questModuleId !== moduleId) {
    return undefined
  }

  return {
    title: getSafeLinkedQuestTitle(quest),
    status: quest.completedAt ? 'completed' : 'waiting',
  } satisfies LifeQuestSkillModule['linkedQuest']
}

function buildModule(input: {
  id: LifeQuestSkillModuleId
  label: string
  progressPercent: number
  hasSignal: boolean
  summary: string
  nextSignal: string
  source: SkillTreeInput
}): LifeQuestSkillModule {
  const state = getModuleState(input.progressPercent, input.hasSignal)
  const milestones = getMilestonesForModule(input.id, input.source.milestones)

  return {
    id: input.id,
    label: input.label,
    levelLabel: stateLabels[state],
    progressPercent: clampPercent(input.progressPercent),
    state,
    summary: input.summary,
    nextSignal: input.nextSignal,
    relatedMilestoneCount: milestones.length,
    recentMilestones: milestones.slice(0, 2).map((milestone) => ({
      id: milestone.id,
      title: compactTitle(milestone.title, 'Веха зафиксирована'),
    })),
    linkedQuest: getLinkedQuest(input.id, input.source),
  }
}

function getBodyProgress(input: SkillTreeInput) {
  const sectorPercent = getSectorPercent(input.progress.sectors, ['body'])
  let derived = 14

  if (input.body.today.waterLiters > 0) derived += 14
  if (input.body.today.steps > 0) derived += 12
  if (input.body.today.workoutDone) derived += 14
  if (input.body.today.nutritionStatus !== 'Не выбрано') derived += 10
  if (input.body.today.movementType !== 'Не выбрано') derived += 10
  if (input.body.dailyLogs.length > 0) derived += 14

  return sectorPercent ?? clampPercent(derived)
}

function getMoneyProgress(input: SkillTreeInput) {
  const sectorPercent = getSectorPercent(input.progress.sectors, ['money'])
  const activeAccounts = input.money.accounts.filter((account) => !account.isArchived)
  let derived = 14

  if (input.money.trackingStartDate) derived += 16
  if (activeAccounts.length > 0) derived += 14
  if (input.money.lastImportAt || input.money.transactions.length > 0) derived += 18
  if (input.money.lastBalanceCheckAt) derived += 10
  if ((input.money.plannedPayments?.length ?? 0) > 0 || (input.money.debts?.length ?? 0) > 0) derived += 12
  if (input.money.importWarnings.length === 0 && (activeAccounts.length > 0 || input.money.transactions.length > 0)) {
    derived += 8
  }

  return sectorPercent ?? clampPercent(derived)
}

function getFocusProgress(input: SkillTreeInput) {
  const sectorPercent = getSectorPercent(input.progress.sectors, ['focus'])
  let derived = hasRoute(input.today.route) ? 32 : 16

  if (input.today.dailyQuest) derived += 16
  if (input.today.dailyQuestCompletion?.date === getLocalDateKey()) derived += 18
  if (input.progress.dailySummary.completedTasks > 0 || hasCompletedRouteItem(input.today.route)) derived += 18

  return sectorPercent ?? clampPercent(derived)
}

function getRecoveryProgress(input: SkillTreeInput) {
  const sectorPercent = getSectorPercent(input.progress.sectors, ['stability', 'energy'])
  let derived = 20

  if (input.today.currentMode === 'low' || input.today.currentMode === 'drifted') derived += 12
  if (input.today.route.recoveryQuest) derived += 14
  if (input.progress.recoveryXp > 0) derived += 18
  if (input.weekly.summaries.length > 0) derived += 12

  return sectorPercent ?? clampPercent(derived)
}

function getSystemProgress(input: SkillTreeInput) {
  let derived = 12
  const profileSignals = [
    input.settings.userName,
    input.settings.userRole,
    input.settings.heightCm,
    input.settings.bodyGoal,
    input.settings.targetWeightKg,
    input.settings.activityLevel,
    input.settings.usualSleepTime,
    input.settings.usualWakeTime,
  ].filter(Boolean).length

  if (input.settings.onboarding?.completed || input.settings.onboarding?.skipped) derived += 24
  if (input.settings.lastBackupAt || input.settings.lastBackupExportAt) derived += 24
  derived += Math.min(24, profileSignals * 4)
  if (input.milestones.some((milestone) => milestone.domain === 'system')) derived += 12

  return clampPercent(derived)
}

function getCompanionProgress(input: SkillTreeInput) {
  let derived = 18

  if (hasCompanionCustomization(input.companion)) derived += 24
  if (input.companion.evolutionLevel >= 4) derived += 18
  if (input.companion.evolutionLevel >= 7) derived += 14
  if (input.companion.activeMessage) derived += 10
  if (input.milestones.some((milestone) => milestone.domain === 'companion')) derived += 12

  return clampPercent(derived)
}

export function buildLifeQuestSkillTree(input: SkillTreeInput): LifeQuestSkillModule[] {
  const bodyHasSignal = hasBodySignal(input.body)
  const moneyHasSignal =
    Boolean(input.money.trackingStartDate) ||
    input.money.accounts.some((account) => !account.isArchived) ||
    input.money.transactions.length > 0 ||
    Boolean(input.money.lastImportAt)
  const focusHasSignal = hasRoute(input.today.route) || input.progress.dailySummary.completedTasks > 0
  const recoveryHasSignal =
    input.progress.recoveryXp > 0 ||
    Boolean(input.today.route.recoveryQuest) ||
    input.today.currentMode === 'low' ||
    input.today.currentMode === 'drifted' ||
    input.weekly.summaries.length > 0
  const systemHasSignal =
    Boolean(input.settings.onboarding?.completed || input.settings.onboarding?.skipped) ||
    Boolean(input.settings.lastBackupAt || input.settings.lastBackupExportAt)
  const companionHasSignal =
    hasCompanionCustomization(input.companion) ||
    input.companion.evolutionLevel > 1 ||
    input.milestones.some((milestone) => milestone.domain === 'companion')

  return [
    buildModule({
      id: 'body',
      label: 'Тело',
      progressPercent: getBodyProgress(input),
      hasSignal: bodyHasSignal,
      summary: 'Телесная база',
      nextSignal: bodyHasSignal ? 'Обновить чек-ин тела' : 'Собрать первый чек-ин тела',
      source: input,
    }),
    buildModule({
      id: 'money',
      label: 'Деньги',
      progressPercent: getMoneyProgress(input),
      hasSignal: moneyHasSignal,
      summary: 'Финансовая база',
      nextSignal: input.money.lastImportAt ? 'Обновить импорт или сверить баланс' : 'Создать финансовую базу',
      source: input,
    }),
    buildModule({
      id: 'focus',
      label: 'Фокус',
      progressPercent: getFocusProgress(input),
      hasSignal: focusHasSignal,
      summary: 'Маршрут дня',
      nextSignal: input.today.dailyQuestCompletion?.date === getLocalDateKey()
        ? 'Закрепить один мягкий следующий шаг'
        : 'Выполнить главный квест',
      source: input,
    }),
    buildModule({
      id: 'recovery',
      label: 'Восстановление',
      progressPercent: getRecoveryProgress(input),
      hasSignal: recoveryHasSignal,
      summary: 'Контур устойчивости',
      nextSignal: input.today.currentMode === 'low' ? 'Снизить нагрузку на сегодня' : 'Оставить запасной маршрут',
      source: input,
    }),
    buildModule({
      id: 'system',
      label: 'Система',
      progressPercent: getSystemProgress(input),
      hasSignal: systemHasSignal,
      summary: 'Профиль и защита базы',
      nextSignal: input.settings.lastBackupAt || input.settings.lastBackupExportAt ? 'Уточнить профиль системы' : 'Создать резервную копию',
      source: input,
    }),
    buildModule({
      id: 'companion',
      label: 'Companion',
      progressPercent: getCompanionProgress(input),
      hasSignal: companionHasSignal,
      summary: 'Companion Core',
      nextSignal: hasCompanionCustomization(input.companion)
        ? 'Держать устойчивые сигналы для нового витка'
        : 'Настроить имя и оболочку Core',
      source: input,
    }),
  ]
}
