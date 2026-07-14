import { useBodyStore } from '@/stores/useBodyStore'
import { useCompanionStore } from '@/stores/useCompanionStore'
import { useMoneyStore } from '@/stores/useMoneyStore'
import { useProgressStore } from '@/stores/useProgressStore'
import { useQuestStore } from '@/stores/useQuestStore'
import { useRescueStore } from '@/stores/useRescueStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useTodayStore } from '@/stores/useTodayStore'
import { getLocalDateKey } from '@/shared/lib/date'
import type { BodyDailyLog, MoneyTransaction, QuestItem, TodayRoute } from '@/shared/types'
import {
  getDebtSummary,
  getMonthKey,
  getMonthlyPlan,
  getMonthlyPlanProjection,
  getMonthTotals,
  getPlannedPaymentTotals,
  getTopExpenseCategories,
  getTotalBalance,
  moneyCategoryLabels,
} from '@/features/money/lib/money'

const QUEST_LIMIT = 5
const DAILY_LOG_LIMIT = 7
const TRANSFER_PATTERN = /(перевод|между своими|со своего|на свой|свой сч[её]т|transfer)/i

type DataQuality = 'low' | 'medium' | 'good'

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

function dateKeyToLocalDate(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`)
}

function getDateDiffInDays(leftDateKey: string, rightDateKey: string) {
  const leftTime = dateKeyToLocalDate(leftDateKey).getTime()
  const rightTime = dateKeyToLocalDate(rightDateKey).getTime()

  if (!Number.isFinite(leftTime) || !Number.isFinite(rightTime)) {
    return Number.POSITIVE_INFINITY
  }

  return Math.floor((leftTime - rightTime) / 86_400_000)
}

function isWithinLastDays(dateKey: string, todayKey = getLocalDateKey(), days = DAILY_LOG_LIMIT) {
  const diff = getDateDiffInDays(todayKey, dateKey)

  return diff >= 0 && diff < days
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
  const todayKey = body.today.date || getLocalDateKey()

  body.dailyLogs.forEach((log) => {
    logsByDate.set(log.date, log)
  })
  logsByDate.set(body.today.date, createDailyBodyLogFromToday(body.today))

  return sortLogsByDateDesc(Array.from(logsByDate.values()))
    .filter((log) => isWithinLastDays(log.date, todayKey))
    .slice(0, DAILY_LOG_LIMIT)
}

function countNutritionFlags(logs: BodyDailyLog[]) {
  return {
    normal: logs.filter((log) => log.nutritionStatus === 'Нормально').length,
    overeaten: logs.filter((log) => log.nutritionStatus === 'Переел').length,
    breakdown: logs.filter((log) => log.nutritionStatus === 'Сорвался').length,
    lowProtein: logs.filter((log) => log.nutritionStatus === 'Мало белка').length,
    lateDinner: logs.filter((log) => log.nutritionStatus === 'Поздний ужин').length,
    sweets: logs.filter((log) => log.nutritionStatus === 'Сладкое').length,
    Нормально: logs.filter((log) => log.nutritionStatus === 'Нормально').length,
    Переел: logs.filter((log) => log.nutritionStatus === 'Переел').length,
    Сорвался: logs.filter((log) => log.nutritionStatus === 'Сорвался').length,
    'Мало белка': logs.filter((log) => log.nutritionStatus === 'Мало белка').length,
    'Поздний ужин': logs.filter((log) => log.nutritionStatus === 'Поздний ужин').length,
    Сладкое: logs.filter((log) => log.nutritionStatus === 'Сладкое').length,
  }
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

function getBodyDataQuality(logs: BodyDailyLog[]): DataQuality {
  if (logs.length >= 5) {
    return 'good'
  }

  if (logs.length >= 3) {
    return 'medium'
  }

  return 'low'
}

function getWeeklyMoneyTransactions(transactions: MoneyTransaction[]) {
  const todayKey = getLocalDateKey()

  return transactions.filter(
    (transaction) =>
      transaction.type !== 'adjustment' && isWithinLastDays(transaction.transactionDate, todayKey),
  )
}

function getWeeklyMoneyTotals(transactions: MoneyTransaction[]) {
  return transactions.reduce(
    (totals, transaction) => {
      if (transaction.type === 'income') {
        totals.income += transaction.amount
      }

      if (transaction.type === 'expense') {
        totals.expense += transaction.amount
      }

      if (isTransferLikeTransaction(transaction)) {
        totals.transfer += transaction.amount
      }

      return totals
    },
    { income: 0, expense: 0, transfer: 0 },
  )
}

function isTransferLikeTransaction(transaction: MoneyTransaction) {
  const text = [transaction.title, transaction.note, transaction.rawDescription]
    .filter(Boolean)
    .join(' ')

  return TRANSFER_PATTERN.test(text)
}

function compactMoneyTransactionForContext(transaction: MoneyTransaction) {
  return {
    date: transaction.transactionDate,
    type: transaction.type,
    amount: transaction.amount,
    category: transaction.category,
    categoryLabel: moneyCategoryLabels[transaction.category],
    source: transaction.source ?? 'manual',
  }
}

function getRecentLargeTransactions(transactions: MoneyTransaction[], limit = 5) {
  return transactions
    .filter((transaction) => transaction.type !== 'adjustment')
    .sort((left, right) => {
      const dateDiff = right.transactionDate.localeCompare(left.transactionDate)

      return dateDiff || right.amount - left.amount
    })
    .slice(0, limit)
    .map(compactMoneyTransactionForContext)
}

function getCreditDebt() {
  const money = useMoneyStore.getState()
  const creditDebt = money.accounts
    .filter((account) => !account.isArchived)
    .reduce((sum, account) => sum + (Number.isFinite(account.debt) ? account.debt ?? 0 : 0), 0)

  return creditDebt > 0 ? Number(creditDebt.toFixed(2)) : undefined
}

function getMoneyDataQuality(weeklyTransactions: MoneyTransaction[], hasAccounts: boolean): DataQuality {
  const money = useMoneyStore.getState()

  if (money.lastImportAt || weeklyTransactions.length >= 5) {
    return 'good'
  }

  if (hasAccounts || weeklyTransactions.length > 0) {
    return 'medium'
  }

  return 'low'
}

function buildWeeklyMoneyContext() {
  const money = useMoneyStore.getState()
  const month = getMonthKey()
  const debtSummary = getDebtSummary(money.debts)
  const projection = getMonthlyPlanProjection(money, month)
  const monthTotals = getMonthTotals(money.transactions, month)
  const plannedPaymentTotals = getPlannedPaymentTotals(money.plannedPayments, month)
  const weeklyTransactions = getWeeklyMoneyTransactions(money.transactions)
  const weeklyTotals = getWeeklyMoneyTotals(weeklyTransactions)
  const activeAccountsCount = money.accounts.filter((account) => !account.isArchived).length
  const dataQuality = getMoneyDataQuality(weeklyTransactions, activeAccountsCount > 0)
  const creditDebt = getCreditDebt()

  return {
    totalBalance: getTotalBalance(money.accounts, money.transactions),
    safeToSpend: projection.safeToSpend,
    monthIncome: monthTotals.income,
    monthExpense: monthTotals.expense,
    weekIncome: Number(weeklyTotals.income.toFixed(2)),
    weekExpense: Number(weeklyTotals.expense.toFixed(2)),
    plannedPaymentsTotal: plannedPaymentTotals.expense,
    debtsTotal: debtSummary.remainingDebt,
    creditDebt,
    topExpenseCategories: getTopExpenseCategories(money.transactions, month, 5),
    recentLargeTransactions: getRecentLargeTransactions(money.transactions, 5),
    lastImportAt: money.lastImportAt,
    importWarnings: money.importWarnings.slice(0, 5),
    dataQuality,
    dataQualityNote:
      dataQuality === 'low'
        ? 'Финансовых данных пока мало: нет импортированных операций или ручных записей за неделю.'
        : undefined,
    summary: {
      weekIncome: Number(weeklyTotals.income.toFixed(2)),
      weekExpense: Number(weeklyTotals.expense.toFixed(2)),
      transferTotal: Number(weeklyTotals.transfer.toFixed(2)),
      topExpenseCategories: getTopExpenseCategories(money.transactions, month, 5).map((item) => ({
        category: item.category,
        amount: item.amount,
      })),
      largeTransactionsCount: Math.min(5, money.transactions.filter((transaction) => transaction.type !== 'adjustment').length),
      creditDebt,
      safeToSpend: projection.safeToSpend,
      lastImportAt: money.lastImportAt,
    },
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
  const month = getMonthKey()
  const debtSummary = getDebtSummary(money.debts)
  const monthlyPlan = getMonthlyPlan(money.monthlyPlans, month)
  const projection = getMonthlyPlanProjection(money, month)
  const monthTotals = getMonthTotals(money.transactions, month)
  const plannedPaymentTotals = getPlannedPaymentTotals(money.plannedPayments, month)
  const recentLargeTransactions = money.transactions
    .filter((transaction) => transaction.type !== 'adjustment')
    .sort((left, right) => right.amount - left.amount)
    .slice(0, 5)
    .map(compactMoneyTransactionForContext)

  return {
    totalBalance: getTotalBalance(money.accounts, money.transactions),
    monthIncome: monthTotals.income,
    monthExpense: monthTotals.expense,
    plannedPaymentsTotal: plannedPaymentTotals.expense,
    debtsTotal: debtSummary.remainingDebt,
    safeToSpend: projection.safeToSpend,
    topExpenseCategories: getTopExpenseCategories(money.transactions, month, 5),
    recentLargeTransactions,
    lastImportAt: money.lastImportAt,
    importWarnings: money.importWarnings.slice(0, 5),
    accountsCount: money.accounts.filter((account) => !account.isArchived).length,
    monthlyPlan,
    projection,
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
  const bodySummary = buildBodyWeeklySummary(weeklyBodyLogs)
  const bodyDataQuality = getBodyDataQuality(weeklyBodyLogs)
  const moneyContext = buildWeeklyMoneyContext()
  const allQuests = [...quests.active, ...quests.inbox, ...quests.parked]
  const completedQuests = allQuests.filter((quest) => quest.status === 'complete')
  const mode = today.modes.find((item) => item.key === today.currentMode)
  const fallbackDate = getLocalDateKey()
  const weekStart = weeklyBodyLogs[0]?.date ?? fallbackDate
  const weekEnd = weeklyBodyLogs.at(-1)?.date ?? fallbackDate

  return {
    period: {
      days: DAILY_LOG_LIMIT,
      weekStart,
      weekEnd,
      daysCount: weeklyBodyLogs.length,
      dataQuality: bodyDataQuality,
      dataQualityNote:
        bodyDataQuality === 'low'
          ? 'Данных пока мало; выводы должны быть осторожными.'
          : 'Данных достаточно для мягкого недельного разбора.',
    },
    dataQuality: {
      body: bodyDataQuality,
      money: moneyContext.dataQuality,
      overall: bodyDataQuality === 'low' || moneyContext.dataQuality === 'low'
        ? 'low'
        : bodyDataQuality === 'medium' || moneyContext.dataQuality === 'medium'
          ? 'medium'
          : 'good',
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
      summary: bodySummary,
      dataQuality: bodyDataQuality,
    },
    bodySummary,
    money: moneyContext,
    moneySummary: moneyContext.summary,
    progress: buildProgressContext(),
    today: {
      mode: {
        key: today.currentMode,
        label: mode?.label ?? today.currentMode,
      },
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
