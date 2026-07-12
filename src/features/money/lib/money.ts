import { getLocalDateKey } from '@/shared/lib/date'
import type {
  Debt,
  DebtStatus,
  MoneyAccount,
  MoneyAccountSource,
  MoneyAccountType,
  MoneyAdjustmentDirection,
  MoneyCategory,
  MoneyExpenseCategory,
  MoneyIncomeCategory,
  MoneyTransaction,
  MoneyTransactionSource,
  MoneyTransactionType,
  MonthlyMoneyPlan,
  PlannedPayment,
  PlannedPaymentStatus,
  PlannedPaymentType,
} from '@/shared/types'

export const MONEY_STORAGE_KEY = 'lifequest-money'
export const MONEY_STORAGE_VERSION = 1

export type MoneyImportSource = 'sber_pdf' | 'sber_text' | 'unknown'

export interface MoneyImportPreview {
  source: MoneyImportSource
  periodStart?: string
  periodEnd?: string
  accounts: MoneyAccount[]
  transactions: MoneyTransaction[]
  totals: {
    income: number
    expense: number
    transfer: number
    newTransactions: number
    duplicates: number
  }
  warnings: string[]
}

export const moneyAccountTypeLabels: Record<MoneyAccountType, string> = {
  cash: 'Наличные',
  debit_card: 'Карта',
  savings: 'Накопления',
  other: 'Другое',
}

export const moneyExpenseCategoryLabels: Record<MoneyExpenseCategory, string> = {
  food: 'Продукты',
  transport: 'Транспорт',
  housing: 'Жильё',
  health: 'Здоровье',
  education: 'Обучение',
  subscriptions: 'Подписки',
  entertainment: 'Досуг',
  debt_payment: 'Платёж по долгу',
  savings: 'Накопления',
  other: 'Другое',
}

export const moneyIncomeCategoryLabels: Record<MoneyIncomeCategory, string> = {
  salary: 'Зарплата',
  scholarship: 'Стипендия',
  gift: 'Подарок',
  refund: 'Возврат',
  freelance: 'Фриланс',
  other_income: 'Другой доход',
}

export const moneyCategoryLabels: Record<MoneyCategory, string> = {
  ...moneyExpenseCategoryLabels,
  ...moneyIncomeCategoryLabels,
}

export const moneyExpenseCategories = Object.keys(
  moneyExpenseCategoryLabels,
) as MoneyExpenseCategory[]
export const moneyIncomeCategories = Object.keys(moneyIncomeCategoryLabels) as MoneyIncomeCategory[]

export interface MoneyPersistedState {
  accounts: MoneyAccount[]
  transactions: MoneyTransaction[]
  plannedPayments: PlannedPayment[]
  debts: Debt[]
  monthlyPlans: MonthlyMoneyPlan[]
  lastBalanceCheckAt?: string
  importWarnings?: string[]
  lastImportAt?: string
}

export type MoneyStateSnapshot = MoneyPersistedState

export interface MonthlyPlanProjection {
  plannedCommitments: number
  plannedFlexible: number
  plannedTotal: number
  estimatedMonthEnd: number
  safeToSpend: number
  remainingPlannedIncome: number
  remainingPlannedExpense: number
  mandatoryPlannedExpense: number
}

export interface MoneySuggestedAction {
  id: string
  title: string
  description: string
  action: 'balance_check' | 'add_yesterday_expense' | 'plan_debt_payment' | 'check_payment' | 'month_plan'
}

export function createEmptyMoneyState(): MoneyPersistedState {
  return {
    accounts: [],
    transactions: [],
    plannedPayments: [],
    debts: [],
    monthlyPlans: [],
    lastBalanceCheckAt: undefined,
    importWarnings: [],
    lastImportAt: undefined,
  }
}

export function createId(prefix: string) {
  const cryptoId = globalThis.crypto?.randomUUID?.()

  if (cryptoId) {
    return `${prefix}-${cryptoId}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function normalizeAmount(value: unknown) {
  const amount = typeof value === 'string' ? Number(value.replace(',', '.')) : Number(value)

  if (!Number.isFinite(amount) || amount <= 0) {
    return null
  }

  return Number(amount.toFixed(2))
}

export function normalizeMoneyValue(value: unknown) {
  const amount = typeof value === 'string' ? Number(value.replace(',', '.')) : Number(value)

  if (!Number.isFinite(amount)) {
    return null
  }

  return Number(amount.toFixed(2))
}

export function isValidDateKey(value: unknown) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return false
  }

  return Number.isFinite(Date.parse(value))
}

export function isValidMonthKey(value: unknown) {
  return typeof value === 'string' && /^\d{4}-\d{2}$/.test(value)
}

export function getMonthKey(date = new Date()) {
  return getLocalDateKey(date).slice(0, 7)
}

export function addMonthsToDateKey(dateKey: string, months: number) {
  const date = new Date(`${dateKey}T12:00:00`)

  if (!Number.isFinite(date.getTime())) {
    return getLocalDateKey()
  }

  date.setMonth(date.getMonth() + months)

  return getLocalDateKey(date)
}

export function formatDateSafe(dateKey?: string) {
  if (!dateKey) {
    return 'Дата не указана'
  }

  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateKey) ? new Date(`${dateKey}T12:00:00`) : new Date(dateKey)

  if (!Number.isFinite(date.getTime())) {
    return 'Дата не указана'
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function readOptionalString(value: unknown) {
  const text = readString(value)

  return text.length ? text : undefined
}

function enumValue<T extends string>(value: unknown, values: readonly T[], fallback: T) {
  return values.includes(value as T) ? (value as T) : fallback
}

function readOptionalPositiveNumber(value: unknown) {
  if (value === undefined) {
    return undefined
  }

  return normalizeAmount(value) ?? undefined
}

function readLast4(value: unknown) {
  const text = readString(value).replace(/\D/g, '')

  return text.length === 4 ? text : undefined
}

function sanitizeAccount(value: unknown): MoneyAccount | null {
  if (!isPlainObject(value)) {
    return null
  }

  const id = readString(value.id)
  const name = readString(value.name)
  const openingBalance = normalizeMoneyValue(value.openingBalance)
  const createdAt = readString(value.createdAt)
  const updatedAt = readString(value.updatedAt)

  if (!id || !name || openingBalance === null || !isValidDateKey(createdAt) || !isValidDateKey(updatedAt)) {
    return null
  }

  return {
    id,
    name,
    type: enumValue<MoneyAccountType>(value.type, ['cash', 'debit_card', 'savings', 'other'], 'other'),
    openingBalance,
    createdAt,
    updatedAt,
    isArchived: value.isArchived === true,
    source: enumValue<MoneyAccountSource>(value.source, ['manual', 'sber', 'unknown'], 'manual'),
    last4: readLast4(value.last4),
    creditLimit: readOptionalPositiveNumber(value.creditLimit),
    debt: readOptionalPositiveNumber(value.debt),
  }
}

function sanitizeTransaction(value: unknown, accountIds: Set<string>): MoneyTransaction | null {
  if (!isPlainObject(value)) {
    return null
  }

  const id = readString(value.id)
  const accountId = readString(value.accountId)
  const amount = normalizeAmount(value.amount)
  const title = readString(value.title)
  const transactionDate = readString(value.transactionDate)
  const createdAt = readString(value.createdAt)
  const updatedAt = readString(value.updatedAt)
  const type = enumValue<MoneyTransactionType>(
    value.type,
    ['income', 'expense', 'adjustment'],
    'expense',
  )

  if (
    !id ||
    !accountIds.has(accountId) ||
    amount === null ||
    !title ||
    !isValidDateKey(transactionDate) ||
    !isValidDateKey(createdAt) ||
    !isValidDateKey(updatedAt)
  ) {
    return null
  }

  const category = readString(value.category) as MoneyCategory
  const safeCategory =
    type === 'income'
      ? enumValue<MoneyIncomeCategory>(category, moneyIncomeCategories, 'other_income')
      : enumValue<MoneyExpenseCategory>(category, moneyExpenseCategories, 'other')

  return {
    id,
    accountId,
    type,
    amount,
    category: safeCategory,
    title,
    transactionDate,
    note: readOptionalString(value.note),
    createdAt,
    updatedAt,
    plannedPaymentId: readOptionalString(value.plannedPaymentId),
    debtId: readOptionalString(value.debtId),
    adjustmentDirection:
      type === 'adjustment'
        ? enumValue<MoneyAdjustmentDirection>(
            value.adjustmentDirection,
            ['increase', 'decrease'],
            'increase',
          )
        : undefined,
    idempotencyKey: readOptionalString(value.idempotencyKey),
    source: enumValue<MoneyTransactionSource>(
      value.source,
      ['manual', 'sber_pdf', 'sber_text', 'unknown'],
      'manual',
    ),
    importHash: readOptionalString(value.importHash),
    externalId: readOptionalString(value.externalId),
    accountLast4: readLast4(value.accountLast4),
    rawDescription: readOptionalString(value.rawDescription),
  }
}

function sanitizePlannedPayment(value: unknown, accountIds: Set<string>): PlannedPayment | null {
  if (!isPlainObject(value)) {
    return null
  }

  const id = readString(value.id)
  const title = readString(value.title)
  const amount = normalizeAmount(value.amount)
  const dueDate = readString(value.dueDate)
  const createdAt = readString(value.createdAt)
  const updatedAt = readString(value.updatedAt)
  const accountId = readOptionalString(value.accountId)
  const type = enumValue<PlannedPaymentType>(value.type, ['expense', 'income'], 'expense')

  if (
    !id ||
    !title ||
    amount === null ||
    !isValidDateKey(dueDate) ||
    !isValidDateKey(createdAt) ||
    !isValidDateKey(updatedAt) ||
    (accountId && !accountIds.has(accountId))
  ) {
    return null
  }

  return {
    id,
    title,
    amount,
    type,
    category:
      type === 'income'
        ? enumValue<MoneyIncomeCategory>(
            value.category,
            moneyIncomeCategories,
            'other_income',
          )
        : enumValue<MoneyExpenseCategory>(value.category, moneyExpenseCategories, 'other'),
    accountId,
    dueDate,
    note: readOptionalString(value.note),
    isMandatory: value.isMandatory === true,
    status: enumValue<PlannedPaymentStatus>(
      value.status,
      ['planned', 'completed', 'skipped'],
      'planned',
    ),
    completedTransactionId: readOptionalString(value.completedTransactionId),
    repeatMonthly: value.repeatMonthly === true,
    createdAt,
    updatedAt,
  }
}

function sanitizeDebt(value: unknown): Debt | null {
  if (!isPlainObject(value)) {
    return null
  }

  const id = readString(value.id)
  const title = readString(value.title)
  const originalAmount = normalizeAmount(value.originalAmount)
  const remainingAmount = normalizeMoneyValue(value.remainingAmount)
  const minimumPayment = value.minimumPayment === undefined ? undefined : normalizeAmount(value.minimumPayment)
  const nextPaymentDate = readOptionalString(value.nextPaymentDate)
  const createdAt = readString(value.createdAt)
  const updatedAt = readString(value.updatedAt)

  if (
    !id ||
    !title ||
    originalAmount === null ||
    remainingAmount === null ||
    remainingAmount < 0 ||
    remainingAmount > originalAmount ||
    minimumPayment === null ||
    (nextPaymentDate && !isValidDateKey(nextPaymentDate)) ||
    !isValidDateKey(createdAt) ||
    !isValidDateKey(updatedAt)
  ) {
    return null
  }

  return {
    id,
    title,
    originalAmount,
    remainingAmount,
    minimumPayment,
    nextPaymentDate,
    note: readOptionalString(value.note),
    status: enumValue<DebtStatus>(
      value.status,
      ['active', 'closed'],
      remainingAmount === 0 ? 'closed' : 'active',
    ),
    createdAt,
    updatedAt,
  }
}

function sanitizeMonthlyPlan(value: unknown): MonthlyMoneyPlan | null {
  if (!isPlainObject(value)) {
    return null
  }

  const id = readString(value.id)
  const month = readString(value.month)
  const createdAt = readString(value.createdAt)
  const updatedAt = readString(value.updatedAt)
  const expectedIncome = normalizeMoneyValue(value.expectedIncome ?? 0)
  const mandatoryExpenses = normalizeMoneyValue(value.mandatoryExpenses ?? 0)
  const debtPaymentTarget = normalizeMoneyValue(value.debtPaymentTarget ?? 0)
  const savingsTarget = normalizeMoneyValue(value.savingsTarget ?? 0)
  const flexibleSpendingLimit = normalizeMoneyValue(value.flexibleSpendingLimit ?? 0)

  if (
    !id ||
    !isValidMonthKey(month) ||
    !isValidDateKey(createdAt) ||
    !isValidDateKey(updatedAt) ||
    expectedIncome === null ||
    mandatoryExpenses === null ||
    debtPaymentTarget === null ||
    savingsTarget === null ||
    flexibleSpendingLimit === null ||
    expectedIncome < 0 ||
    mandatoryExpenses < 0 ||
    debtPaymentTarget < 0 ||
    savingsTarget < 0 ||
    flexibleSpendingLimit < 0
  ) {
    return null
  }

  return {
    id,
    month,
    expectedIncome,
    mandatoryExpenses,
    debtPaymentTarget,
    savingsTarget,
    flexibleSpendingLimit,
    note: readOptionalString(value.note),
    createdAt,
    updatedAt,
  }
}

export function sanitizeMoneyPersistedState(value: unknown): MoneyPersistedState {
  if (!isPlainObject(value)) {
    return createEmptyMoneyState()
  }

  const accounts = Array.isArray(value.accounts)
    ? value.accounts.map(sanitizeAccount).filter((account): account is MoneyAccount => Boolean(account))
    : []
  const accountIds = new Set(accounts.map((account) => account.id))
  const transactions = Array.isArray(value.transactions)
    ? value.transactions
        .map((transaction) => sanitizeTransaction(transaction, accountIds))
        .filter((transaction): transaction is MoneyTransaction => Boolean(transaction))
    : []
  const plannedPayments = Array.isArray(value.plannedPayments)
    ? value.plannedPayments
        .map((payment) => sanitizePlannedPayment(payment, accountIds))
        .filter((payment): payment is PlannedPayment => Boolean(payment))
    : []
  const debts = Array.isArray(value.debts)
    ? value.debts.map(sanitizeDebt).filter((debt): debt is Debt => Boolean(debt))
    : []
  const plansByMonth = new Map<string, MonthlyMoneyPlan>()

  if (Array.isArray(value.monthlyPlans)) {
    value.monthlyPlans.forEach((planValue) => {
      const plan = sanitizeMonthlyPlan(planValue)

      if (plan) {
        plansByMonth.set(plan.month, plan)
      }
    })
  }

  const lastBalanceCheckAt = readOptionalString(value.lastBalanceCheckAt)
  const lastImportAt = readOptionalString(value.lastImportAt)

  return {
    accounts,
    transactions,
    plannedPayments,
    debts,
    monthlyPlans: Array.from(plansByMonth.values()),
    lastBalanceCheckAt:
      lastBalanceCheckAt && isValidDateKey(lastBalanceCheckAt) ? lastBalanceCheckAt : undefined,
    importWarnings: Array.isArray(value.importWarnings)
      ? value.importWarnings
          .map((warning) => readString(warning))
          .filter(Boolean)
          .slice(0, 12)
      : [],
    lastImportAt: lastImportAt && isValidDateKey(lastImportAt) ? lastImportAt : undefined,
  }
}

export function migrateMoneyState(persistedState: unknown, version: number) {
  if (version !== MONEY_STORAGE_VERSION) {
    return createEmptyMoneyState()
  }

  return sanitizeMoneyPersistedState(persistedState)
}

export function getTransactionSignedAmount(transaction: MoneyTransaction) {
  if (!Number.isFinite(transaction.amount)) {
    return 0
  }

  if (transaction.type === 'income') {
    return transaction.amount
  }

  if (transaction.type === 'expense') {
    return -transaction.amount
  }

  return transaction.adjustmentDirection === 'decrease' ? -transaction.amount : transaction.amount
}

export function getAccountBalance(account: MoneyAccount, transactions: MoneyTransaction[]) {
  const transactionTotal = transactions
    .filter((transaction) => transaction.accountId === account.id)
    .reduce((sum, transaction) => sum + getTransactionSignedAmount(transaction), 0)

  return Number((account.openingBalance + transactionTotal).toFixed(2))
}

export function getTotalBalance(accounts: MoneyAccount[], transactions: MoneyTransaction[]) {
  return Number(
    accounts
      .filter((account) => !account.isArchived)
      .reduce((sum, account) => sum + getAccountBalance(account, transactions), 0)
      .toFixed(2),
  )
}

function dateKeyToLocalDate(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`)
}

function getDateDiffInDays(left: string, right: string) {
  const leftTime = dateKeyToLocalDate(left).getTime()
  const rightTime = dateKeyToLocalDate(right).getTime()

  if (!Number.isFinite(leftTime) || !Number.isFinite(rightTime)) {
    return Number.POSITIVE_INFINITY
  }

  return Math.floor((leftTime - rightTime) / 86_400_000)
}

export function getWeeklyDelta(transactions: MoneyTransaction[], todayKey = getLocalDateKey()) {
  return Number(
    transactions
      .filter((transaction) => {
        const diff = getDateDiffInDays(todayKey, transaction.transactionDate)

        return diff >= 0 && diff <= 6 && transaction.type !== 'adjustment'
      })
      .reduce((sum, transaction) => sum + getTransactionSignedAmount(transaction), 0)
      .toFixed(2),
  )
}

export function getSevenDayMoneyBars(transactions: MoneyTransaction[], todayKey = getLocalDateKey()) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = dateKeyToLocalDate(todayKey)
    date.setDate(date.getDate() - (6 - index))
    const dateKey = getLocalDateKey(date)
    const value = transactions
      .filter((transaction) => transaction.transactionDate === dateKey && transaction.type !== 'adjustment')
      .reduce((sum, transaction) => sum + getTransactionSignedAmount(transaction), 0)

    return {
      date: dateKey,
      value: Number(value.toFixed(2)),
    }
  })
}

export function getMonthTotals(transactions: MoneyTransaction[], month = getMonthKey()) {
  return transactions.reduce(
    (totals, transaction) => {
      if (!transaction.transactionDate.startsWith(month) || transaction.type === 'adjustment') {
        return totals
      }

      if (transaction.type === 'income') {
        totals.income += transaction.amount
      } else {
        totals.expense += transaction.amount
      }

      return totals
    },
    { income: 0, expense: 0 },
  )
}

export function getTopExpenseCategories(transactions: MoneyTransaction[], month = getMonthKey(), limit = 5) {
  const totals = new Map<MoneyExpenseCategory, number>()

  transactions.forEach((transaction) => {
    if (
      transaction.type !== 'expense' ||
      !transaction.transactionDate.startsWith(month) ||
      transaction.category === 'debt_payment'
    ) {
      return
    }

    const category = enumValue<MoneyExpenseCategory>(
      transaction.category,
      moneyExpenseCategories,
      'other',
    )

    totals.set(category, (totals.get(category) ?? 0) + transaction.amount)
  })

  return Array.from(totals.entries())
    .map(([category, amount]) => ({
      category,
      label: moneyExpenseCategoryLabels[category],
      amount: Number(amount.toFixed(2)),
    }))
    .sort((left, right) => right.amount - left.amount)
    .slice(0, limit)
}

export function isDuplicateImportTransaction(
  transaction: MoneyTransaction,
  existingTransactions: MoneyTransaction[],
) {
  return Boolean(
    transaction.importHash &&
      existingTransactions.some((existing) => existing.importHash === transaction.importHash),
  )
}

export function countImportDuplicates(
  transactions: MoneyTransaction[],
  existingTransactions: MoneyTransaction[],
) {
  return transactions.filter((transaction) =>
    isDuplicateImportTransaction(transaction, existingTransactions),
  ).length
}

export function getDebtProgress(debt: Debt) {
  if (!Number.isFinite(debt.originalAmount) || debt.originalAmount <= 0) {
    return 0
  }

  const progress = ((debt.originalAmount - debt.remainingAmount) / debt.originalAmount) * 100

  if (!Number.isFinite(progress)) {
    return 0
  }

  return Math.min(100, Math.max(0, progress))
}

export function getDebtSummary(debts: Debt[]) {
  const activeDebts = debts.filter((debt) => debt.status === 'active')
  const remainingDebt = activeDebts.reduce((sum, debt) => sum + debt.remainingAmount, 0)
  const originalTotal = activeDebts.reduce((sum, debt) => sum + debt.originalAmount, 0)
  const paidTotal = activeDebts.reduce(
    (sum, debt) => sum + Math.max(0, debt.originalAmount - debt.remainingAmount),
    0,
  )

  return {
    activeDebts,
    remainingDebt: Number(remainingDebt.toFixed(2)),
    progress: originalTotal > 0 ? Math.min(100, Math.max(0, (paidTotal / originalTotal) * 100)) : 0,
    nextPayment: activeDebts
      .filter((debt) => debt.nextPaymentDate)
      .sort((left, right) => String(left.nextPaymentDate).localeCompare(String(right.nextPaymentDate)))[0],
  }
}

export function getPlannedPaymentTotals(plannedPayments: PlannedPayment[], month = getMonthKey()) {
  return plannedPayments.reduce(
    (totals, payment) => {
      if (payment.status !== 'planned' || !payment.dueDate.startsWith(month)) {
        return totals
      }

      if (payment.type === 'income') {
        totals.income += payment.amount
      } else {
        totals.expense += payment.amount

        if (payment.isMandatory) {
          totals.mandatoryExpense += payment.amount
        }
      }

      return totals
    },
    { income: 0, expense: 0, mandatoryExpense: 0 },
  )
}

export function getMonthlyPlan(monthlyPlans: MonthlyMoneyPlan[], month = getMonthKey()) {
  return monthlyPlans.find((plan) => plan.month === month) ?? null
}

export function getMonthlyPlanProjection(
  state: MoneyStateSnapshot,
  month = getMonthKey(),
): MonthlyPlanProjection {
  const currentBalance = getTotalBalance(state.accounts, state.transactions)
  const plan = getMonthlyPlan(state.monthlyPlans, month)
  const plannedTotals = getPlannedPaymentTotals(state.plannedPayments, month)
  const mandatoryExpenses = plan?.mandatoryExpenses ?? plannedTotals.mandatoryExpense
  const debtPaymentTarget = plan?.debtPaymentTarget ?? 0
  const savingsTarget = plan?.savingsTarget ?? 0
  const flexibleSpendingLimit = plan?.flexibleSpendingLimit ?? 0
  const plannedCommitments = mandatoryExpenses + debtPaymentTarget + savingsTarget
  const plannedFlexible = flexibleSpendingLimit
  const plannedTotal = plannedCommitments + plannedFlexible
  const debtPaymentsAlreadyPlanned = state.plannedPayments.some(
    (payment) =>
      payment.status === 'planned' &&
      payment.type === 'expense' &&
      payment.category === 'debt_payment' &&
      payment.dueDate.startsWith(month),
  )
  const savingsAlreadyPlanned = state.plannedPayments.some(
    (payment) =>
      payment.status === 'planned' &&
      payment.type === 'expense' &&
      payment.category === 'savings' &&
      payment.dueDate.startsWith(month),
  )
  const extraDebtTarget = debtPaymentsAlreadyPlanned ? 0 : debtPaymentTarget
  const extraSavingsTarget = savingsAlreadyPlanned ? 0 : savingsTarget

  return {
    plannedCommitments: Number(plannedCommitments.toFixed(2)),
    plannedFlexible: Number(plannedFlexible.toFixed(2)),
    plannedTotal: Number(plannedTotal.toFixed(2)),
    estimatedMonthEnd: Number(
      (currentBalance + plannedTotals.income - plannedTotals.expense).toFixed(2),
    ),
    safeToSpend: Number(
      (
        currentBalance +
        plannedTotals.income -
        plannedTotals.mandatoryExpense -
        extraDebtTarget -
        extraSavingsTarget
      ).toFixed(2),
    ),
    remainingPlannedIncome: Number(plannedTotals.income.toFixed(2)),
    remainingPlannedExpense: Number(plannedTotals.expense.toFixed(2)),
    mandatoryPlannedExpense: Number(plannedTotals.mandatoryExpense.toFixed(2)),
  }
}

export function getMoneyCalmNote(state: MoneyStateSnapshot, month = getMonthKey()) {
  const activeAccounts = state.accounts.filter((account) => !account.isArchived)
  const activeDebtSummary = getDebtSummary(state.debts)
  const plan = getMonthlyPlan(state.monthlyPlans, month)
  const projection = getMonthlyPlanProjection(state, month)

  if (!activeAccounts.length) {
    return 'Добавь первый счёт, чтобы начать спокойный учёт денег.'
  }

  if (!plan) {
    return 'Баланс уже виден. Следующий небольшой шаг — составить простой план на месяц.'
  }

  if (projection.safeToSpend < 0) {
    return 'План показывает нехватку средств. Стоит пересмотреть один необязательный расход или дату платежа.'
  }

  if (activeDebtSummary.remainingDebt === 0) {
    return 'Активных долгов нет. Можно направить внимание на резерв или накопления.'
  }

  return 'Обязательные платежи учтены. Можно сосредоточиться на одном небольшом финансовом действии.'
}

export function getSuggestedMoneyActions(
  state: MoneyStateSnapshot,
  todayKey = getLocalDateKey(),
): MoneySuggestedAction[] {
  const actions: MoneySuggestedAction[] = []
  const activeAccounts = state.accounts.filter((account) => !account.isArchived)
  const balanceCheckDiff = state.lastBalanceCheckAt
    ? getDateDiffInDays(todayKey, state.lastBalanceCheckAt)
    : Number.POSITIVE_INFINITY
  const yesterday = dateKeyToLocalDate(todayKey)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayKey = getLocalDateKey(yesterday)
  const hasYesterdayExpense = state.transactions.some(
    (transaction) => transaction.type === 'expense' && transaction.transactionDate === yesterdayKey,
  )
  const activeDebtWithoutDate = state.debts.find(
    (debt) => debt.status === 'active' && !debt.nextPaymentDate,
  )
  const upcomingMandatoryPayment = state.plannedPayments.find((payment) => {
    if (payment.status !== 'planned' || !payment.isMandatory) {
      return false
    }

    const diff = getDateDiffInDays(payment.dueDate, todayKey)

    return diff >= 0 && diff <= 7
  })

  if (!state.lastBalanceCheckAt || balanceCheckDiff > 7) {
    actions.push({
      id: 'balance-check',
      title: 'Проверить баланс счёта',
      description: 'Сверить один счёт с фактической суммой.',
      action: 'balance_check',
    })
  }

  if (activeAccounts.length && !hasYesterdayExpense) {
    actions.push({
      id: 'yesterday-expense',
      title: 'Записать вчерашние траты',
      description: 'Если расходов не было, можно просто пропустить.',
      action: 'add_yesterday_expense',
    })
  }

  if (activeDebtWithoutDate) {
    actions.push({
      id: 'plan-debt-payment',
      title: 'Запланировать платёж по долгу',
      description: `У долга «${activeDebtWithoutDate.title}» нет ближайшей даты.`,
      action: 'plan_debt_payment',
    })
  }

  if (upcomingMandatoryPayment) {
    actions.push({
      id: 'upcoming-payment',
      title: 'Проверить ближайший платёж',
      description: `${upcomingMandatoryPayment.title}: ${formatDateSafe(upcomingMandatoryPayment.dueDate)}.`,
      action: 'check_payment',
    })
  }

  if (!getMonthlyPlan(state.monthlyPlans, todayKey.slice(0, 7))) {
    actions.push({
      id: 'month-plan',
      title: 'Составить план денег на месяц',
      description: 'Пять чисел достаточно для первого ориентира.',
      action: 'month_plan',
    })
  }

  return actions.slice(0, 3)
}
