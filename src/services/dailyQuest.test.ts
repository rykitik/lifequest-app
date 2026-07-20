import { describe, expect, it, vi } from 'vitest'
import { buildDailyQuest } from '@/services/dailyQuest'
import {
  buildTodayNextStepRecommendation,
  type TodayNextStepContext,
} from '@/services/todayNextStep'
import type { QuestItem } from '@/shared/types'

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

function quest(overrides: Partial<QuestItem> = {}): QuestItem {
  return {
    id: 'quick-1',
    title: 'Личная задача',
    subtitle: '10 минут без перегруза.',
    minutes: 10,
    xp: 12,
    sector: 'focus',
    progress: 0,
    status: 'ready',
    ...overrides,
  }
}

function context(overrides: Partial<TodayNextStepContext> = {}): TodayNextStepContext {
  return {
    profile: {
      onboarding: {
        completed: true,
        skipped: false,
      },
      heightCm: 180,
      bodyGoal: 'weight_loss',
      targetWeightKg: 78,
      targetPace: 'calm',
      activityLevel: 'medium',
    },
    body: {
      today: {
        date: '2026-07-20',
        weightKg: 84,
        waterLiters: 1.4,
        steps: 4200,
        movementType: 'Прогулка',
        nutritionStatus: 'Нормально',
        workoutDone: false,
      },
    },
    money: {
      trackingStartDate: '2026-07-01',
      totalBalance: 12_000,
      safeToSpend: 8000,
      creditDebt: 0,
      lastImportAt: '2026-07-14',
      importWarnings: [],
    },
    weekly: {},
    today: {
      currentMode: 'stable',
      mainQuest: quest({ id: 'main-1', title: 'Главный фокус', minutes: 25 }),
      quickWin: quest(),
      recoveryQuest: quest({ id: 'recovery-1', title: 'Мягкий сброс', sector: 'stability' }),
    },
    progress: {
      level: 3,
    },
    ...overrides,
  }
}

function dailyQuestFromContext(input: TodayNextStepContext, dateKey = '2026-07-20') {
  return buildDailyQuest(buildTodayNextStepRecommendation(input), null, dateKey)
}

async function importStores() {
  vi.resetModules()
  installStorage()

  const dailyQuest = await import('@/services/dailyQuest')
  const feedback = await import('@/stores/useFeedbackStore')
  const progress = await import('@/stores/useProgressStore')
  const today = await import('@/stores/useTodayStore')

  return { dailyQuest, feedback, progress, today }
}

describe('daily quest model', () => {
  it('builds with empty local data', () => {
    const questModel = dailyQuestFromContext(
      context({
        body: {
          today: {
            date: '2026-07-20',
            weightKg: 0,
            waterLiters: 0,
            steps: 0,
            movementType: 'Не выбрано',
            nutritionStatus: 'Не выбрано',
            workoutDone: false,
          },
        },
        money: {
          trackingStartDate: undefined,
          totalBalance: 0,
          safeToSpend: undefined,
          creditDebt: 0,
          importWarnings: [],
        },
      }),
    )

    expect(questModel).toMatchObject({
      title: 'Собрать первый сигнал',
      domain: 'body',
      actionType: 'body_checkin',
      actionLabel: 'Начать',
    })
  })

  it('chooses body check-in when body data is missing', () => {
    const questModel = dailyQuestFromContext(
      context({
        body: {
          today: {
            date: '2026-07-20',
            weightKg: 84,
            waterLiters: 0,
            steps: 0,
            movementType: 'Не выбрано',
            nutritionStatus: 'Не выбрано',
            workoutDone: false,
          },
        },
      }),
    )

    expect(questModel.title).toBe('Собрать первый сигнал')
    expect(questModel.rewardSignal).toContain('Тело')
  })

  it('chooses water when water is low', () => {
    const questModel = dailyQuestFromContext(
      context({
        body: {
          today: {
            date: '2026-07-20',
            weightKg: 84,
            waterLiters: 0.4,
            steps: 4200,
            movementType: 'Прогулка',
            nutritionStatus: 'Нормально',
            workoutDone: false,
          },
        },
      }),
    )

    expect(questModel).toMatchObject({
      title: 'Восстановить водный баланс',
      actionType: 'add_water',
    })
  })

  it('can point to money when baseline needs attention', () => {
    const questModel = dailyQuestFromContext(
      context({
        money: {
          trackingStartDate: undefined,
          totalBalance: 0,
          safeToSpend: undefined,
          creditDebt: 0,
          importWarnings: [],
        },
      }),
    )

    expect(questModel).toMatchObject({
      title: 'Проверить финансовую базу',
      domain: 'money',
      actionType: 'open_money',
    })
  })

  it('companion reaction does not contain shame text', () => {
    const questModel = dailyQuestFromContext(context())

    expect(JSON.stringify(questModel).toLowerCase()).not.toMatch(
      /серия потер|провал|стыд|наказ|виноват|обязан/,
    )
  })
})

describe('daily quest completion', () => {
  it('is idempotent for the same day and triggers reward feedback once', async () => {
    const { dailyQuest, feedback, progress } = await importStores()
    const questModel = dailyQuest.buildDailyQuest(
      buildTodayNextStepRecommendation(context()),
      null,
      '2026-07-20',
    )

    expect(dailyQuest.completeDailyQuestReward(questModel, '2026-07-20')).toBe(true)
    const totalXpAfterFirstApply = progress.useProgressStore.getState().totalXp
    const toastId = feedback.useFeedbackStore.getState().rewardToast?.id

    expect(dailyQuest.completeDailyQuestReward(questModel, '2026-07-20')).toBe(false)
    expect(progress.useProgressStore.getState().totalXp).toBe(totalXpAfterFirstApply)
    expect(feedback.useFeedbackStore.getState().rewardToast?.id).toBe(toastId)
  })

  it('resets completion on the next day', async () => {
    const { dailyQuest, today } = await importStores()
    const questModel = dailyQuest.buildDailyQuest(
      buildTodayNextStepRecommendation(context()),
      null,
      '2026-07-20',
    )

    expect(dailyQuest.completeDailyQuestReward(questModel, '2026-07-20')).toBe(true)
    today.useTodayStore.getState().ensureDailyQuestCurrent('2026-07-21')

    expect(today.useTodayStore.getState().dailyQuestCompletion).toBeNull()
  })
})

describe('progress guard', () => {
  it('keeps progress values clamped after a large reward', async () => {
    const { progress } = await importStores()

    expect(progress.useProgressStore.getState().applyReward({
      xp: 3000,
      sector: 'focus',
      sourceId: 'large-reward',
    })).toBe(true)

    const focus = progress.useProgressStore.getState().sectors.find((sector) => sector.key === 'focus')

    expect(focus?.percent).toBeGreaterThanOrEqual(0)
    expect(focus?.percent).toBeLessThan(100)
  })
})
