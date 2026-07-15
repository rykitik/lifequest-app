import { describe, expect, it } from 'vitest'
import {
  buildTodayNextStepRecommendation,
  type TodayNextStepContext,
} from '@/services/todayNextStep'
import type { QuestItem } from '@/shared/types'

function quest(overrides: Partial<QuestItem> = {}): QuestItem {
  return {
    id: 'quick-1',
    title: 'Сделать один чистый шаг',
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
        date: '2026-07-15',
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

describe('buildTodayNextStepRecommendation', () => {
  it('profile missing -> предлагает заполнить профиль', () => {
    const recommendation = buildTodayNextStepRecommendation(
      context({
        profile: {
          onboarding: {
            completed: false,
            skipped: true,
          },
          bodyGoal: 'not_set',
        },
      }),
    )

    expect(recommendation).toMatchObject({
      id: 'profile-baseline-missing',
      domain: 'profile',
      actionLabel: 'Открыть профиль',
    })
  })

  it('body empty today -> предлагает быстрый чек-ин тела', () => {
    const recommendation = buildTodayNextStepRecommendation(
      context({
        body: {
          today: {
            date: '2026-07-15',
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

    expect(recommendation).toMatchObject({
      id: 'body-quick-checkin',
      domain: 'body',
      minutes: 2,
    })
  })

  it('water below baseline -> предлагает воду', () => {
    const recommendation = buildTodayNextStepRecommendation(
      context({
        body: {
          today: {
            date: '2026-07-15',
            weightKg: 84,
            waterLiters: 0.5,
            steps: 3500,
            movementType: 'Прогулка',
            nutritionStatus: 'Нормально',
            workoutDone: false,
          },
        },
      }),
    )

    expect(recommendation).toMatchObject({
      id: 'body-water-low',
      title: 'Выпить воды',
      subtitle: '+500 мл',
      actionLabel: 'Отметить воду',
    })
  })

  it('steps low -> предлагает прогулку', () => {
    const recommendation = buildTodayNextStepRecommendation(
      context({
        body: {
          today: {
            date: '2026-07-15',
            weightKg: 84,
            waterLiters: 1.2,
            steps: 1200,
            movementType: 'Без тренировки',
            nutritionStatus: 'Нормально',
            workoutDone: false,
          },
        },
      }),
    )

    expect(recommendation).toMatchObject({
      id: 'body-steps-low',
      title: 'Пройти 5 минут',
    })
  })

  it('money risk -> предлагает проверить деньги', () => {
    const recommendation = buildTodayNextStepRecommendation(
      context({
        money: {
          trackingStartDate: '2026-07-01',
          totalBalance: 1000,
          safeToSpend: -500,
          creditDebt: 0,
          importWarnings: [],
        },
      }),
    )

    expect(recommendation).toMatchObject({
      id: 'money-safe-balance',
      domain: 'money',
      actionLabel: 'Открыть деньги',
    })
  })

  it('weekly risk -> предлагает закрыть риск недели', () => {
    const recommendation = buildTodayNextStepRecommendation(
      context({
        weekly: {
          latest: {
            risk: 'Усталость может привести к срыву режима и лишним расходам.',
            bodyFocus: 'Вода и движение.',
            moneyFocus: 'Один денежный чек.',
            summary: 'Неделя стала понятнее.',
            dataQuality: 'medium',
            appliedActionsCount: 1,
          },
        },
      }),
    )

    expect(recommendation).toMatchObject({
      id: 'weekly-risk',
      domain: 'weekly',
      actionLabel: 'Открыть Центр промптов',
    })
  })

  it('low energy mode -> предлагает восстановление', () => {
    const recommendation = buildTodayNextStepRecommendation(
      context({
        today: {
          currentMode: 'low',
          mainQuest: quest({ id: 'main-1' }),
          quickWin: quest({ id: 'quick-1' }),
          recoveryQuest: quest({ id: 'recovery-1', sector: 'stability' }),
        },
      }),
    )

    expect(recommendation).toMatchObject({
      id: 'recovery-low-energy',
      domain: 'recovery',
      actionLabel: 'Открыть запасной план',
    })
  })

  it('normal state -> fallback на quickWin', () => {
    const recommendation = buildTodayNextStepRecommendation(context())

    expect(recommendation).toMatchObject({
      id: 'focus-quick-1',
      domain: 'focus',
      title: 'Сделать один чистый шаг',
    })
  })

  it('creditLimit не воспринимается как свободные деньги', () => {
    const recommendation = buildTodayNextStepRecommendation(
      context({
        money: {
          trackingStartDate: '2026-07-01',
          totalBalance: 0,
          safeToSpend: 0,
          creditDebt: 12_500,
          importWarnings: [],
        },
      }),
    )

    expect(recommendation).toMatchObject({
      id: 'money-safe-balance',
      domain: 'money',
    })
  })

  it('bodyLimitations не предлагает прогулку при явном ограничении', () => {
    const recommendation = buildTodayNextStepRecommendation(
      context({
        profile: {
          onboarding: {
            completed: true,
            skipped: false,
          },
          heightCm: 180,
          bodyGoal: 'weight_loss',
          targetWeightKg: 78,
          bodyLimitations: 'Беречь колени после травмы.',
        },
        body: {
          today: {
            date: '2026-07-15',
            weightKg: 84,
            waterLiters: 1.2,
            steps: 1200,
            movementType: 'Без тренировки',
            nutritionStatus: 'Нормально',
            workoutDone: false,
          },
        },
      }),
    )

    expect(recommendation.id).not.toBe('body-steps-low')
    expect(recommendation.domain).toBe('focus')
  })
})
