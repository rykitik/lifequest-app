import { describe, expect, it, vi } from 'vitest'
import type { SystemProfileInput } from './systemProfile'
import { buildSystemProfileViewModel, clampSystemPercent } from './systemProfile'

const emptyInput: SystemProfileInput = {
  settings: {
    userName: '',
    userRole: '',
    lastBackupAt: null,
    lastBackupExportAt: null,
    onboarding: {
      completed: false,
      skipped: false,
    },
  },
  progress: {
    level: 1,
    totalXp: 0,
    currentLevelXp: 0,
    nextLevelXp: 100,
    recoveryXp: 0,
    sectors: [],
    dailySummary: {
      date: '2026-07-17',
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
  },
  body: {
    today: {
      date: '2026-07-17',
      weightKg: 0,
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
  weekly: {
    summaries: [],
  },
  today: {
    currentMode: 'stable',
    route: {
      mainQuest: null,
      quickWin: null,
      recoveryQuest: null,
    },
  },
}

function buildInput(overrides: Partial<SystemProfileInput> = {}): SystemProfileInput {
  return {
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
    },
    money: {
      ...emptyInput.money,
      ...overrides.money,
    },
    weekly: {
      ...emptyInput.weekly,
      ...overrides.weekly,
    },
    today: {
      ...emptyInput.today,
      ...overrides.today,
    },
  }
}

describe('system profile view model', () => {
  it('builds with empty local data and meaningful empty states', () => {
    const profile = buildSystemProfileViewModel(emptyInput)

    expect(profile.userName).toBe('Оператор')
    expect(profile.title).toBe('Оператор системы')
    expect(profile.systemStatus).toBe('База собирается')
    expect(profile.localModeLabel).toBe('Локальная база')
    expect(profile.recentMilestones).toEqual([])
    expect(profile.milestoneEmptyText).toContain('Первые вехи появятся')
    expect(profile.nextStep.label).toBe('Начать с одного простого действия')
  })

  it('does not produce shame or punishment copy', () => {
    const profile = buildSystemProfileViewModel(emptyInput)
    const copy = JSON.stringify(profile).toLowerCase()
    const forbidden = ['провал', 'виноват', 'ленив', 'стыд', 'штраф', 'серия потеряна']

    for (const word of forbidden) {
      expect(copy).not.toContain(word)
    }
  })

  it('clamps module progress values from existing sectors', () => {
    const profile = buildSystemProfileViewModel(
      buildInput({
        progress: {
          ...emptyInput.progress,
          sectors: [
            { key: 'body', label: 'Тело', level: 1, percent: 148, xp: 0, color: '#fff' },
            { key: 'money', label: 'Деньги', level: 1, percent: -20, xp: 0, color: '#fff' },
            { key: 'focus', label: 'Фокус', level: 1, percent: 61, xp: 0, color: '#fff' },
            { key: 'stability', label: 'Стабильность', level: 1, percent: 120, xp: 0, color: '#fff' },
            { key: 'energy', label: 'Энергия', level: 1, percent: 80, xp: 0, color: '#fff' },
          ],
        },
      }),
    )

    expect(profile.modules.map((module) => module.value)).toEqual([100, 0, 61, 100])
    expect(clampSystemPercent(Number.NaN)).toBe(0)
  })

  it('renders companion evolution summary with current and next form', () => {
    const profile = buildSystemProfileViewModel(
      buildInput({
        progress: {
          ...emptyInput.progress,
          level: 7,
          currentLevelXp: 74,
          nextLevelXp: 100,
        },
        companion: {
          ...emptyInput.companion,
          mood: 'focused',
          activeMessage: 'База стабильна. Следующий шаг уже выбран.',
        },
      }),
    )

    expect(profile.companionForm).toBe('Core Mk-II')
    expect(profile.companionState).toBe('Сфокусирован')
    expect(profile.nextEvolutionLabel).toBe('Core Mk-III')
    expect(profile.nextEvolutionProgressPercent).toBe(74)
    expect(profile.nextEvolutionRemainingPercent).toBe(26)
  })

  it('keeps recent milestones free from private transaction details', () => {
    const profile = buildSystemProfileViewModel(
      buildInput({
        money: {
          ...emptyInput.money,
          transactions: [
            {
              id: 'tx-private',
              accountId: 'account-1',
              type: 'expense',
              amount: 1234,
              category: 'health',
              title: 'Аптека 1234',
              transactionDate: '2026-07-17',
              note: 'личная покупка',
              createdAt: '2026-07-17T10:00:00.000Z',
              updatedAt: '2026-07-17T10:00:00.000Z',
              rawDescription: 'Аптека 1234 подробности',
            },
          ],
        },
      }),
    )
    const copy = JSON.stringify(profile.recentMilestones)

    expect(copy).toContain('Денежная база создана')
    expect(copy).not.toContain('Аптека')
    expect(copy).not.toContain('личная покупка')
    expect(copy).not.toContain('1234')
  })

  it('works when auth/backend are disabled and does not call fetch', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const profile = buildSystemProfileViewModel(emptyInput)

    expect(profile.localModeLabel).toBe('Локальная база')
    expect(fetchSpy).not.toHaveBeenCalled()

    fetchSpy.mockRestore()
  })

  it('uses compact labels for long module names', () => {
    const profile = buildSystemProfileViewModel(emptyInput)
    const recovery = profile.modules.find((module) => module.id === 'recovery')

    expect(recovery?.label).toBe('Восстановление')
    expect(recovery?.compactLabel).toBe('Восст.')
  })

  it('derives milestones from safe local signals', () => {
    const profile = buildSystemProfileViewModel(
      buildInput({
        settings: {
          ...emptyInput.settings,
          lastBackupAt: '2026-07-17T12:00:00.000Z',
          onboarding: {
            completed: true,
            skipped: false,
          },
        },
        body: {
          ...emptyInput.body,
          today: {
            ...emptyInput.body.today,
            waterLiters: 1,
          },
        },
        weekly: {
          summaries: [{ id: 'weekly-1', createdAt: '2026-07-16T12:00:00.000Z' }],
        },
      }),
    )

    expect(profile.recentMilestones.map((milestone) => milestone.label)).toContain(
      'Резервная копия создана',
    )
    expect(profile.recentMilestones.map((milestone) => milestone.label)).toContain(
      'Чек-ин тела выполнен',
    )
  })
})
