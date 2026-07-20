import { describe, expect, it, vi } from 'vitest'
import { defaultCompanionCustomization } from '@/features/companion/lib/customization'
import { buildLifeQuestSkillTree } from '@/features/profile/lib/skillTree'
import {
  buildWeeklyRecapViewModel,
  type WeeklyRecapInput,
} from '@/features/profile/lib/weeklyRecap'
import type {
  LifeQuestMilestone,
  MoneyAccount,
  MoneyTransaction,
  QuestItem,
} from '@/shared/types'

const now = new Date('2026-07-20T12:00:00.000Z')

const emptyInput: WeeklyRecapInput = {
  now,
  settings: {
    userName: '',
    userRole: '',
    onboarding: {
      completed: false,
      skipped: false,
    },
    lastBackupAt: null,
    lastBackupExportAt: null,
  },
  progress: {
    recoveryXp: 0,
    dailySummary: {
      date: '2026-07-20',
      xpToday: 0,
      completedTasks: 0,
      sectorXp: {
        focus: 0,
        body: 0,
        money: 0,
        stability: 0,
        energy: 0,
      },
    },
  },
  companion: {
    mood: 'idle',
    evolutionLevel: 1,
    activeMessage: '',
    stabilityScore: 0,
    customization: defaultCompanionCustomization,
  },
  body: {
    today: {
      date: '2026-07-20',
      weightKg: 82.3,
      weightTrendKg: 0,
      waterLiters: 0,
      steps: 0,
      workout: 'Не выбрано',
      workoutDone: false,
      foodDiscipline: 0,
      nutritionStatus: 'Не выбрано',
      movementType: 'Не выбрано',
      quickAction: '',
    },
    dailyLogs: [],
  },
  money: {
    accounts: [],
    transactions: [],
    importWarnings: [],
  },
  today: {
    currentMode: 'stable',
    route: {
      mainQuest: null,
      quickWin: null,
      recoveryQuest: null,
    },
  },
  milestones: [],
  weekly: {
    summaries: [],
  },
  modules: [],
}

function buildInput(overrides: Partial<WeeklyRecapInput> = {}): WeeklyRecapInput {
  const input = {
    ...emptyInput,
    ...overrides,
    settings: {
      ...emptyInput.settings,
      ...overrides.settings,
    },
    progress: {
      ...emptyInput.progress,
      ...overrides.progress,
    },
    companion: {
      ...emptyInput.companion,
      ...overrides.companion,
    },
    body: {
      ...emptyInput.body,
      ...overrides.body,
      today: {
        ...emptyInput.body.today,
        ...overrides.body?.today,
      },
      dailyLogs: overrides.body?.dailyLogs ?? emptyInput.body.dailyLogs,
    },
    money: {
      ...emptyInput.money,
      ...overrides.money,
    },
    today: {
      ...emptyInput.today,
      ...overrides.today,
      route: {
        ...emptyInput.today.route,
        ...overrides.today?.route,
      },
    },
    milestones: overrides.milestones ?? emptyInput.milestones,
    weekly: {
      ...emptyInput.weekly,
      ...overrides.weekly,
    },
  }

  return {
    ...input,
    modules:
      overrides.modules ??
      buildLifeQuestSkillTree({
        settings: input.settings,
        progress: {
          level: 1,
          currentLevelXp: 0,
          nextLevelXp: 100,
          recoveryXp: input.progress.recoveryXp,
          sectors: [],
          dailySummary: input.progress.dailySummary,
        },
        companion: input.companion,
        body: input.body,
        money: {
          ...input.money,
          plannedPayments: [],
          debts: [],
        },
        weekly: {
          summaries: input.weekly.summaries,
        },
        today: input.today,
        milestones: input.milestones,
      }),
  }
}

function milestone(input: Partial<LifeQuestMilestone> & Pick<LifeQuestMilestone, 'id' | 'type' | 'domain' | 'title' | 'unlockedAt'>): LifeQuestMilestone {
  return {
    caption: 'Сигнал сохранён без приватных деталей.',
    rarity: 'common',
    ...input,
  }
}

function account(input: Partial<MoneyAccount> = {}): MoneyAccount {
  return {
    id: 'account-1',
    name: 'Основная карта',
    type: 'debit_card',
    openingBalance: 1000,
    createdAt: '2026-07-20T10:00:00.000Z',
    updatedAt: '2026-07-20T10:00:00.000Z',
    isArchived: false,
    last4: '1234',
    ...input,
  }
}

function transaction(input: Partial<MoneyTransaction> = {}): MoneyTransaction {
  return {
    id: 'tx-1',
    accountId: 'account-1',
    type: 'expense',
    amount: 9000,
    category: 'health',
    title: 'Аптека личная покупка',
    transactionDate: '2026-07-21',
    createdAt: '2026-07-21T10:00:00.000Z',
    updatedAt: '2026-07-21T10:00:00.000Z',
    note: 'медицинская приватная заметка',
    rawDescription: 'raw private bank text',
    accountLast4: '1234',
    ...input,
  }
}

function routeQuest(input: Partial<QuestItem> = {}): QuestItem {
  return {
    id: 'private-focus',
    title: 'Позвонить врачу по личной теме',
    subtitle: 'private',
    minutes: 10,
    xp: 8,
    sector: 'focus',
    progress: 100,
    status: 'complete',
    ...input,
  }
}

describe('weekly recap view model', () => {
  it('builds with empty data and safe empty state', () => {
    const recap = buildWeeklyRecapViewModel(buildInput())

    expect(recap.status).toBe('empty')
    expect(recap.headline).toBe('Неделя ещё собирает сигналы')
    expect(recap.summary).toContain('первые спокойные сигналы')
    expect(recap.signals).toEqual([])
    expect(recap.nextWeekFocus.title).toBeTruthy()
  })

  it('aggregates body signals without weight or medical details', () => {
    const recap = buildWeeklyRecapViewModel(
      buildInput({
        body: {
          ...emptyInput.body,
          today: {
            ...emptyInput.body.today,
            waterLiters: 1,
            steps: 1200,
            weightKg: 91.7,
          },
          dailyLogs: [
            {
              date: '2026-07-22',
              waterLiters: 1,
              steps: 800,
              workoutDone: false,
              nutritionStatus: 'Нормально',
              movementType: 'Прогулка',
            },
          ],
        },
      }),
    )
    const output = JSON.stringify(recap)

    expect(recap.signals).toContainEqual(expect.objectContaining({
      id: 'body-days',
      value: '2 дн.',
    }))
    expect(output).not.toContain('91.7')
    expect(output).not.toContain('вес')
    expect(output.toLowerCase()).not.toContain('medical')
  })

  it('does not include private money details', () => {
    const recap = buildWeeklyRecapViewModel(
      buildInput({
        money: {
          accounts: [account()],
          transactions: [transaction()],
          trackingStartDate: '2026-07-01',
          lastImportAt: '2026-07-21T10:00:00.000Z',
          importWarnings: ['Есть предупреждение без приватных деталей.'],
        },
      }),
    )
    const output = JSON.stringify(recap)

    expect(recap.signals).toContainEqual(expect.objectContaining({
      id: 'money-update',
      value: 'нужна сверка',
    }))
    expect(output).not.toContain('9000')
    expect(output).not.toContain('1234')
    expect(output).not.toContain('Аптека')
    expect(output).not.toContain('медицинская')
    expect(output).not.toContain('raw private')
  })

  it('does not include raw private focus task titles', () => {
    const recap = buildWeeklyRecapViewModel(
      buildInput({
        today: {
          ...emptyInput.today,
          route: {
            ...emptyInput.today.route,
            mainQuest: routeQuest(),
          },
        },
        progress: {
          ...emptyInput.progress,
          dailySummary: {
            ...emptyInput.progress.dailySummary,
            completedTasks: 1,
          },
        },
      }),
    )

    expect(recap.signals).toContainEqual(expect.objectContaining({
      id: 'focus-completion',
    }))
    expect(JSON.stringify(recap)).not.toContain('Позвонить врачу')
  })

  it('filters milestones to current week', () => {
    const recap = buildWeeklyRecapViewModel(
      buildInput({
        milestones: [
          milestone({
            id: 'current',
            type: 'body_first_signal',
            domain: 'body',
            title: 'Первый сигнал тела',
            unlockedAt: '2026-07-21T10:00:00.000Z',
          }),
          milestone({
            id: 'old',
            type: 'money_baseline_created',
            domain: 'money',
            title: 'Финансовая база создана',
            unlockedAt: '2026-07-12T10:00:00.000Z',
          }),
        ],
      }),
    )

    expect(recap.milestones).toEqual([
      expect.objectContaining({
        id: 'current',
        title: 'Первый сигнал тела',
      }),
    ])
  })

  it('selects strongest module from safe signals and soft attention module', () => {
    const recap = buildWeeklyRecapViewModel(
      buildInput({
        milestones: [
          milestone({
            id: 'daily',
            type: 'daily_quest_completed',
            domain: 'focus',
            title: 'Первый квест дня выполнен',
            unlockedAt: '2026-07-20T10:00:00.000Z',
          }),
        ],
        progress: {
          ...emptyInput.progress,
          dailySummary: {
            ...emptyInput.progress.dailySummary,
            completedTasks: 2,
          },
        },
      }),
    )

    expect(recap.strongestModule).toMatchObject({
      id: 'focus',
      label: 'Фокус',
    })
    expect(recap.attentionModule?.reason).toContain('мягким фокусом')
    expect(JSON.stringify(recap).toLowerCase()).not.toMatch(/провал|стыд|штраф|серия потер|плохая дисциплина/)
  })

  it('prefers recovery attention and deterministic next focus for low mode', () => {
    const recap = buildWeeklyRecapViewModel(
      buildInput({
        today: {
          ...emptyInput.today,
          currentMode: 'low',
        },
      }),
    )

    expect(recap.attentionModule).toMatchObject({
      id: 'recovery',
    })
    expect(recap.nextWeekFocus).toMatchObject({
      domain: 'recovery',
      title: 'Стабилизировать восстановление',
    })
  })

  it('can choose body attention when there is no recovery risk', () => {
    const recap = buildWeeklyRecapViewModel(
      buildInput({
        money: {
          ...emptyInput.money,
          trackingStartDate: '2026-07-01',
        },
        progress: {
          ...emptyInput.progress,
          dailySummary: {
            ...emptyInput.progress.dailySummary,
            completedTasks: 1,
          },
        },
        companion: {
          ...emptyInput.companion,
          customization: {
            displayName: 'NOVA',
            accent: 'violet',
            shell: 'deepSpace',
          },
        },
        settings: {
          ...emptyInput.settings,
          userName: 'Оператор',
          userRole: 'Система',
          heightCm: 180,
          bodyGoal: 'energy',
          targetWeightKg: 80,
          activityLevel: 'medium',
          usualSleepTime: '23:00',
          usualWakeTime: '07:00',
        },
      }),
    )

    expect(recap.attentionModule).toMatchObject({
      id: 'body',
    })
    expect(recap.nextWeekFocus).toMatchObject({
      domain: 'body',
      title: 'Собрать телесный сигнал',
    })
  })

  it('keeps skill tree module ids compatible and does not call API', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const input = buildInput()
    const recap = buildWeeklyRecapViewModel(input)
    const moduleIds = new Set(input.modules.map((module) => module.id))

    expect(['body', 'money', 'focus', 'recovery', 'system', 'companion'].every((id) => moduleIds.has(id as typeof input.modules[number]['id']))).toBe(true)
    expect(recap.nextWeekFocus.domain).toMatch(/body|money|focus|recovery|system|companion/)
    expect(fetchSpy).not.toHaveBeenCalled()

    fetchSpy.mockRestore()
  })
})
