import { describe, expect, it, vi } from 'vitest'

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

describe('first-run onboarding store flow', () => {
  it('saves profile, body check-in and money baseline through existing stores', async () => {
    vi.resetModules()
    installStorage()

    const { useSettingsStore } = await import('@/stores/useSettingsStore')
    const { useBodyStore } = await import('@/stores/useBodyStore')
    const { useMoneyStore } = await import('@/stores/useMoneyStore')
    const { buildWeeklyReviewContext } = await import('@/services/contextBuilder')

    useSettingsStore.getState().updateProfile({
      userName: 'Алексей',
      heightCm: 182,
      bodyGoal: 'weight_loss',
      targetWeightKg: 78,
      activityLevel: 'medium',
      bodyLimitations: 'Беречь колени.',
    })
    useBodyStore.getState().saveCheckin({
      weightKg: 84.2,
      waterLiters: 1.5,
      steps: 4200,
    })
    const moneyResult = useMoneyStore.getState().setupMoneyBaseline({
      trackingStartDate: '2026-07-14',
      accounts: [
        {
          name: 'Основная карта',
          type: 'debit_card',
          openingBalance: 2605.68,
        },
        {
          name: 'Наличные',
          type: 'cash',
          openingBalance: 1500,
        },
        {
          name: 'Кредитка',
          type: 'credit_card',
          creditLimit: 40_000,
          debt: 1269.95,
        },
      ],
    })

    useSettingsStore.getState().completeOnboarding()

    const context = buildWeeklyReviewContext()

    expect(moneyResult.ok).toBe(true)
    expect(useSettingsStore.getState().onboarding.completed).toBe(true)
    expect(useBodyStore.getState().today.weightKg).toBe(84.2)
    expect(useMoneyStore.getState().trackingStartDate).toBe('2026-07-14')
    expect(context.body.profile).toMatchObject({
      heightCm: 182,
      targetWeightKg: 78,
      bodyGoal: 'weight_loss',
      activityLevel: 'medium',
      bodyLimitations: 'Беречь колени.',
    })
    expect(context.money.totalBalance).toBeCloseTo(4105.68)
    expect(context.moneySummary.creditDebt).toBeCloseTo(1269.95)
    expect(JSON.stringify(context)).not.toContain('40000')
  })
})
