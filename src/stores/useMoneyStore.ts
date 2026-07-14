import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import {
  addMonthsToDateKey,
  createEmptyMoneyState,
  createId,
  getAccountBalance,
  isDuplicateImportTransaction,
  migrateMoneyState,
  MONEY_STORAGE_KEY,
  MONEY_STORAGE_VERSION,
  type MoneyImportPreview,
  moneyCategoryLabels,
  normalizeAmount,
  normalizeMoneyValue,
  sanitizeMoneyPersistedState,
} from '@/features/money/lib/money'
import { getLocalDateKey } from '@/shared/lib/date'
import type {
  Debt,
  DebtStatus,
  MoneyAccount,
  MoneyAccountType,
  MoneyAdjustmentDirection,
  MoneyCategory,
  MoneyTransaction,
  MoneyTransactionType,
  MonthlyMoneyPlan,
  PlannedPayment,
  PlannedPaymentStatus,
  PlannedPaymentType,
} from '@/shared/types'

interface ActionResult {
  ok: boolean
  id?: string
  reason?: string
}

interface AccountInput {
  name: string
  type: MoneyAccountType
  openingBalance: number
}

interface TransactionInput {
  accountId: string
  type: MoneyTransactionType
  amount: number
  category: MoneyCategory
  title?: string
  transactionDate: string
  note?: string
  plannedPaymentId?: string
  debtId?: string
  adjustmentDirection?: MoneyAdjustmentDirection
  idempotencyKey?: string
}

interface PlannedPaymentInput {
  title: string
  amount: number
  type: PlannedPaymentType
  category: MoneyCategory
  accountId?: string
  dueDate: string
  note?: string
  isMandatory?: boolean
  repeatMonthly?: boolean
}

interface DebtInput {
  title: string
  originalAmount: number
  remainingAmount?: number
  minimumPayment?: number
  nextPaymentDate?: string
  note?: string
}

interface DebtPaymentInput {
  debtId: string
  accountId: string
  amount: number
  paymentDate: string
  plannedPaymentId?: string
  idempotencyKey?: string
}

interface MonthlyPlanInput {
  month: string
  expectedIncome?: number
  mandatoryExpenses?: number
  debtPaymentTarget?: number
  savingsTarget?: number
  flexibleSpendingLimit?: number
  note?: string
}

interface MoneyState {
  accounts: MoneyAccount[]
  transactions: MoneyTransaction[]
  plannedPayments: PlannedPayment[]
  debts: Debt[]
  monthlyPlans: MonthlyMoneyPlan[]
  lastBalanceCheckAt?: string
  importPreview: MoneyImportPreview | null
  importWarnings: string[]
  lastImportAt?: string
  addAccount: (input: AccountInput) => ActionResult
  updateAccount: (id: string, input: Partial<AccountInput>) => ActionResult
  archiveAccount: (id: string) => ActionResult
  recordBalanceAdjustment: (accountId: string, actualBalance: number) => ActionResult
  addTransaction: (input: TransactionInput) => ActionResult
  updateTransaction: (id: string, input: Partial<TransactionInput>) => ActionResult
  deleteTransaction: (id: string) => ActionResult
  addPlannedPayment: (input: PlannedPaymentInput) => ActionResult
  updatePlannedPayment: (id: string, input: Partial<PlannedPaymentInput>) => ActionResult
  deletePlannedPayment: (id: string) => ActionResult
  completePlannedPayment: (id: string, accountId?: string, transactionDate?: string) => ActionResult
  skipPlannedPayment: (id: string) => ActionResult
  addDebt: (input: DebtInput) => ActionResult
  updateDebt: (id: string, input: Partial<DebtInput & { status: DebtStatus }>) => ActionResult
  deleteDebt: (id: string) => ActionResult
  recordDebtPayment: (input: DebtPaymentInput) => ActionResult
  setMonthlyPlan: (input: MonthlyPlanInput) => ActionResult
  updateMonthlyPlan: (month: string, input: Partial<MonthlyPlanInput>) => ActionResult
  deleteMonthlyPlan: (month: string) => ActionResult
  setImportPreview: (preview: MoneyImportPreview | null) => ActionResult
  clearImportPreview: () => void
  importPreviewTransactions: () => ActionResult & { imported?: number; duplicates?: number }
  markBalanceChecked: () => void
  resetMoneyState: () => void
  resetDemoData: () => void
}

type MoneyPersistedStoreState = Pick<
  MoneyState,
  | 'accounts'
  | 'transactions'
  | 'plannedPayments'
  | 'debts'
  | 'monthlyPlans'
  | 'lastBalanceCheckAt'
  | 'importWarnings'
  | 'lastImportAt'
>

function nowIso() {
  return new Date().toISOString()
}

function isDateLike(value: string | undefined) {
  return Boolean(value && Number.isFinite(Date.parse(value)))
}

function getSafeTitle(title: string | undefined, category: MoneyCategory) {
  const trimmed = title?.trim()

  return trimmed?.length ? trimmed : moneyCategoryLabels[category]
}

function accountExists(accounts: MoneyAccount[], accountId: string | undefined) {
  return Boolean(accountId && accounts.some((account) => account.id === accountId))
}

function normalizeOptionalPositive(value: number | undefined) {
  if (value === undefined) {
    return undefined
  }

  return normalizeAmount(value) ?? undefined
}

function normalizePlanAmount(value: number | undefined) {
  if (value === undefined) {
    return 0
  }

  const amount = normalizeMoneyValue(value)

  return amount === null || amount < 0 ? 0 : amount
}

function createRecurringPayment(payment: PlannedPayment, statusDate: string): PlannedPayment | null {
  if (!payment.repeatMonthly) {
    return null
  }

  const nextDueDate = addMonthsToDateKey(payment.dueDate || statusDate, 1)
  const now = nowIso()

  return {
    ...payment,
    id: createId('planned'),
    dueDate: nextDueDate,
    status: 'planned',
    completedTransactionId: undefined,
    createdAt: now,
    updatedAt: now,
  }
}

function createPlannedPaymentTransaction(
  payment: PlannedPayment,
  accountId: string,
  transactionDate: string,
): MoneyTransaction {
  const now = nowIso()

  return {
    id: createId('tx'),
    accountId,
    type: payment.type,
    amount: payment.amount,
    category: payment.category,
    title: payment.title,
    transactionDate,
    note: payment.note,
    createdAt: now,
    updatedAt: now,
    plannedPaymentId: payment.id,
  }
}

function isSafeImportPreview(value: MoneyImportPreview | null): value is MoneyImportPreview {
  return Boolean(
    value &&
      Array.isArray(value.accounts) &&
      Array.isArray(value.transactions) &&
      value.totals &&
      Array.isArray(value.warnings),
  )
}

function findImportAccount(
  accounts: MoneyAccount[],
  importAccount: MoneyAccount | undefined,
  transaction: MoneyTransaction,
) {
  const last4 = transaction.accountLast4 ?? importAccount?.last4

  if (last4) {
    const byLast4 = accounts.find((account) => !account.isArchived && account.last4 === last4)

    if (byLast4) {
      return byLast4
    }
  }

  return accounts.find((account) => account.id === transaction.accountId)
}

function createAccountFromImport(account: MoneyAccount | undefined, transaction: MoneyTransaction) {
  const now = nowIso()
  const last4 = transaction.accountLast4 ?? account?.last4

  return {
    id: account?.id ?? createId('account'),
    name: account?.name ?? (last4 ? `Сбер • ${last4}` : 'Сбер'),
    type: account?.type ?? 'debit_card',
    openingBalance: account?.openingBalance ?? 0,
    createdAt: account?.createdAt ?? now,
    updatedAt: now,
    isArchived: false,
    source: account?.source ?? 'sber',
    last4,
    creditLimit: account?.creditLimit,
    debt: account?.debt,
  } satisfies MoneyAccount
}

export const useMoneyStore = create<MoneyState>()(
  persist(
    (set, get): MoneyState => ({
      ...createEmptyMoneyState(),
      importPreview: null,
      importWarnings: [],
      addAccount: (input) => {
        const name = input.name.trim()
        const openingBalance = normalizeMoneyValue(input.openingBalance)

        if (!name || openingBalance === null) {
          return { ok: false, reason: 'Проверь название и баланс счёта.' }
        }

        const now = nowIso()
        const account: MoneyAccount = {
          id: createId('account'),
          name,
          type: input.type,
          openingBalance,
          createdAt: now,
          updatedAt: now,
          isArchived: false,
        }

        set((state) => ({
          accounts: [account, ...state.accounts],
        }))

        return { ok: true, id: account.id }
      },
      updateAccount: (id, input) => {
        let updated = false

        set((state) => ({
          accounts: state.accounts.map((account) => {
            if (account.id !== id) {
              return account
            }

            const openingBalance =
              input.openingBalance === undefined
                ? account.openingBalance
                : normalizeMoneyValue(input.openingBalance)

            if (openingBalance === null) {
              return account
            }

            updated = true

            return {
              ...account,
              name: input.name?.trim() || account.name,
              type: input.type ?? account.type,
              openingBalance,
              updatedAt: nowIso(),
            }
          }),
        }))

        return updated ? { ok: true, id } : { ok: false, reason: 'Счёт не найден.' }
      },
      archiveAccount: (id) => {
        let archived = false

        set((state) => ({
          accounts: state.accounts.map((account) => {
            if (account.id !== id) {
              return account
            }

            archived = true

            return {
              ...account,
              isArchived: true,
              updatedAt: nowIso(),
            }
          }),
        }))

        return archived ? { ok: true, id } : { ok: false, reason: 'Счёт не найден.' }
      },
      recordBalanceAdjustment: (accountId, actualBalance) => {
        let result: ActionResult = { ok: false, reason: 'Счёт не найден.' }

        set((state) => {
          const account = state.accounts.find((item) => item.id === accountId && !item.isArchived)
          const normalizedActualBalance = normalizeMoneyValue(actualBalance)

          if (!account || normalizedActualBalance === null) {
            result = { ok: false, reason: 'Проверь фактический баланс.' }
            return state
          }

          const currentBalance = getAccountBalance(account, state.transactions)
          const diff = Number((normalizedActualBalance - currentBalance).toFixed(2))
          const checkedAt = nowIso()

          if (diff === 0) {
            result = { ok: true, reason: 'Баланс уже совпадает.' }
            return {
              lastBalanceCheckAt: checkedAt,
            }
          }

          const transaction: MoneyTransaction = {
            id: createId('tx'),
            accountId,
            type: 'adjustment',
            amount: Math.abs(diff),
            category: 'other',
            title: 'Корректировка баланса',
            transactionDate: getLocalDateKey(),
            note: `Фактический баланс: ${normalizedActualBalance}`,
            createdAt: checkedAt,
            updatedAt: checkedAt,
            adjustmentDirection: diff > 0 ? 'increase' : 'decrease',
          }

          result = { ok: true, id: transaction.id }

          return {
            transactions: [transaction, ...state.transactions],
            lastBalanceCheckAt: checkedAt,
          }
        })

        return result
      },
      addTransaction: (input) => {
        let result: ActionResult = { ok: false, reason: 'Проверь операцию.' }

        set((state) => {
          const amount = normalizeAmount(input.amount)

          if (
            amount === null ||
            !accountExists(state.accounts, input.accountId) ||
            !isDateLike(input.transactionDate)
          ) {
            return state
          }

          if (
            input.idempotencyKey &&
            state.transactions.some((transaction) => transaction.idempotencyKey === input.idempotencyKey)
          ) {
            result = { ok: false, reason: 'Операция уже записана.' }
            return state
          }

          const now = nowIso()
          const transaction: MoneyTransaction = {
            id: createId('tx'),
            accountId: input.accountId,
            type: input.type,
            amount,
            category: input.category,
            title: getSafeTitle(input.title, input.category),
            transactionDate: input.transactionDate,
            note: input.note?.trim() || undefined,
            createdAt: now,
            updatedAt: now,
            plannedPaymentId: input.plannedPaymentId,
            debtId: input.debtId,
            adjustmentDirection:
              input.type === 'adjustment' ? input.adjustmentDirection ?? 'increase' : undefined,
            idempotencyKey: input.idempotencyKey,
          }

          result = { ok: true, id: transaction.id }

          return {
            transactions: [transaction, ...state.transactions],
          }
        })

        return result
      },
      updateTransaction: (id, input) => {
        let result: ActionResult = { ok: false, reason: 'Операция не найдена.' }

        set((state) => ({
          transactions: state.transactions.map((transaction) => {
            if (transaction.id !== id) {
              return transaction
            }

            if (transaction.debtId || transaction.plannedPaymentId) {
              result = {
                ok: false,
                reason: 'Связанную операцию лучше не редактировать отдельно.',
              }
              return transaction
            }

            const amount =
              input.amount === undefined ? transaction.amount : normalizeAmount(input.amount)

            if (
              amount === null ||
              (input.accountId && !accountExists(state.accounts, input.accountId)) ||
              (input.transactionDate && !isDateLike(input.transactionDate))
            ) {
              return transaction
            }

            const category = input.category ?? transaction.category

            result = { ok: true, id }

            return {
              ...transaction,
              ...input,
              amount,
              category,
              title: getSafeTitle(input.title ?? transaction.title, category),
              note: input.note?.trim() || transaction.note,
              updatedAt: nowIso(),
            }
          }),
        }))

        return result
      },
      deleteTransaction: (id) => {
        let result: ActionResult = { ok: false, reason: 'Операция не найдена.' }

        set((state) => {
          const transaction = state.transactions.find((item) => item.id === id)

          if (!transaction) {
            return state
          }

          if (transaction.debtId || transaction.plannedPaymentId) {
            result = {
              ok: false,
              reason: 'Эта операция связана с долгом или плановым платежом. Удаление заблокировано.',
            }
            return state
          }

          result = { ok: true, id }

          return {
            transactions: state.transactions.filter((item) => item.id !== id),
          }
        })

        return result
      },
      addPlannedPayment: (input) => {
        const amount = normalizeAmount(input.amount)

        if (!input.title.trim() || amount === null || !isDateLike(input.dueDate)) {
          return { ok: false, reason: 'Проверь название, сумму и дату.' }
        }

        let result: ActionResult = { ok: false, reason: 'Счёт не найден.' }

        set((state) => {
          if (input.accountId && !accountExists(state.accounts, input.accountId)) {
            return state
          }

          const now = nowIso()
          const payment: PlannedPayment = {
            id: createId('planned'),
            title: input.title.trim(),
            amount,
            type: input.type,
            category: input.category,
            accountId: input.accountId,
            dueDate: input.dueDate,
            note: input.note?.trim() || undefined,
            isMandatory: input.isMandatory === true,
            status: 'planned',
            repeatMonthly: input.repeatMonthly === true,
            createdAt: now,
            updatedAt: now,
          }

          result = { ok: true, id: payment.id }

          return {
            plannedPayments: [payment, ...state.plannedPayments],
          }
        })

        return result
      },
      updatePlannedPayment: (id, input) => {
        let result: ActionResult = { ok: false, reason: 'Платёж не найден.' }

        set((state) => ({
          plannedPayments: state.plannedPayments.map((payment) => {
            if (payment.id !== id) {
              return payment
            }

            if (payment.status !== 'planned') {
              result = { ok: false, reason: 'Завершённый платёж не редактируется.' }
              return payment
            }

            const amount = input.amount === undefined ? payment.amount : normalizeAmount(input.amount)

            if (
              amount === null ||
              (input.accountId && !accountExists(state.accounts, input.accountId)) ||
              (input.dueDate && !isDateLike(input.dueDate))
            ) {
              return payment
            }

            result = { ok: true, id }

            return {
              ...payment,
              ...input,
              title: input.title?.trim() || payment.title,
              amount,
              note: input.note?.trim() || payment.note,
              isMandatory: input.isMandatory ?? payment.isMandatory,
              repeatMonthly: input.repeatMonthly ?? payment.repeatMonthly,
              updatedAt: nowIso(),
            }
          }),
        }))

        return result
      },
      deletePlannedPayment: (id) => {
        let result: ActionResult = { ok: false, reason: 'Платёж не найден.' }

        set((state) => {
          const payment = state.plannedPayments.find((item) => item.id === id)

          if (!payment) {
            return state
          }

          if (payment.completedTransactionId) {
            result = {
              ok: false,
              reason: 'Платёж уже связан с операцией. Удаление заблокировано.',
            }
            return state
          }

          result = { ok: true, id }

          return {
            plannedPayments: state.plannedPayments.filter((item) => item.id !== id),
          }
        })

        return result
      },
      completePlannedPayment: (id, accountId, transactionDate = getLocalDateKey()) => {
        let result: ActionResult = { ok: false, reason: 'Платёж не найден.' }

        set((state) => {
          const payment = state.plannedPayments.find((item) => item.id === id)

          if (!payment) {
            return state
          }

          if (payment.status !== 'planned' || payment.completedTransactionId) {
            result = { ok: false, reason: 'Платёж уже обработан.' }
            return state
          }

          const resolvedAccountId = payment.accountId ?? accountId

          if (!accountExists(state.accounts, resolvedAccountId) || !isDateLike(transactionDate)) {
            result = { ok: false, reason: 'Выбери счёт для оплаты.' }
            return state
          }

          const transaction = createPlannedPaymentTransaction(
            payment,
            resolvedAccountId as string,
            transactionDate,
          )
          const recurringPayment = createRecurringPayment(payment, transactionDate)
          const updatedPayments = state.plannedPayments.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: 'completed' as PlannedPaymentStatus,
                  completedTransactionId: transaction.id,
                  updatedAt: nowIso(),
                }
              : item,
          )

          result = { ok: true, id: transaction.id }

          return {
            transactions: [transaction, ...state.transactions],
            plannedPayments: recurringPayment ? [recurringPayment, ...updatedPayments] : updatedPayments,
          }
        })

        return result
      },
      skipPlannedPayment: (id) => {
        let result: ActionResult = { ok: false, reason: 'Платёж не найден.' }

        set((state) => {
          const payment = state.plannedPayments.find((item) => item.id === id)

          if (!payment || payment.status !== 'planned') {
            return state
          }

          const recurringPayment = createRecurringPayment(payment, payment.dueDate)
          const updatedPayments = state.plannedPayments.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: 'skipped' as PlannedPaymentStatus,
                  updatedAt: nowIso(),
                }
              : item,
          )

          result = { ok: true, id }

          return {
            plannedPayments: recurringPayment ? [recurringPayment, ...updatedPayments] : updatedPayments,
          }
        })

        return result
      },
      addDebt: (input) => {
        const originalAmount = normalizeAmount(input.originalAmount)
        const remainingAmount =
          input.remainingAmount === undefined
            ? originalAmount
            : normalizeMoneyValue(input.remainingAmount)

        if (
          !input.title.trim() ||
          originalAmount === null ||
          remainingAmount === null ||
          remainingAmount < 0 ||
          remainingAmount > originalAmount ||
          (input.nextPaymentDate && !isDateLike(input.nextPaymentDate))
        ) {
          return { ok: false, reason: 'Проверь данные долга.' }
        }

        const now = nowIso()
        const debt: Debt = {
          id: createId('debt'),
          title: input.title.trim(),
          originalAmount,
          remainingAmount,
          minimumPayment: normalizeOptionalPositive(input.minimumPayment),
          nextPaymentDate: input.nextPaymentDate,
          note: input.note?.trim() || undefined,
          status: remainingAmount === 0 ? 'closed' : 'active',
          createdAt: now,
          updatedAt: now,
        }

        set((state) => ({
          debts: [debt, ...state.debts],
        }))

        return { ok: true, id: debt.id }
      },
      updateDebt: (id, input) => {
        let result: ActionResult = { ok: false, reason: 'Долг не найден.' }

        set((state) => ({
          debts: state.debts.map((debt) => {
            if (debt.id !== id) {
              return debt
            }

            const originalAmount =
              input.originalAmount === undefined
                ? debt.originalAmount
                : normalizeAmount(input.originalAmount)
            const remainingAmount =
              input.remainingAmount === undefined
                ? debt.remainingAmount
                : normalizeMoneyValue(input.remainingAmount)
            const minimumPayment =
              input.minimumPayment === undefined
                ? debt.minimumPayment
                : normalizeOptionalPositive(input.minimumPayment)

            if (
              originalAmount === null ||
              remainingAmount === null ||
              remainingAmount < 0 ||
              remainingAmount > originalAmount ||
              (input.nextPaymentDate && !isDateLike(input.nextPaymentDate))
            ) {
              return debt
            }

            result = { ok: true, id }

            return {
              ...debt,
              title: input.title?.trim() || debt.title,
              originalAmount,
              remainingAmount,
              minimumPayment,
              nextPaymentDate: input.nextPaymentDate ?? debt.nextPaymentDate,
              note: input.note?.trim() || debt.note,
              status: input.status ?? (remainingAmount === 0 ? 'closed' : debt.status),
              updatedAt: nowIso(),
            }
          }),
        }))

        return result
      },
      deleteDebt: (id) => {
        let result: ActionResult = { ok: false, reason: 'Долг не найден.' }

        set((state) => {
          const debt = state.debts.find((item) => item.id === id)

          if (!debt) {
            return state
          }

          if (state.transactions.some((transaction) => transaction.debtId === id)) {
            result = {
              ok: false,
              reason: 'По долгу уже есть операции. Удаление заблокировано.',
            }
            return state
          }

          result = { ok: true, id }

          return {
            debts: state.debts.filter((item) => item.id !== id),
          }
        })

        return result
      },
      recordDebtPayment: (input) => {
        let result: ActionResult = { ok: false, reason: 'Платёж не записан.' }

        set((state) => {
          const amount = normalizeAmount(input.amount)
          const debt = state.debts.find((item) => item.id === input.debtId && item.status === 'active')

          if (
            amount === null ||
            !debt ||
            !accountExists(state.accounts, input.accountId) ||
            !isDateLike(input.paymentDate)
          ) {
            return state
          }

          if (
            input.idempotencyKey &&
            state.transactions.some((transaction) => transaction.idempotencyKey === input.idempotencyKey)
          ) {
            result = { ok: false, reason: 'Платёж уже записан.' }
            return state
          }

          const actualAmount = Math.min(amount, debt.remainingAmount)
          const now = nowIso()
          const transaction: MoneyTransaction = {
            id: createId('tx'),
            accountId: input.accountId,
            type: 'expense',
            amount: actualAmount,
            category: 'debt_payment',
            title: `Платёж по долгу: ${debt.title}`,
            transactionDate: input.paymentDate,
            createdAt: now,
            updatedAt: now,
            debtId: debt.id,
            plannedPaymentId: input.plannedPaymentId,
            idempotencyKey: input.idempotencyKey,
          }
          const remainingAmount = Number((debt.remainingAmount - actualAmount).toFixed(2))
          const nextDebtStatus: DebtStatus = remainingAmount <= 0 ? 'closed' : 'active'
          const updatedPayments = input.plannedPaymentId
            ? state.plannedPayments.map((payment) =>
                payment.id === input.plannedPaymentId && payment.status === 'planned'
                  ? {
                      ...payment,
                      status: 'completed' as PlannedPaymentStatus,
                      completedTransactionId: transaction.id,
                      updatedAt: now,
                    }
                  : payment,
              )
            : state.plannedPayments

          result = { ok: true, id: transaction.id }

          return {
            transactions: [transaction, ...state.transactions],
            debts: state.debts.map((item) =>
              item.id === debt.id
                ? {
                    ...item,
                    remainingAmount: Math.max(0, remainingAmount),
                    status: nextDebtStatus,
                    updatedAt: now,
                  }
                : item,
            ),
            plannedPayments: updatedPayments,
          }
        })

        return result
      },
      setMonthlyPlan: (input) => {
        if (!/^\d{4}-\d{2}$/.test(input.month)) {
          return { ok: false, reason: 'Проверь месяц плана.' }
        }

        let result: ActionResult = { ok: false, reason: 'План не сохранён.' }

        set((state) => {
          const existing = state.monthlyPlans.find((plan) => plan.month === input.month)
          const now = nowIso()
          const nextPlan: MonthlyMoneyPlan = {
            id: existing?.id ?? createId('month-plan'),
            month: input.month,
            expectedIncome: normalizePlanAmount(input.expectedIncome),
            mandatoryExpenses: normalizePlanAmount(input.mandatoryExpenses),
            debtPaymentTarget: normalizePlanAmount(input.debtPaymentTarget),
            savingsTarget: normalizePlanAmount(input.savingsTarget),
            flexibleSpendingLimit: normalizePlanAmount(input.flexibleSpendingLimit),
            note: input.note?.trim() || undefined,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
          }

          result = { ok: true, id: nextPlan.id }

          return {
            monthlyPlans: existing
              ? state.monthlyPlans.map((plan) => (plan.month === input.month ? nextPlan : plan))
              : [nextPlan, ...state.monthlyPlans],
          }
        })

        return result
      },
      updateMonthlyPlan: (month, input) => {
        const currentPlan = get().monthlyPlans.find((plan) => plan.month === month)

        if (!currentPlan) {
          return { ok: false, reason: 'План месяца не найден.' }
        }

        return get().setMonthlyPlan({
          month,
          expectedIncome: input.expectedIncome ?? currentPlan.expectedIncome,
          mandatoryExpenses: input.mandatoryExpenses ?? currentPlan.mandatoryExpenses,
          debtPaymentTarget: input.debtPaymentTarget ?? currentPlan.debtPaymentTarget,
          savingsTarget: input.savingsTarget ?? currentPlan.savingsTarget,
          flexibleSpendingLimit: input.flexibleSpendingLimit ?? currentPlan.flexibleSpendingLimit,
          note: input.note ?? currentPlan.note,
        })
      },
      deleteMonthlyPlan: (month) => {
        let deleted = false

        set((state) => {
          deleted = state.monthlyPlans.some((plan) => plan.month === month)

          return {
            monthlyPlans: state.monthlyPlans.filter((plan) => plan.month !== month),
          }
        })

        return deleted ? { ok: true } : { ok: false, reason: 'План месяца не найден.' }
      },
      setImportPreview: (preview) => {
        if (preview !== null && !isSafeImportPreview(preview)) {
          return { ok: false, reason: 'Предпросмотр импорта повреждён.' }
        }

        set({
          importPreview: preview,
          importWarnings: preview?.warnings.slice(0, 12) ?? [],
        })

        return { ok: true }
      },
      clearImportPreview: () =>
        set({
          importPreview: null,
          importWarnings: [],
        }),
      importPreviewTransactions: () => {
        let result: ActionResult & { imported?: number; duplicates?: number } = {
          ok: false,
          reason: 'Нет подготовленного импорта.',
        }

        set((state) => {
          const preview = state.importPreview

          if (!isSafeImportPreview(preview)) {
            result = { ok: false, reason: 'Предпросмотр импорта повреждён.' }
            return {
              importPreview: null,
              importWarnings: ['Предпросмотр импорта повреждён. Разбери выписку ещё раз.'],
            }
          }

          const now = nowIso()
          const accounts = [...state.accounts]
          const importedTransactions: MoneyTransaction[] = []
          let duplicates = 0
          const accountByPreviewId = new Map(preview.accounts.map((account) => [account.id, account]))

          preview.transactions.forEach((transaction) => {
            if (!transaction.importHash && !transaction.importFingerprint) {
              duplicates += 1
              return
            }

            if (
              isDuplicateImportTransaction(transaction, state.transactions) ||
              importedTransactions.some((item) =>
                transaction.importFingerprint
                  ? item.importFingerprint === transaction.importFingerprint
                  : item.importHash === transaction.importHash,
              )
            ) {
              duplicates += 1
              return
            }

            const importAccount = accountByPreviewId.get(transaction.accountId)
            const existingAccount = findImportAccount(accounts, importAccount, transaction)
            const account = existingAccount ?? createAccountFromImport(importAccount, transaction)

            if (!existingAccount) {
              accounts.unshift(account)
            }

            importedTransactions.push({
              ...transaction,
              id: createId('tx'),
              accountId: account.id,
              createdAt: now,
              updatedAt: now,
              source: transaction.source ?? preview.source,
            })
          })

          result = {
            ok: true,
            imported: importedTransactions.length,
            duplicates,
            reason: importedTransactions.length
              ? `Импортировано операций: ${importedTransactions.length}.`
              : 'Новых операций не найдено.',
          }

          return {
            accounts,
            transactions: [...importedTransactions, ...state.transactions],
            importPreview: null,
            importWarnings: preview.warnings.slice(0, 12),
            lastImportAt: now,
          }
        })

        return result
      },
      markBalanceChecked: () =>
        set({
          lastBalanceCheckAt: nowIso(),
        }),
      resetMoneyState: () =>
        set({
          ...createEmptyMoneyState(),
          importPreview: null,
        }),
      resetDemoData: () =>
        set({
          ...createEmptyMoneyState(),
          importPreview: null,
        }),
    }),
    {
      name: MONEY_STORAGE_KEY,
      version: MONEY_STORAGE_VERSION,
      storage: createJSONStorage(() => localStorage),
      migrate: migrateMoneyState,
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...sanitizeMoneyPersistedState(persistedState),
        importPreview: null,
      }),
      partialize: (state): MoneyPersistedStoreState => ({
        accounts: state.accounts,
        transactions: state.transactions,
        plannedPayments: state.plannedPayments,
        debts: state.debts,
        monthlyPlans: state.monthlyPlans,
        lastBalanceCheckAt: state.lastBalanceCheckAt,
        importWarnings: state.importWarnings,
        lastImportAt: state.lastImportAt,
      }),
    },
  ),
)
