import { getCompanionMoodLabel } from '@/features/companion/lib/evolution'
import { getLocalDateKey } from '@/shared/lib/date'
import type {
  BodyDailyLog,
  BodySnapshot,
  CompanionProfile,
  DailyProgressSummary,
  ModeKey,
  MoneyAccount,
  MoneyTransaction,
  SectorProgress,
  TodayRoute,
} from '@/shared/types'
import type { TodayNextStepRecommendation } from '@/services/todayNextStep'

export type SystemProfileModuleId = 'body' | 'money' | 'focus' | 'recovery'

export interface SystemProfileModule {
  id: SystemProfileModuleId
  label: string
  compactLabel: string
  value: number
  caption: string
}

export interface SystemProfileMilestone {
  id: string
  label: string
  caption?: string
  createdAt?: string
}

export interface SystemProfileViewModel {
  userName: string
  title: string
  systemLevel: number
  systemProgressPercent: number
  systemStatus: string
  localModeLabel: string
  companionForm: string
  companionState: string
  companionMessage: string
  nextEvolutionLabel: string
  nextEvolutionProgressPercent: number
  nextEvolutionRemainingPercent: number
  modules: SystemProfileModule[]
  recentMilestones: SystemProfileMilestone[]
  milestoneEmptyText: string
  nextStep: {
    label: string
    caption?: string
    actionLabel?: string
  }
  xpSignals: {
    totalXp: number
    todayXp: number
    recoveryXp: number
  }
}

interface SystemProfileSettingsInput {
  userName?: string
  userRole?: string
  lastBackupAt?: string | null
  lastBackupExportAt?: string | null
  onboarding?: {
    completed: boolean
    skipped: boolean
  }
}

interface SystemProfileProgressInput {
  level: number
  totalXp: number
  currentLevelXp: number
  nextLevelXp: number
  recoveryXp: number
  sectors: SectorProgress[]
  dailySummary: DailyProgressSummary
}

interface SystemProfileBodyInput {
  today: BodySnapshot
  dailyLogs: BodyDailyLog[]
}

interface SystemProfileMoneyInput {
  accounts: MoneyAccount[]
  transactions: MoneyTransaction[]
  trackingStartDate?: string
  lastImportAt?: string
  lastBalanceCheckAt?: string
  importWarnings: string[]
}

interface SystemProfileWeeklyInput {
  summaries: Array<{
    id: string
    createdAt: string
  }>
}

interface SystemProfileTodayInput {
  currentMode: ModeKey
  route: TodayRoute
}

export interface SystemProfileInput {
  settings: SystemProfileSettingsInput
  progress: SystemProfileProgressInput
  companion: CompanionProfile
  body: SystemProfileBodyInput
  money: SystemProfileMoneyInput
  weekly: SystemProfileWeeklyInput
  today: SystemProfileTodayInput
  nextStep?: TodayNextStepRecommendation
}

const milestoneEmptyText = 'Первые вехи появятся после чек-ина, импорта или недельного обзора.'

function compactText(value: string | undefined, maxLength = 120) {
  const text = value?.replace(/\s+/g, ' ').trim() ?? ''

  if (text.length <= maxLength) {
    return text
  }

  return `${text.slice(0, maxLength - 1).trim()}…`
}

export function clampSystemPercent(value: number) {
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

  const average = matched.reduce((sum, sector) => sum + sector.percent, 0) / matched.length

  return clampSystemPercent(average)
}

function hasBodySignal(today: BodySnapshot) {
  return (
    today.waterLiters > 0 ||
    today.steps > 0 ||
    today.workoutDone ||
    today.nutritionStatus !== 'Не выбрано' ||
    today.movementType !== 'Не выбрано'
  )
}

function getDerivedBodyPercent(body: SystemProfileBodyInput) {
  let score = 18

  if (body.today.waterLiters > 0) score += 14
  if (body.today.steps > 0) score += 14
  if (body.today.workoutDone) score += 14
  if (body.today.nutritionStatus !== 'Не выбрано') score += 10
  if (body.today.movementType !== 'Не выбрано') score += 10
  if (body.dailyLogs.length > 0) score += 10

  return clampSystemPercent(score)
}

function getDerivedMoneyPercent(money: SystemProfileMoneyInput) {
  const activeAccounts = money.accounts.filter((account) => !account.isArchived)
  let score = 18

  if (money.trackingStartDate) score += 12
  if (activeAccounts.length > 0) score += 16
  if (money.transactions.length > 0) score += 16
  if (money.lastImportAt) score += 16
  if (money.lastBalanceCheckAt) score += 12
  if (money.importWarnings.length === 0 && (activeAccounts.length > 0 || money.transactions.length > 0)) {
    score += 6
  }

  return clampSystemPercent(score)
}

function getRouteItems(route: TodayRoute) {
  return [route.mainQuest, route.quickWin, route.recoveryQuest].filter(Boolean)
}

function getDerivedFocusPercent(today: SystemProfileTodayInput, progress: SystemProfileProgressInput) {
  const routeItems = getRouteItems(today.route)
  const routeProgress = routeItems.length
    ? routeItems.reduce((sum, quest) => sum + (quest?.progress ?? 0), 0) / routeItems.length
    : 0
  const completedToday = progress.dailySummary.completedTasks > 0
  const hasRoute = routeItems.length > 0

  return clampSystemPercent((hasRoute ? 32 : 18) + routeProgress * 0.42 + (completedToday ? 12 : 0))
}

function getDerivedRecoveryPercent(today: SystemProfileTodayInput, progress: SystemProfileProgressInput) {
  const hasRecoveryRoute = Boolean(today.route.recoveryQuest)
  const recoverySignal = progress.recoveryXp > 0 || today.currentMode === 'low'

  return clampSystemPercent(24 + (hasRecoveryRoute ? 18 : 0) + (recoverySignal ? 18 : 0))
}

function getModuleCaption(id: SystemProfileModuleId, value: number, input: SystemProfileInput) {
  if (value < 28) {
    return id === 'money' ? 'Нужно больше сигналов' : 'База собирается'
  }

  if (id === 'body') {
    return hasBodySignal(input.body.today) ? 'Первые данные приняты' : 'Контур тела ждёт сигнала'
  }

  if (id === 'money') {
    if (input.money.lastImportAt) return 'Импорт учтён'
    if (input.money.accounts.some((account) => !account.isArchived)) return 'Финансовая база создана'
    return 'База собирается'
  }

  if (id === 'focus') {
    return getRouteItems(input.today.route).length ? 'Следующий шаг выбран' : 'Маршрут собирается'
  }

  return input.progress.recoveryXp > 0 || input.today.currentMode === 'low'
    ? 'Возврат в систему засчитан'
    : 'Контур устойчивости активен'
}

function buildModules(input: SystemProfileInput): SystemProfileModule[] {
  const bodyValue = getSectorPercent(input.progress.sectors, ['body']) ?? getDerivedBodyPercent(input.body)
  const moneyValue = getSectorPercent(input.progress.sectors, ['money']) ?? getDerivedMoneyPercent(input.money)
  const focusValue = getSectorPercent(input.progress.sectors, ['focus']) ?? getDerivedFocusPercent(input.today, input.progress)
  const recoveryValue =
    getSectorPercent(input.progress.sectors, ['stability', 'energy']) ??
    getDerivedRecoveryPercent(input.today, input.progress)

  const modules: Array<Omit<SystemProfileModule, 'caption'>> = [
    { id: 'body', label: 'Тело', compactLabel: 'Тело', value: bodyValue },
    { id: 'money', label: 'Деньги', compactLabel: 'Деньги', value: moneyValue },
    { id: 'focus', label: 'Фокус', compactLabel: 'Фокус', value: focusValue },
    { id: 'recovery', label: 'Восстановление', compactLabel: 'Восст.', value: recoveryValue },
  ]

  return modules.map((module) => ({
    ...module,
    value: clampSystemPercent(module.value),
    caption: getModuleCaption(module.id, module.value, input),
  }))
}

function getRomanMark(value: number) {
  const marks = ['I', 'II', 'III', 'IV', 'V', 'VI']

  return marks[Math.min(marks.length - 1, Math.max(0, value - 1))] ?? 'I'
}

function getCompanionForm(level: number) {
  const formIndex = Math.max(1, Math.floor((Math.max(1, level) - 1) / 4) + 1)

  return {
    current: `Core Mk-${getRomanMark(formIndex)}`,
    next: `Core Mk-${getRomanMark(formIndex + 1)}`,
  }
}

function buildMilestones(input: SystemProfileInput): SystemProfileMilestone[] {
  const todayKey = getLocalDateKey()
  const milestones: SystemProfileMilestone[] = []
  const lastBackupAt = input.settings.lastBackupAt ?? input.settings.lastBackupExportAt

  if (lastBackupAt) {
    milestones.push({
      id: 'backup-created',
      label: 'Резервная копия создана',
      caption: 'Локальная база защищена',
      createdAt: lastBackupAt,
    })
  }

  if (hasBodySignal(input.body.today) || input.body.dailyLogs.length > 0) {
    milestones.push({
      id: 'body-checkin',
      label: 'Чек-ин тела выполнен',
      caption: 'Телесный сигнал принят',
      createdAt: input.body.today.date || todayKey,
    })
  }

  if (input.money.lastImportAt || input.money.transactions.length > 0 || input.money.accounts.length > 0) {
    milestones.push({
      id: 'money-signal',
      label: input.money.lastImportAt ? 'Финансовый импорт принят' : 'Денежная база создана',
      caption: 'Без деталей операций',
      createdAt: input.money.lastImportAt,
    })
  }

  const latestWeekly = input.weekly.summaries[0]

  if (latestWeekly) {
    milestones.push({
      id: 'weekly-review',
      label: 'Недельный обзор сохранён',
      caption: 'Выводы доступны в системе',
      createdAt: latestWeekly.createdAt,
    })
  }

  if (input.settings.onboarding?.completed) {
    milestones.push({
      id: 'onboarding-completed',
      label: 'Настройка системы завершена',
      caption: 'Профиль готов к маршруту',
    })
  }

  if (input.progress.dailySummary.completedTasks > 0) {
    milestones.push({
      id: 'daily-step',
      label: 'Дневной шаг зафиксирован',
      caption: 'Прогресс добавлен в профиль',
      createdAt: input.progress.dailySummary.date,
    })
  }

  return milestones
    .sort((left, right) => {
      const leftTime = left.createdAt ? Date.parse(left.createdAt) : 0
      const rightTime = right.createdAt ? Date.parse(right.createdAt) : 0

      return rightTime - leftTime
    })
    .slice(0, 3)
}

function getSystemStatus(modules: SystemProfileModule[]) {
  const average = modules.reduce((sum, module) => sum + module.value, 0) / Math.max(1, modules.length)

  if (average >= 72) return 'Стабильная база'
  if (average >= 44) return 'Система собирает устойчивость'

  return 'База собирается'
}

export function buildSystemProfileViewModel(input: SystemProfileInput): SystemProfileViewModel {
  const modules = buildModules(input)
  const progressPercent = clampSystemPercent(
    (input.progress.currentLevelXp / Math.max(1, input.progress.nextLevelXp)) * 100,
  )
  const companionForm = getCompanionForm(input.progress.level)
  const userName = compactText(input.settings.userName, 36) || 'Оператор'
  const title = compactText(input.settings.userRole, 48) || 'Оператор системы'

  return {
    userName,
    title,
    systemLevel: Math.max(1, Math.round(input.progress.level)),
    systemProgressPercent: progressPercent,
    systemStatus: getSystemStatus(modules),
    localModeLabel: 'Локальная база',
    companionForm: companionForm.current,
    companionState: getCompanionMoodLabel(input.companion.mood),
    companionMessage:
      compactText(input.companion.activeMessage, 120) || 'Ядро собирает устойчивый маршрут.',
    nextEvolutionLabel: companionForm.next,
    nextEvolutionProgressPercent: progressPercent,
    nextEvolutionRemainingPercent: clampSystemPercent(100 - progressPercent),
    modules,
    recentMilestones: buildMilestones(input),
    milestoneEmptyText,
    nextStep: {
      label: compactText(input.nextStep?.title, 72) || 'Начать с одного простого действия',
      caption:
        compactText(input.nextStep?.reason, 120) ||
        'Companion Core активен, но ждёт первых данных.',
      actionLabel: input.nextStep?.actionLabel,
    },
    xpSignals: {
      totalXp: Math.max(0, Math.round(input.progress.totalXp)),
      todayXp: Math.max(0, Math.round(input.progress.dailySummary.xpToday)),
      recoveryXp: Math.max(0, Math.round(input.progress.recoveryXp)),
    },
  }
}
