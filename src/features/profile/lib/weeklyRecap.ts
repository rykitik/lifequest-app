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
  ModeKey,
  MoneyAccount,
  MoneyTransaction,
  TodayRoute,
  WeeklyReviewSummary,
} from '@/shared/types'
import type { LifeQuestSkillModule, LifeQuestSkillModuleId } from '@/features/profile/lib/skillTree'

export type WeeklyRecapStatus = 'empty' | 'forming' | 'active' | 'strong'

export interface WeeklyRecapModuleRef {
  id: LifeQuestSkillModuleId
  label: string
  reason: string
}

export interface WeeklyRecapSignal {
  id: string
  label: string
  value: string
  domain: LifeQuestSkillModuleId
}

export interface WeeklyRecapMilestone {
  id: string
  title: string
  domain: LifeQuestSkillModuleId
}

export interface WeeklyRecapViewModel {
  weekKey: string
  periodLabel: string
  status: WeeklyRecapStatus
  headline: string
  summary: string
  strongestModule?: WeeklyRecapModuleRef
  attentionModule?: WeeklyRecapModuleRef
  signals: WeeklyRecapSignal[]
  milestones: WeeklyRecapMilestone[]
  nextWeekFocus: {
    title: string
    caption: string
    domain: LifeQuestSkillModuleId
  }
  promptCenterHint?: {
    title: string
    caption: string
  }
}

interface WeeklyRecapSettingsInput {
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

interface WeeklyRecapProgressInput {
  recoveryXp: number
  dailySummary: DailyProgressSummary
}

interface WeeklyRecapBodyInput {
  today: BodySnapshot
  dailyLogs: BodyDailyLog[]
}

interface WeeklyRecapMoneyInput {
  accounts: MoneyAccount[]
  transactions: MoneyTransaction[]
  trackingStartDate?: string
  lastImportAt?: string
  lastBalanceCheckAt?: string
  importWarnings: string[]
}

interface WeeklyRecapTodayInput {
  currentMode: ModeKey
  route: TodayRoute
  dailyQuest?: DailyQuest
  dailyQuestCompletion?: DailyQuestCompletion | null
}

export interface WeeklyRecapInput {
  now?: Date
  settings: WeeklyRecapSettingsInput
  progress: WeeklyRecapProgressInput
  companion: CompanionProfile
  body: WeeklyRecapBodyInput
  money: WeeklyRecapMoneyInput
  today: WeeklyRecapTodayInput
  milestones: LifeQuestMilestone[]
  weekly: {
    summaries: WeeklyReviewSummary[]
  }
  modules: LifeQuestSkillModule[]
}

const moduleLabels: Record<LifeQuestSkillModuleId, string> = {
  body: 'Тело',
  money: 'Деньги',
  focus: 'Фокус',
  recovery: 'Восстановление',
  system: 'Система',
  companion: 'Companion',
}

const moduleSummaries: Record<LifeQuestSkillModuleId, string> = {
  body: 'телесная база',
  money: 'финансовая база',
  focus: 'маршрут дня',
  recovery: 'контур восстановления',
  system: 'локальная система',
  companion: 'Companion Core',
}

function compactText(value: string | undefined, fallback: string, maxLength = 72) {
  const text = value?.replace(/\s+/g, ' ').trim() ?? ''
  const safeText = text || fallback

  if (safeText.length <= maxLength) {
    return safeText
  }

  return `${safeText.slice(0, maxLength - 1).trim()}…`
}

function isValidDate(value: string | undefined | null) {
  return Boolean(value && Number.isFinite(Date.parse(value)))
}

function startOfLocalWeek(date: Date) {
  const start = new Date(date)
  const day = start.getDay()
  const diff = day === 0 ? -6 : 1 - day

  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() + diff)

  return start
}

function addDays(date: Date, days: number) {
  const next = new Date(date)

  next.setDate(next.getDate() + days)

  return next
}

function isDateInRange(value: string | undefined | null, start: Date, end: Date) {
  if (!isValidDate(value)) {
    return false
  }

  const time = new Date(value as string).getTime()

  return time >= start.getTime() && time <= end.getTime()
}

function formatPeriodLabel(start: Date, end: Date) {
  const formatter = new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
  })

  return `${formatter.format(start)} — ${formatter.format(end)}`
}

function hasBodySignal(log: BodyDailyLog | BodySnapshot) {
  return (
    log.waterLiters > 0 ||
    log.steps > 0 ||
    log.workoutDone ||
    log.nutritionStatus !== 'Не выбрано' ||
    log.movementType !== 'Не выбрано'
  )
}

function getRouteItems(route: TodayRoute) {
  return [route.mainQuest, route.quickWin, route.recoveryQuest].filter(Boolean)
}

function hasCompanionCustomization(companion: CompanionProfile) {
  const customization = companion.customization ?? defaultCompanionCustomization

  return (
    customization.displayName !== defaultCompanionCustomization.displayName ||
    customization.accent !== defaultCompanionCustomization.accent ||
    customization.shell !== defaultCompanionCustomization.shell
  )
}

function getProfileSignals(settings: WeeklyRecapSettingsInput) {
  return [
    settings.userName,
    settings.userRole,
    settings.heightCm,
    settings.bodyGoal && settings.bodyGoal !== 'not_set' ? settings.bodyGoal : undefined,
    settings.targetWeightKg,
    settings.activityLevel,
    settings.usualSleepTime,
    settings.usualWakeTime,
  ].filter(Boolean).length
}

function getModuleLabel(modules: LifeQuestSkillModule[], id: LifeQuestSkillModuleId) {
  return modules.find((module) => module.id === id)?.label ?? moduleLabels[id]
}

function createScores() {
  return {
    body: 0,
    money: 0,
    focus: 0,
    recovery: 0,
    system: 0,
    companion: 0,
  } satisfies Record<LifeQuestSkillModuleId, number>
}

function getStatus(totalSignals: number): WeeklyRecapStatus {
  if (totalSignals <= 0) return 'empty'
  if (totalSignals <= 2) return 'forming'
  if (totalSignals <= 5) return 'active'

  return 'strong'
}

function getHeadline(status: WeeklyRecapStatus) {
  if (status === 'strong') return 'Неделя хорошо закреплена'
  if (status === 'active') return 'Неделя дала устойчивые сигналы'
  if (status === 'forming') return 'База недели формируется'

  return 'Неделя ещё собирает сигналы'
}

function getModuleReason(id: LifeQuestSkillModuleId, signals: number) {
  if (signals > 0) {
    return `${moduleSummaries[id]} получила сигналы недели.`
  }

  return `${moduleSummaries[id]} может получить первый мягкий сигнал.`
}

function pickStrongestModule(
  scores: Record<LifeQuestSkillModuleId, number>,
  modules: LifeQuestSkillModule[],
) {
  const entries = Object.entries(scores) as Array<[LifeQuestSkillModuleId, number]>
  const [id, value] = entries.sort((left, right) => right[1] - left[1])[0]!

  if (value <= 0) {
    return undefined
  }

  return {
    id,
    label: getModuleLabel(modules, id),
    reason: getModuleReason(id, value),
  } satisfies WeeklyRecapModuleRef
}

function pickAttentionModule(
  scores: Record<LifeQuestSkillModuleId, number>,
  modules: LifeQuestSkillModule[],
  preferred?: LifeQuestSkillModuleId,
) {
  const available = modules.map((module) => module.id)
  const id =
    preferred && available.includes(preferred)
      ? preferred
      : ([...available].sort((left, right) => scores[left] - scores[right])[0] ?? 'recovery')

  return {
    id,
    label: getModuleLabel(modules, id),
    reason: `${moduleSummaries[id]} стоит держать мягким фокусом без давления.`,
  } satisfies WeeklyRecapModuleRef
}

function getNextWeekFocus(attentionModule: WeeklyRecapModuleRef | undefined) {
  const domain = attentionModule?.id ?? 'focus'
  const focusByDomain: Record<LifeQuestSkillModuleId, WeeklyRecapViewModel['nextWeekFocus']> = {
    body: {
      title: 'Собрать телесный сигнал',
      caption: 'Один короткий чек-ин в начале недели даст системе опору.',
      domain: 'body',
    },
    money: {
      title: 'Уточнить финансовую базу',
      caption: 'Одно спокойное обновление денег сделает решения точнее.',
      domain: 'money',
    },
    focus: {
      title: 'Закрепить главный квест',
      caption: 'Один завершённый шаг в день поможет держать маршрут ясным.',
      domain: 'focus',
    },
    recovery: {
      title: 'Стабилизировать восстановление',
      caption: 'Один мягкий recovery-сигнал в день поможет Core держать темп.',
      domain: 'recovery',
    },
    system: {
      title: 'Защитить локальную базу',
      caption: 'Backup и базовый профиль сохранят систему управляемой.',
      domain: 'system',
    },
    companion: {
      title: 'Настроить связь с Core',
      caption: 'Имя, оболочка и устойчивые сигналы помогут Companion точнее реагировать.',
      domain: 'companion',
    },
  }

  return focusByDomain[domain]
}

export function buildWeeklyRecapViewModel(input: WeeklyRecapInput): WeeklyRecapViewModel {
  const now = input.now ?? new Date()
  const weekStart = startOfLocalWeek(now)
  const weekEnd = addDays(weekStart, 6)
  const weekEndBoundary = new Date(weekEnd)

  weekEndBoundary.setHours(23, 59, 59, 999)

  const weekKey = getLocalDateKey(weekStart)
  const scores = createScores()
  const signals: WeeklyRecapSignal[] = []

  const bodyDates = new Set(
    input.body.dailyLogs
      .filter((log) => isDateInRange(log.date, weekStart, weekEndBoundary) && hasBodySignal(log))
      .map((log) => log.date),
  )

  if (isDateInRange(input.body.today.date, weekStart, weekEndBoundary) && hasBodySignal(input.body.today)) {
    bodyDates.add(input.body.today.date)
  }

  if (bodyDates.size > 0) {
    scores.body += bodyDates.size
    signals.push({
      id: 'body-days',
      label: 'Телесные сигналы',
      value: `${bodyDates.size} дн.`,
      domain: 'body',
    })
  }

  const moneyUpdated =
    Boolean(input.money.trackingStartDate) ||
    isDateInRange(input.money.lastImportAt, weekStart, weekEndBoundary) ||
    isDateInRange(input.money.lastBalanceCheckAt, weekStart, weekEndBoundary) ||
    input.money.transactions.some((transaction) =>
      isDateInRange(transaction.transactionDate, weekStart, weekEndBoundary),
    )

  if (moneyUpdated) {
    scores.money += 2
    signals.push({
      id: 'money-update',
      label: 'Финансовое обновление',
      value: input.money.importWarnings.length ? 'нужна сверка' : 'принято',
      domain: 'money',
    })
  }

  const completedRouteItems = getRouteItems(input.today.route).filter((quest) => quest?.status === 'complete').length
  const dailyQuestDone =
    Boolean(input.today.dailyQuest?.completedAt) ||
    isDateInRange(input.today.dailyQuestCompletion?.completedAt, weekStart, weekEndBoundary)

  if (dailyQuestDone || completedRouteItems > 0 || input.progress.dailySummary.completedTasks > 0) {
    scores.focus += 1 + completedRouteItems + Math.min(2, input.progress.dailySummary.completedTasks)
    signals.push({
      id: 'focus-completion',
      label: 'Завершённые шаги',
      value: dailyQuestDone ? 'квест дня' : `${Math.max(1, completedRouteItems)} шт.`,
      domain: 'focus',
    })
  }

  const recoverySignal =
    input.today.currentMode === 'low' ||
    input.today.currentMode === 'drifted' ||
    input.progress.recoveryXp > 0 ||
    Boolean(input.today.route.recoveryQuest) ||
    input.weekly.summaries.some((summary) => isDateInRange(summary.createdAt, weekStart, weekEndBoundary) && summary.risk)

  if (recoverySignal) {
    scores.recovery += input.today.currentMode === 'low' || input.today.currentMode === 'drifted' ? 2 : 1
    signals.push({
      id: 'recovery-signal',
      label: 'Контур восстановления',
      value: 'отмечен',
      domain: 'recovery',
    })
  }

  const backupAt = input.settings.lastBackupAt ?? input.settings.lastBackupExportAt
  const onboardingThisWeek =
    input.settings.onboarding?.completed &&
    input.milestones.some(
      (milestone) =>
        milestone.type === 'onboarding_completed' &&
        isDateInRange(milestone.unlockedAt, weekStart, weekEndBoundary),
    )
  const systemSignal =
    isDateInRange(backupAt, weekStart, weekEndBoundary) ||
    onboardingThisWeek ||
    getProfileSignals(input.settings) >= 5

  if (systemSignal) {
    scores.system += isDateInRange(backupAt, weekStart, weekEndBoundary) ? 2 : 1
    signals.push({
      id: 'system-safety',
      label: 'Системная база',
      value: isDateInRange(backupAt, weekStart, weekEndBoundary) ? 'backup создан' : 'профиль уточнён',
      domain: 'system',
    })
  }

  if (hasCompanionCustomization(input.companion) || input.companion.evolutionLevel > 1) {
    scores.companion += hasCompanionCustomization(input.companion) ? 2 : 1
    signals.push({
      id: 'companion-signal',
      label: 'Companion Core',
      value: hasCompanionCustomization(input.companion) ? 'настроен' : 'получает сигналы',
      domain: 'companion',
    })
  }

  const weeklyMilestones = [...input.milestones]
    .filter((milestone) => isDateInRange(milestone.unlockedAt, weekStart, weekEndBoundary))
    .sort((left, right) => Date.parse(right.unlockedAt) - Date.parse(left.unlockedAt))
    .slice(0, 3)
    .map((milestone) => {
      scores[milestone.domain] += 2

      return {
        id: milestone.id,
        title: compactText(milestone.title, 'Веха зафиксирована'),
        domain: milestone.domain,
      } satisfies WeeklyRecapMilestone
    })

  if (weeklyMilestones.length) {
    signals.unshift({
      id: 'milestones',
      label: 'Вехи недели',
      value: `${weeklyMilestones.length}`,
      domain: 'system',
    })
  }

  const latestWeeklyReview = input.weekly.summaries.find((summary) =>
    isDateInRange(summary.createdAt, weekStart, weekEndBoundary),
  )

  if (latestWeeklyReview) {
    scores.system += 1
    signals.push({
      id: 'weekly-review',
      label: 'Недельный обзор',
      value: 'сохранён',
      domain: 'system',
    })
  }

  const totalSignals = signals.length + weeklyMilestones.length
  const status = getStatus(totalSignals)
  const strongestModule = pickStrongestModule(scores, input.modules)
  const attentionPreferred =
    input.today.currentMode === 'low' || input.today.currentMode === 'drifted' ? 'recovery' : undefined
  const attentionModule = pickAttentionModule(scores, input.modules, attentionPreferred)
  const nextWeekFocus = getNextWeekFocus(attentionModule)
  const headline = getHeadline(status)
  const summary =
    status === 'empty'
      ? 'Система ещё ждёт первые спокойные сигналы недели. Можно начать с одного мягкого шага.'
      : `${strongestModule?.label ?? 'Система'} получила заметные сигналы. ${attentionModule.label} стоит держать мягким фокусом дальше.`

  return {
    weekKey,
    periodLabel: formatPeriodLabel(weekStart, weekEnd),
    status,
    headline,
    summary,
    strongestModule,
    attentionModule,
    signals: signals.slice(0, 5),
    milestones: weeklyMilestones,
    nextWeekFocus,
    promptCenterHint: latestWeeklyReview
      ? {
          title: 'AI Weekly Review сохранён',
          caption: 'Глубокий разбор уже есть в истории недельных обзоров.',
        }
      : {
          title: 'Для глубокого разбора',
          caption: 'Можно открыть недельный промпт в Prompt Center, когда понадобится больше контекста.',
        },
  }
}
