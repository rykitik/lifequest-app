import { describe, expect, it, vi } from 'vitest'
import type { MoneyAccount, MoneyTransaction, PlannedPayment } from '@/shared/types'

vi.setConfig({ testTimeout: 15_000 })

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

async function importMoneyStore() {
  vi.resetModules()
  installStorage()

  return import('@/stores/useMoneyStore')
}

async function importMoneyLib() {
  vi.resetModules()

  return import('@/features/money/lib/money')
}

function validAccount(input: Partial<MoneyAccount> = {}): MoneyAccount {
  return {
    id: 'account-1',
    name: 'Основная карта',
    type: 'debit_card',
    openingBalance: 10_000,
    createdAt: '2026-07-01T10:00:00.000Z',
    updatedAt: '2026-07-01T10:00:00.000Z',
    isArchived: false,
    ...input,
  }
}

function validTransaction(input: Partial<MoneyTransaction> = {}): MoneyTransaction {
  return {
    id: 'tx-1',
    accountId: 'account-1',
    type: 'expense',
    amount: 700,
    category: 'food',
    title: 'Продукты',
    transactionDate: '2026-07-12',
    createdAt: '2026-07-12T10:00:00.000Z',
    updatedAt: '2026-07-12T10:00:00.000Z',
    ...input,
  }
}

function validPlannedPayment(input: Partial<PlannedPayment> = {}): PlannedPayment {
  return {
    id: 'planned-1',
    title: 'Аренда',
    amount: 3000,
    type: 'expense',
    category: 'housing',
    accountId: 'account-1',
    dueDate: '2026-07-20',
    isMandatory: true,
    status: 'planned',
    createdAt: '2026-07-12T10:00:00.000Z',
    updatedAt: '2026-07-12T10:00:00.000Z',
    ...input,
  }
}

describe('useMoneyStore', () => {
  it('создаёт счёт и считает баланс счёта', async () => {
    const { useMoneyStore } = await importMoneyStore()
    const { getAccountBalance } = await import('@/features/money/lib/money')

    const result = useMoneyStore.getState().addAccount({
      name: 'Основная карта',
      type: 'debit_card',
      openingBalance: 10_000,
    })

    expect(result.ok).toBe(true)
    expect(useMoneyStore.getState().accounts).toHaveLength(1)
    expect(getAccountBalance(useMoneyStore.getState().accounts[0]!, [])).toBe(10_000)
  })

  it('считает общий баланс нескольких счетов', async () => {
    const { getTotalBalance } = await importMoneyLib()
    const accounts = [
      validAccount({ id: 'account-1', openingBalance: 10_000 }),
      validAccount({ id: 'account-2', name: 'Наличные', type: 'cash', openingBalance: 1500 }),
    ]

    expect(getTotalBalance(accounts, [])).toBe(11_500)
  })

  it('доход увеличивает баланс, расход уменьшает, adjustment меняет расчётно', async () => {
    const { getAccountBalance } = await importMoneyLib()
    const account = validAccount()
    const transactions = [
      validTransaction({ id: 'income-1', type: 'income', amount: 2000, category: 'salary' }),
      validTransaction({ id: 'expense-1', type: 'expense', amount: 700, category: 'food' }),
      validTransaction({
        id: 'adjust-1',
        type: 'adjustment',
        amount: 100,
        category: 'other',
        adjustmentDirection: 'decrease',
      }),
    ]

    expect(getAccountBalance(account, transactions)).toBe(11_200)
  })

  it('архивный счёт не входит в общий баланс', async () => {
    const { getTotalBalance } = await importMoneyLib()

    expect(
      getTotalBalance([
        validAccount({ openingBalance: 1000 }),
        validAccount({ id: 'archived', openingBalance: 9000, isArchived: true }),
      ], []),
    ).toBe(1000)
  })

  it('считает недельное изменение только за 7 календарных дней и без adjustment', async () => {
    const { getWeeklyDelta } = await importMoneyLib()
    const transactions = [
      validTransaction({ id: 'today', transactionDate: '2026-07-12', type: 'income', amount: 1000, category: 'salary' }),
      validTransaction({ id: 'week-start', transactionDate: '2026-07-06', type: 'expense', amount: 200, category: 'food' }),
      validTransaction({ id: 'old', transactionDate: '2026-07-05', type: 'income', amount: 5000, category: 'gift' }),
      validTransaction({ id: 'adjust', transactionDate: '2026-07-12', type: 'adjustment', amount: 999, category: 'other' }),
    ]

    expect(getWeeklyDelta(transactions, '2026-07-12')).toBe(800)
  })

  it('нулевые значения остаются данными и расчёты не дают NaN или Infinity', async () => {
    const { getDebtProgress, getMonthlyPlanProjection } = await importMoneyLib()
    const projection = getMonthlyPlanProjection({
      accounts: [],
      transactions: [],
      plannedPayments: [],
      debts: [],
      monthlyPlans: [],
    })

    expect(projection.safeToSpend).toBe(0)
    expect(Number.isFinite(projection.plannedTotal)).toBe(true)
    expect(getDebtProgress({ ...validAccount(), originalAmount: 0 } as never)).toBe(0)
  })

  it('создаёт monthly plan и повторное сохранение месяца обновляет, а не дублирует', async () => {
    const { useMoneyStore } = await importMoneyStore()

    useMoneyStore.getState().setMonthlyPlan({
      month: '2026-07',
      expectedIncome: 20_000,
      mandatoryExpenses: 3000,
    })
    useMoneyStore.getState().setMonthlyPlan({
      month: '2026-07',
      expectedIncome: 25_000,
      flexibleSpendingLimit: 5000,
    })

    expect(useMoneyStore.getState().monthlyPlans).toHaveLength(1)
    expect(useMoneyStore.getState().monthlyPlans[0]).toMatchObject({
      expectedIncome: 25_000,
      flexibleSpendingLimit: 5000,
    })
  })

  it('считает plannedTotal и safeToSpend без двойного вычитания одного платежа', async () => {
    const { getMonthlyPlanProjection } = await importMoneyLib()
    const projection = getMonthlyPlanProjection(
      {
        accounts: [validAccount()],
        transactions: [],
        plannedPayments: [validPlannedPayment({ category: 'debt_payment', amount: 3000 })],
        debts: [],
        monthlyPlans: [
          {
            id: 'plan-1',
            month: '2026-07',
            expectedIncome: 0,
            mandatoryExpenses: 0,
            debtPaymentTarget: 3000,
            savingsTarget: 1000,
            flexibleSpendingLimit: 2000,
            createdAt: '2026-07-12T10:00:00.000Z',
            updatedAt: '2026-07-12T10:00:00.000Z',
          },
        ],
      },
      '2026-07',
    )

    expect(projection.plannedTotal).toBe(6000)
    expect(projection.safeToSpend).toBe(6000)
    expect(projection.estimatedMonthEnd).toBe(7000)
  })

  it('создаёт плановый платёж, завершает его одной транзакцией и повторно не дублирует', async () => {
    const { useMoneyStore } = await importMoneyStore()
    const accountId = useMoneyStore.getState().addAccount({
      name: 'Карта',
      type: 'debit_card',
      openingBalance: 10_000,
    }).id!
    const paymentId = useMoneyStore.getState().addPlannedPayment({
      title: 'Аренда',
      amount: 3000,
      type: 'expense',
      category: 'housing',
      accountId,
      dueDate: '2026-07-20',
      isMandatory: true,
    }).id!

    expect(useMoneyStore.getState().plannedPayments).toHaveLength(1)
    expect(useMoneyStore.getState().completePlannedPayment(paymentId).ok).toBe(true)
    expect(useMoneyStore.getState().completePlannedPayment(paymentId).ok).toBe(false)
    expect(useMoneyStore.getState().transactions).toHaveLength(1)
    expect(useMoneyStore.getState().plannedPayments[0]!.completedTransactionId).toBe(
      useMoneyStore.getState().transactions[0]!.id,
    )
  })

  it('пропущенный платёж не создаёт транзакцию', async () => {
    const { useMoneyStore } = await importMoneyStore()
    const paymentId = useMoneyStore.getState().addPlannedPayment({
      title: 'Подписка',
      amount: 500,
      type: 'expense',
      category: 'subscriptions',
      dueDate: '2026-07-20',
    }).id!

    expect(useMoneyStore.getState().skipPlannedPayment(paymentId).ok).toBe(true)
    expect(useMoneyStore.getState().transactions).toHaveLength(0)
  })

  it('долг добавляется, платёж уменьшает остаток, не уходит ниже нуля и закрывает долг', async () => {
    const { useMoneyStore } = await importMoneyStore()
    const accountId = useMoneyStore.getState().addAccount({
      name: 'Карта',
      type: 'debit_card',
      openingBalance: 30_000,
    }).id!
    const debtId = useMoneyStore.getState().addDebt({
      title: 'Долг',
      originalAmount: 20_000,
      remainingAmount: 2000,
    }).id!

    useMoneyStore.getState().recordDebtPayment({
      debtId,
      accountId,
      amount: 5000,
      paymentDate: '2026-07-12',
      idempotencyKey: 'debt-payment-1',
    })

    expect(useMoneyStore.getState().debts[0]).toMatchObject({
      remainingAmount: 0,
      status: 'closed',
    })
    expect(useMoneyStore.getState().transactions[0]).toMatchObject({
      amount: 2000,
      category: 'debt_payment',
      debtId,
    })
  })

  it('повторный debt payment с тем же idempotencyKey не создаётся', async () => {
    const { useMoneyStore } = await importMoneyStore()
    const accountId = useMoneyStore.getState().addAccount({
      name: 'Карта',
      type: 'debit_card',
      openingBalance: 30_000,
    }).id!
    const debtId = useMoneyStore.getState().addDebt({
      title: 'Долг',
      originalAmount: 20_000,
    }).id!
    const input = {
      debtId,
      accountId,
      amount: 2000,
      paymentDate: '2026-07-12',
      idempotencyKey: 'same-submit',
    }

    expect(useMoneyStore.getState().recordDebtPayment(input).ok).toBe(true)
    expect(useMoneyStore.getState().recordDebtPayment(input).ok).toBe(false)
    expect(useMoneyStore.getState().transactions).toHaveLength(1)
    expect(useMoneyStore.getState().debts[0]!.remainingAmount).toBe(18_000)
  })

  it('повреждённый localStorage не ломает store', async () => {
    vi.resetModules()
    installStorage()
    localStorage.setItem('lifequest-money', '{broken')

    const { useMoneyStore } = await import('@/stores/useMoneyStore')

    expect(useMoneyStore.getState().accounts).toEqual([])
    expect(useMoneyStore.getState().transactions).toEqual([])
  })

  it('фильтрует некорректные persisted-записи', async () => {
    vi.resetModules()
    installStorage()
    localStorage.setItem(
      'lifequest-money',
      JSON.stringify({
        state: {
          accounts: [
            validAccount(),
            { id: 'broken', name: 'Bad', openingBalance: Number.NaN },
          ],
          transactions: [
            validTransaction(),
            validTransaction({ id: 'bad-amount', amount: -10 }),
            validTransaction({ id: 'bad-account', accountId: 'missing' }),
          ],
          plannedPayments: [validPlannedPayment(), validPlannedPayment({ id: 'bad-payment', amount: 0 })],
          debts: [
            {
              id: 'debt-1',
              title: 'Долг',
              originalAmount: 10_000,
              remainingAmount: 9000,
              status: 'active',
              createdAt: '2026-07-12T10:00:00.000Z',
              updatedAt: '2026-07-12T10:00:00.000Z',
            },
            { id: 'bad-debt', title: 'Bad', originalAmount: 100, remainingAmount: -1 },
          ],
          monthlyPlans: [],
        },
        version: 1,
      }),
    )

    const { useMoneyStore } = await import('@/stores/useMoneyStore')

    expect(useMoneyStore.getState().accounts).toHaveLength(1)
    expect(useMoneyStore.getState().transactions).toHaveLength(1)
    expect(useMoneyStore.getState().plannedPayments).toHaveLength(1)
    expect(useMoneyStore.getState().debts).toHaveLength(1)
  })

  it('неизвестная версия storage обрабатывается безопасно', async () => {
    vi.resetModules()
    installStorage()
    localStorage.setItem(
      'lifequest-money',
      JSON.stringify({
        state: { accounts: [validAccount()] },
        version: 999,
      }),
    )

    const { useMoneyStore } = await import('@/stores/useMoneyStore')

    expect(useMoneyStore.getState().accounts).toEqual([])
  })

  it('формирует контекстные финансовые действия по правилам', async () => {
    const { getSuggestedMoneyActions } = await importMoneyLib()
    const actions = getSuggestedMoneyActions(
      {
        accounts: [validAccount()],
        transactions: [],
        plannedPayments: [validPlannedPayment({ dueDate: '2026-07-15' })],
        debts: [
          {
            id: 'debt-1',
            title: 'Долг',
            originalAmount: 10_000,
            remainingAmount: 9000,
            status: 'active',
            createdAt: '2026-07-12T10:00:00.000Z',
            updatedAt: '2026-07-12T10:00:00.000Z',
          },
        ],
        monthlyPlans: [],
      },
      '2026-07-12',
    )

    expect(actions.map((action) => action.id)).toEqual([
      'balance-check',
      'yesterday-expense',
      'plan-debt-payment',
    ])
  })

  it('completed planned payment не учитывается в будущих обязательствах', async () => {
    const { getMonthlyPlanProjection } = await importMoneyLib()
    const projection = getMonthlyPlanProjection(
      {
        accounts: [validAccount()],
        transactions: [],
        plannedPayments: [validPlannedPayment({ status: 'completed', completedTransactionId: 'tx-1' })],
        debts: [],
        monthlyPlans: [],
      },
      '2026-07',
    )

    expect(projection.mandatoryPlannedExpense).toBe(0)
    expect(projection.safeToSpend).toBe(10_000)
  })

  it('форматирование невалидной даты не вызывает crash', async () => {
    const { formatDateSafe } = await importMoneyLib()

    expect(formatDateSafe('2026-07-12T19:52:00.000Z')).toContain('2026')
    expect(formatDateSafe('не дата')).toBe('Дата не указана')
  })

  it('importPreviewTransactions не создаёт дубли при повторном импорте той же выписки', async () => {
    const { useMoneyStore } = await importMoneyStore()
    const { parseSberStatementText } = await import('@/services/moneyImport/sberStatementParser')
    const sampleText = `
СберБанк
Выписка по платёжному счёту
Карта **** 6128
За период 01.07.2026 — 12.07.2026
Остаток на начало периода 10000,00 ₽
01.07.2026 Продукты Пятерочка -700,00 ₽ 9300,00 ₽
02.07.2026 Зарплата +2000,00 ₽ 11300,00 ₽
`
    const firstPreview = parseSberStatementText(sampleText, useMoneyStore.getState().transactions)

    expect(useMoneyStore.getState().setImportPreview(firstPreview).ok).toBe(true)
    expect(useMoneyStore.getState().importPreviewTransactions()).toMatchObject({
      ok: true,
      imported: 2,
      duplicates: 0,
    })

    const secondPreview = parseSberStatementText(sampleText, useMoneyStore.getState().transactions)

    expect(useMoneyStore.getState().setImportPreview(secondPreview).ok).toBe(true)
    expect(useMoneyStore.getState().importPreviewTransactions()).toMatchObject({
      ok: true,
      imported: 0,
      duplicates: 2,
    })
    expect(useMoneyStore.getState().transactions).toHaveLength(2)
  })

  it('повреждённый importPreview не ломает store', async () => {
    const { useMoneyStore } = await importMoneyStore()

    useMoneyStore.setState({
      importPreview: { source: 'sber_text' } as never,
    })

    const result = useMoneyStore.getState().importPreviewTransactions()

    expect(result.ok).toBe(false)
    expect(useMoneyStore.getState().importPreview).toBeNull()
    expect(useMoneyStore.getState().importWarnings[0]).toContain('повреждён')
  })

  it('старый persisted state без importPreview и import-полей мигрирует спокойно', async () => {
    vi.resetModules()
    installStorage()
    localStorage.setItem(
      'lifequest-money',
      JSON.stringify({
        state: {
          accounts: [validAccount()],
          transactions: [validTransaction()],
          plannedPayments: [],
          debts: [],
          monthlyPlans: [],
        },
        version: 1,
      }),
    )

    const { useMoneyStore } = await import('@/stores/useMoneyStore')

    expect(useMoneyStore.getState().accounts).toHaveLength(1)
    expect(useMoneyStore.getState().transactions).toHaveLength(1)
    expect(useMoneyStore.getState().importPreview).toBeNull()
    expect(useMoneyStore.getState().importWarnings).toEqual([])
  })
})
