import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getLocalDateKey } from '@/shared/lib/date'
import type { BodySnapshot, MoneyAccount, MoneyTransaction, PlannedPayment, Debt } from '@/shared/types'

class MemoryStorage implements Storage {
  private items = new Map<string, string>()

  get length() {
    return this.items.size
  }

  clear() {
    this.items.clear()
  }

  getItem(key: string) {
    return this.items.get(key) ?? null
  }

  key(index: number) {
    return Array.from(this.items.keys())[index] ?? null
  }

  removeItem(key: string) {
    this.items.delete(key)
  }

  setItem(key: string, value: string) {
    this.items.set(key, value)
  }
}

function installStorage() {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new MemoryStorage(),
    configurable: true,
  })
}

function getDateKeyDaysAgo(days: number) {
  const date = new Date(`${getLocalDateKey()}T12:00:00`)

  date.setDate(date.getDate() - days)

  return getLocalDateKey(date)
}

function createBodySnapshot(date = getLocalDateKey()): BodySnapshot {
  return {
    date,
    weightKg: 81.2,
    weightTrendKg: -0.5,
    waterLiters: 2,
    steps: 8200,
    workout: 'Прогулка',
    workoutDone: true,
    foodDiscipline: 82,
    nutritionStatus: 'Нормально',
    movementType: 'Прогулка',
    quickAction: 'Спокойный базовый шаг',
  }
}

describe('buildMoneyContext', () => {
  beforeEach(() => {
    vi.resetModules()
    installStorage()
  })

  it('отдаёт агрегаты без полного списка операций и rawDescription', async () => {
    const { getMonthKey } = await import('@/features/money/lib/money')
    const { useMoneyStore } = await import('@/stores/useMoneyStore')
    const { buildMoneyContext } = await import('@/services/contextBuilder')
    const month = getMonthKey()
    const account: MoneyAccount = {
      id: 'account-1',
      name: 'Сбер • 1111',
      type: 'debit_card',
      openingBalance: 10_000,
      createdAt: `${month}-01T10:00:00.000Z`,
      updatedAt: `${month}-01T10:00:00.000Z`,
      isArchived: false,
      source: 'sber',
      last4: '1111',
    }
    const transactions: MoneyTransaction[] = [
      {
        id: 'tx-expense',
        accountId: account.id,
        type: 'expense',
        amount: 2500,
        category: 'food',
        title: 'Продукты',
        transactionDate: `${month}-05`,
        note: 'Не должно уходить в контекст',
        createdAt: `${month}-05T10:00:00.000Z`,
        updatedAt: `${month}-05T10:00:00.000Z`,
        source: 'sber_text',
        importHash: 'imp-context-expense',
        accountLast4: '1111',
        rawDescription: 'Перевод для Персональные Данные 40817810000000000111',
      },
      {
        id: 'tx-income',
        accountId: account.id,
        type: 'income',
        amount: 5000,
        category: 'salary',
        title: 'Доход',
        transactionDate: `${month}-06`,
        createdAt: `${month}-06T10:00:00.000Z`,
        updatedAt: `${month}-06T10:00:00.000Z`,
      },
    ]

    useMoneyStore.setState({
      accounts: [account],
      transactions,
      plannedPayments: [],
      debts: [],
      monthlyPlans: [],
      lastImportAt: `${month}-07T10:00:00.000Z`,
      importWarnings: ['Тестовое предупреждение'],
    })

    const context = buildMoneyContext()
    const serializedContext = JSON.stringify(context)

    expect(context.totalBalance).toBe(12_500)
    expect(context.monthIncome).toBe(5000)
    expect(context.monthExpense).toBe(2500)
    expect(context.topExpenseCategories[0]).toMatchObject({ category: 'food', amount: 2500 })
    expect(context.lastImportAt).toBe(`${month}-07T10:00:00.000Z`)
    expect('transactions' in context).toBe(false)
    expect(serializedContext).not.toContain('rawDescription')
    expect(serializedContext).not.toContain('Персональные Данные')
    expect(serializedContext).not.toContain('40817810000000000111')
  })
})

describe('buildWeeklyReviewContext', () => {
  beforeEach(() => {
    vi.resetModules()
    installStorage()
  })

  it('возвращает body summary и money summary без полного списка операций и rawDescription', async () => {
    const { useBodyStore } = await import('@/stores/useBodyStore')
    const { useMoneyStore } = await import('@/stores/useMoneyStore')
    const { buildWeeklyReviewContext } = await import('@/services/contextBuilder')
    const todayKey = getLocalDateKey()
    const month = todayKey.slice(0, 7)
    const account: MoneyAccount = {
      id: 'weekly-account',
      name: 'Основная карта',
      type: 'debit_card',
      openingBalance: 20_000,
      createdAt: `${month}-01T10:00:00.000Z`,
      updatedAt: `${month}-01T10:00:00.000Z`,
      isArchived: false,
      source: 'sber',
      last4: '1234',
      debt: 4000,
    }
    const transactions: MoneyTransaction[] = [
      {
        id: 'weekly-income',
        accountId: account.id,
        type: 'income',
        amount: 15_000,
        category: 'salary',
        title: 'Зарплата',
        transactionDate: getDateKeyDaysAgo(1),
        createdAt: `${month}-10T10:00:00.000Z`,
        updatedAt: `${month}-10T10:00:00.000Z`,
        source: 'sber_text',
        importFingerprint: 'weekly-income-fingerprint',
      },
      {
        id: 'weekly-expense',
        accountId: account.id,
        type: 'expense',
        amount: 2700,
        category: 'food',
        title: 'Перевод Ивану 40817810000000000111',
        transactionDate: getDateKeyDaysAgo(2),
        note: 'Не должно уйти в weekly context',
        createdAt: `${month}-11T10:00:00.000Z`,
        updatedAt: `${month}-11T10:00:00.000Z`,
        source: 'sber_pdf',
        importFingerprint: 'weekly-expense-fingerprint',
        rawDescription: 'ФИО Иванов Иван 40817810000000000111 PDF TEXT CONTENT',
      },
      {
        id: 'old-expense',
        accountId: account.id,
        type: 'expense',
        amount: 900,
        category: 'transport',
        title: 'Старая операция',
        transactionDate: getDateKeyDaysAgo(12),
        createdAt: `${month}-01T10:00:00.000Z`,
        updatedAt: `${month}-01T10:00:00.000Z`,
      },
    ]
    const plannedPayments: PlannedPayment[] = [
      {
        id: 'planned-1',
        title: 'Аренда',
        amount: 3000,
        type: 'expense',
        category: 'housing',
        dueDate: `${month}-20`,
        isMandatory: true,
        status: 'planned',
        createdAt: `${month}-01T10:00:00.000Z`,
        updatedAt: `${month}-01T10:00:00.000Z`,
      },
    ]
    const debts: Debt[] = [
      {
        id: 'debt-1',
        title: 'Кредитка',
        originalAmount: 10_000,
        remainingAmount: 5000,
        status: 'active',
        createdAt: `${month}-01T10:00:00.000Z`,
        updatedAt: `${month}-01T10:00:00.000Z`,
      },
    ]

    useBodyStore.setState({
      today: createBodySnapshot(todayKey),
      history: [82.5, 82.1, 81.8, 81.5, 81.2],
      dailyLogs: [1, 2, 3, 4, 5, 6].map((daysAgo, index) => ({
        date: getDateKeyDaysAgo(daysAgo),
        weightKg: 82.4 - index * 0.2,
        waterLiters: 1.5 + index * 0.1,
        steps: 6000 + index * 500,
        workoutDone: index % 2 === 0,
        workout: index % 2 === 0 ? 'Прогулка' : 'Без тренировки',
        nutritionStatus: index === 1 ? 'Сладкое' : 'Нормально',
        movementType: index % 2 === 0 ? 'Прогулка' : 'Без тренировки',
      })),
    })
    useMoneyStore.setState({
      accounts: [account],
      transactions,
      plannedPayments,
      debts,
      monthlyPlans: [],
      lastImportAt: `${month}-12T10:00:00.000Z`,
      importWarnings: ['PDF прочитан локально'],
      importPreview: null,
    })

    const context = buildWeeklyReviewContext()
    const serializedContext = JSON.stringify(context)

    expect(context.bodySummary.daysCount).toBe(7)
    expect(context.bodySummary.weightDelta).toBeLessThan(0)
    expect(context.bodySummary.nutritionFlagsCount.normal).toBeGreaterThan(0)
    expect(context.bodySummary.nutritionFlagsCount.sweets).toBe(1)
    expect(context.moneySummary.weekIncome).toBe(15_000)
    expect(context.moneySummary.weekExpense).toBe(2700)
    expect(context.moneySummary.creditDebt).toBe(4000)
    expect(context.money.plannedPaymentsTotal).toBe(3000)
    expect(context.money.debtsTotal).toBe(5000)
    expect('transactions' in context.money).toBe(false)
    expect(serializedContext).not.toContain('rawDescription')
    expect(serializedContext).not.toContain('40817810000000000111')
    expect(serializedContext).not.toContain('PDF TEXT CONTENT')
    expect(context.dataQuality.body).toBe('good')
    expect(context.dataQuality.money).toBe('good')
  })

  it('ставит low quality, когда недельных данных мало', async () => {
    const { useBodyStore } = await import('@/stores/useBodyStore')
    const { useMoneyStore } = await import('@/stores/useMoneyStore')
    const { buildWeeklyReviewContext } = await import('@/services/contextBuilder')

    useBodyStore.setState({
      today: createBodySnapshot(),
      history: [],
      dailyLogs: [],
    })
    useMoneyStore.setState({
      accounts: [],
      transactions: [],
      plannedPayments: [],
      debts: [],
      monthlyPlans: [],
      importWarnings: [],
      importPreview: null,
      lastImportAt: undefined,
    })

    const context = buildWeeklyReviewContext()

    expect(context.dataQuality.body).toBe('low')
    expect(context.dataQuality.money).toBe('low')
    expect(context.money.dataQualityNote).toContain('Финансовых данных пока мало')
  })
})
