import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MoneyAccount, MoneyTransaction } from '@/shared/types'

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
