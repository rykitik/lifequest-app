import { useBodyStore } from '@/stores/useBodyStore'
import { useCompanionStore } from '@/stores/useCompanionStore'
import { useMoneyStore } from '@/stores/useMoneyStore'
import { useProgressStore } from '@/stores/useProgressStore'
import { useQuestStore } from '@/stores/useQuestStore'
import { useRescueStore } from '@/stores/useRescueStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useTodayStore } from '@/stores/useTodayStore'
import type { BodyDailyLog, BodyNutritionStatus, QuestItem, TodayRoute } from '@/shared/types'
import {
  getDebtSummary,
  getMoneyCalmNote,
  getMonthlyPlan,
  getMonthlyPlanProjection,
  getSuggestedMoneyActions,
  getTotalBalance,
  getWeeklyDelta,
} from '@/features/money/lib/money'

const QUEST_LIMIT = 5
const DAILY_LOG_LIMIT = 7
const NUTRITION_FLAGS: BodyNutritionStatus[] = [
  'Переел',
  'Сорвался',
  'Поздний ужин',
  'Сладкое',
  'Мало белка',
]

function compactQuest(quest: QuestItem | null) {
  if (!quest) {
    return null
  }

  return {
    id: quest.id,
    title: quest.title,
    subtitle: quest.subtitle,
    minutes: quest.minutes,
    xp: quest.xp,
    sector: quest.sector,
    progress: quest.progress,
    status: quest.status,
    classification: quest.classification,
    steps: quest.steps?.slice(0, 3).map((step) => ({
      label: step.label,
      minutes: step.minutes,
      done: step.done,
    })),
  }
}

function compactQuestList(quests: QuestItem[], limit = QUEST_LIMIT) {
  return quests.slice(0, limit).map(compactQuest)
}

function compactRoute(route: TodayRoute) {
  return {
    mainQuest: compactQuest(route.mainQuest),
    quickWin: compactQuest(route.quickWin),
    recoveryQuest: compactQuest(route.recoveryQuest),
  }
}

function sortLogsByDateDesc(logs: BodyDailyLog[]) {
  return [...logs].sort((left, right) => right.date.localeCompare(left.date))
}

function sortLogsByDateAsc(logs: BodyDailyLog[]) {
  return [...logs].sort((left, right) => left.date.localeCompare(right.date))
}

function roundNumber(value: number, fractionDigits = 1) {
  const multiplier = 10 ** fractionDigits

  return Math.round(value * multiplier) / multiplier
}

function getFiniteNumbers(values: Array<number | undefined>) {
  return values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
}

function average(values: Array<number | undefined>) {
  const finiteValues = getFiniteNumbers(values)

  if (!finiteValues.length) {
    return null
  }

  return roundNumber(finiteValues.reduce((sum, value) => sum + value, 0) / finiteValues.length)
}

function compactDailyBodyLog(log: BodyDailyLog) {
  return {
    date: log.date,
    weightKg: log.weightKg,
    waterLiters: log.waterLiters,
    steps: log.steps,
    nutritionStatus: log.nutritionStatus ?? 'Не выбрано',
    movementType: log.movementType ?? 'Не выбрано',
    workout: log.workout,
    workoutDone: log.workoutDone,
  }
}

function createDailyBodyLogFromToday(today: ReturnType<typeof useBodyStore.getState>['today']) {
  return {
    date: today.date,
    weightKg: today.weightKg,
    waterLiters: today.waterLiters,
    steps: today.steps,
    workoutDone: today.workoutDone,
    workout: today.workout,
    nutritionStatus: today.nutritionStatus,
    movementType: today.movementType,
  } satisfies BodyDailyLog
}

function getLastSevenBodyLogs() {
  const body = useBodyStore.getState()
  const logsByDate = new Map<string, BodyDailyLog>()

  body.dailyLogs.forEach((log) => {
    logsByDate.set(log.date, log)
  })
  logsByDate.set(body.today.date, createDailyBodyLogFromToday(body.today))

  return sortLogsByDateDesc(Array.from(logsByDate.values())).slice(0, DAILY_LOG_LIMIT)
}

function countNutritionFlags(logs: BodyDailyLog[]) {
  return NUTRITION_FLAGS.reduce<Record<string, number>>(
    (accumulator, flag) => ({
      ...accumulator,
      [flag]: logs.filter((log) => log.nutritionStatus === flag).length,
    }),
    {},
  )
}

function buildBodyWeeklySummary(logs: BodyDailyLog[]) {
  const chronologicalLogs = sortLogsByDateAsc(logs)
  const weightLogs = chronologicalLogs.filter(
    (log) => typeof log.weightKg === 'number' && Number.isFinite(log.weightKg),
  )
  const weightStart = weightLogs[0]?.weightKg ?? null
  const weightEnd = weightLogs.at(-1)?.weightKg ?? null

  return {
    daysCount: logs.length,
    weightStart,
    weightEnd,
    weightDelta:
      weightLogs.length >= 2 && typeof weightStart === 'number' && typeof weightEnd === 'number'
        ? roundNumber(weightEnd - weightStart)
        : null,
    averageWaterLiters: average(logs.map((log) => log.waterLiters)),
    averageSteps: average(logs.map((log) => log.steps)),
    movementDays: logs.filter(
      (log) => log.movementType && !['Не выбрано', 'Без тренировки'].includes(log.movementType),
    ).length,
    workoutDays: logs.filter((log) => log.workoutDone).length,
    nutritionFlagsCount: countNutritionFlags(logs),
  }
}

function buildProgressContext() {
  const progress = useProgressStore.getState()

  return {
    level: progress.level,
    totalXp: progress.totalXp,
    dailySummary: progress.dailySummary,
    sectors: progress.sectors.map((sector) => ({
      key: sector.key,
      label: sector.label,
      level: sector.level,
      percent: sector.percent,
      xp: sector.xp,
    })),
    xp: {
      actionXp: progress.actionXp,
      consistencyXp: progress.consistencyXp,
      recoveryXp: progress.recoveryXp,
    },
    achievements: progress.achievements.slice(0, 5),
  }
}

export function buildDailyContext() {
  const today = useTodayStore.getState()
  const quests = useQuestStore.getState()
  const mode = today.modes.find((item) => item.key === today.currentMode)

  return {
    mode: {
      key: today.currentMode,
      label: mode?.label ?? today.currentMode,
      description: mode?.description ?? '',
      energyHint: mode?.energyHint ?? '',
    },
    route: compactRoute(today.route),
    quests: {
      active: compactQuestList(quests.active.filter((quest) => quest.status !== 'complete')),
      inbox: compactQuestList(quests.inbox),
      parked: compactQuestList(quests.parked, 3),
    },
  }
}

export function buildBodyContext() {
  const body = useBodyStore.getState()

  return {
    today: body.today,
    lastSevenDailyLogs: getLastSevenBodyLogs().map(compactDailyBodyLog),
    weightHistory: body.history.slice(-10),
  }
}

export function buildMoneyContext() {
  const money = useMoneyStore.getState()
  const month = new Date().toISOString().slice(0, 7)
  const debtSummary = getDebtSummary(money.debts)
  const monthlyPlan = getMonthlyPlan(money.monthlyPlans, month)
  const projection = getMonthlyPlanProjection(money, month)

  return {
    snapshot: {
      balance: getTotalBalance(money.accounts, money.transactions),
      weeklyDelta: getWeeklyDelta(money.transactions),
      debt: debtSummary.remainingDebt,
      debtGoal: debtSummary.activeDebts.reduce((sum, debt) => sum + debt.originalAmount, 0),
      calmNote: getMoneyCalmNote(money, month),
      history: [],
    },
    accounts: money.accounts
      .filter((account) => !account.isArchived)
      .map((account) => ({
        id: account.id,
        name: account.name,
        type: account.type,
      })),
    monthlyPlan,
    projection,
    suggestedActions: getSuggestedMoneyActions(money).map((action) => ({
      id: action.id,
      title: action.title,
      description: action.description,
    })),
  }
}

export function buildRescueContext() {
  const rescue = useRescueStore.getState()

  return {
    currentProblem: rescue.currentProblem
      ? {
          id: rescue.currentProblem.id,
          label: rescue.currentProblem.label,
          description: rescue.currentProblem.description,
        }
      : null,
    lastSuggestion: rescue.suggestion,
    accepted: rescue.accepted,
    completed: rescue.completed,
  }
}

export function buildWeeklyReviewContext() {
  const body = useBodyStore.getState()
  const today = useTodayStore.getState()
  const quests = useQuestStore.getState()
  const companion = useCompanionStore.getState()
  const settings = useSettingsStore.getState()
  const weeklyBodyLogs = sortLogsByDateAsc(getLastSevenBodyLogs())
  const allQuests = [...quests.active, ...quests.inbox, ...quests.parked]
  const completedQuests = allQuests.filter((quest) => quest.status === 'complete')

  return {
    period: {
      days: DAILY_LOG_LIMIT,
      daysCount: weeklyBodyLogs.length,
      dataQualityNote:
        weeklyBodyLogs.length < 3
          ? 'данных пока мало; выводы должны быть осторожными'
          : 'данных достаточно для мягкого недельного разбора',
    },
    settings: {
      userName: settings.userName,
      userRole: settings.userRole,
      preferredTone: settings.preferredTone,
    },
    body: {
      currentSnapshot: body.today,
      dailyLogs: weeklyBodyLogs.map(compactDailyBodyLog),
      weightHistory: body.history.slice(-10),
      summary: buildBodyWeeklySummary(weeklyBodyLogs),
    },
    progress: buildProgressContext(),
    today: {
      mode: today.currentMode,
      route: compactRoute(today.route),
    },
    quests: {
      active: compactQuestList(quests.active.filter((quest) => quest.status !== 'complete'), 4),
      completed: compactQuestList(completedQuests, 4),
      inbox: compactQuestList(quests.inbox, 3),
    },
    rescue: buildRescueContext(),
    companion: {
      mood: companion.mood,
      activeMessage: companion.activeMessage,
      evolutionLevel: companion.evolutionLevel,
      stabilityScore: companion.stabilityScore,
    },
  }
}

export function buildFullLifeQuestContext() {
  const companion = useCompanionStore.getState()
  const settings = useSettingsStore.getState()

  return {
    settings: {
      userName: settings.userName,
      userRole: settings.userRole,
      preferredTone: settings.preferredTone,
    },
    today: buildDailyContext(),
    progress: buildProgressContext(),
    body: buildBodyContext(),
    money: buildMoneyContext(),
    rescue: buildRescueContext(),
    companion: {
      mood: companion.mood,
      activeMessage: companion.activeMessage,
      evolutionLevel: companion.evolutionLevel,
      stabilityScore: companion.stabilityScore,
    },
  }
}
