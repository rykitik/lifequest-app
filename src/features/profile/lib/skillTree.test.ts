import { describe, expect, it, vi } from 'vitest'
import { defaultCompanionCustomization } from '@/features/companion/lib/customization'
import {
  buildLifeQuestSkillTree,
  type LifeQuestSkillModule,
  type SkillTreeInput,
} from '@/features/profile/lib/skillTree'
import type {
  DailyQuest,
  LifeQuestMilestone,
  MoneyAccount,
  MoneyTransaction,
  QuestItem,
  SectorProgress,
} from '@/shared/types'

const emptyInput: SkillTreeInput = {
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
    level: 1,
    currentLevelXp: 0,
    nextLevelXp: 100,
    recoveryXp: 0,
    sectors: [],
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
    plannedPayments: [],
    debts: [],
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
  milestones: [],
}

function buildInput(overrides: Partial<SkillTreeInput> = {}): SkillTreeInput {
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
    weekly: {
      ...emptyInput.weekly,
      ...overrides.weekly,
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
  }
}

function moduleById(modules: LifeQuestSkillModule[], id: LifeQuestSkillModule['id']) {
  const module = modules.find((item) => item.id === id)

  if (!module) {
    throw new Error(`Module not found: ${id}`)
  }

  return module
}

function sector(key: SectorProgress['key'], percent: number): SectorProgress {
  return {
    key,
    label: key,
    level: 1,
    percent,
    xp: 0,
    color: '#22D3EE',
  }
}

function milestone(input: Partial<LifeQuestMilestone> & Pick<LifeQuestMilestone, 'id' | 'type' | 'domain' | 'title'>): LifeQuestMilestone {
  return {
    unlockedAt: '2026-07-20T10:00:00.000Z',
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
    ...input,
  }
}

function transaction(input: Partial<MoneyTransaction> = {}): MoneyTransaction {
  return {
    id: 'tx-1',
    accountId: 'account-1',
    type: 'expense',
    amount: 1234,
    category: 'health',
    title: 'Аптека личная покупка',
    transactionDate: '2026-07-20',
    createdAt: '2026-07-20T10:00:00.000Z',
    updatedAt: '2026-07-20T10:00:00.000Z',
    note: 'приватная заметка',
    rawDescription: 'raw private bank text',
    ...input,
  }
}

function privateFocusQuest(overrides: Partial<DailyQuest> = {}): DailyQuest {
  return {
    id: '2026-07-20:private-focus',
    title: 'Позвонить врачу по личной теме',
    caption: 'private',
    domain: 'focus',
    difficulty: 'tiny',
    rewardSignal: 'Фокус +8',
    companionReaction: 'Маршрут укреплён.',
    actionType: 'focus_step',
    actionLabel: 'Выполнить',
    xp: 8,
    sector: 'focus',
    ...overrides,
  }
}

function routeQuest(overrides: Partial<QuestItem> = {}): QuestItem {
  return {
    id: 'private-focus',
    title: 'Позвонить врачу по личной теме',
    subtitle: 'private',
    minutes: 10,
    xp: 8,
    sector: 'focus',
    progress: 0,
    status: 'ready',
    ...overrides,
  }
}

describe('skill tree view model', () => {
  it('builds with empty local data and all six modules', () => {
    const modules = buildLifeQuestSkillTree(emptyInput)

    expect(modules.map((module) => module.id)).toEqual([
      'body',
      'money',
      'focus',
      'recovery',
      'system',
      'companion',
    ])
    expect(modules.every((module) => module.levelLabel.length > 0)).toBe(true)
    expect(modules.every((module) => module.suggestion)).toBe(true)
    expect(moduleById(modules, 'body').levelLabel).toBe('Нужны первые сигналы')
  })

  it('body suggestion chooses check-in when no body data', () => {
    const body = moduleById(buildLifeQuestSkillTree(emptyInput), 'body')

    expect(body.suggestion).toMatchObject({
      id: 'body-checkin',
      title: 'Сделать чек-ин тела',
      actionType: 'open_body',
      safeDomain: 'body',
    })
  })

  it('body suggestion chooses water when water is low', () => {
    const body = moduleById(
      buildLifeQuestSkillTree(
        buildInput({
          body: {
            ...emptyInput.body,
            today: {
              ...emptyInput.body.today,
              steps: 800,
              waterLiters: 0,
            },
          },
        }),
      ),
      'body',
    )

    expect(body.suggestion).toMatchObject({
      id: 'body-water',
      title: 'Добавить воду',
      actionType: 'add_water',
    })
  })

  it('money suggestion chooses baseline when no baseline exists', () => {
    const money = moduleById(buildLifeQuestSkillTree(emptyInput), 'money')

    expect(money.suggestion).toMatchObject({
      id: 'money-baseline',
      title: 'Создать финансовую базу',
      actionType: 'open_money',
      safeDomain: 'money',
    })
  })

  it('focus suggestion links to daily quest when waiting', () => {
    const focus = moduleById(
      buildLifeQuestSkillTree(
        buildInput({
          today: {
            ...emptyInput.today,
            dailyQuest: privateFocusQuest(),
            route: {
              ...emptyInput.today.route,
              mainQuest: routeQuest(),
            },
          },
        }),
      ),
      'focus',
    )

    expect(focus.suggestion).toMatchObject({
      id: 'focus-daily-quest',
      title: 'Закрыть главный квест',
      actionType: 'open_today',
      linkedDailyQuest: 'waiting',
    })
    expect(JSON.stringify(focus.suggestion)).not.toContain('Позвонить врачу')
  })

  it('system suggestion chooses backup when backup reminder is active', () => {
    const system = moduleById(
      buildLifeQuestSkillTree(
        buildInput({
          settings: {
            onboarding: {
              completed: true,
              skipped: false,
            },
            lastBackupReason: 'money_import_completed',
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
      ),
      'system',
    )

    expect(system.suggestion).toMatchObject({
      id: 'system-backup',
      title: 'Сделать backup',
      actionType: 'open_backup',
    })
  })

  it('companion suggestion chooses customization when core is default', () => {
    const companion = moduleById(buildLifeQuestSkillTree(emptyInput), 'companion')

    expect(companion.suggestion).toMatchObject({
      id: 'companion-customization',
      title: 'Настроить Core',
      actionType: 'open_companion_customization',
      safeDomain: 'companion',
    })
  })

  it('clamps progress values 0-100 from sectors', () => {
    const modules = buildLifeQuestSkillTree(
      buildInput({
        progress: {
          ...emptyInput.progress,
          sectors: [
            sector('body', 148),
            sector('money', -20),
            sector('focus', 61),
            sector('stability', 110),
            sector('energy', 90),
          ],
        },
        body: {
          ...emptyInput.body,
          today: {
            ...emptyInput.body.today,
            waterLiters: 1,
          },
        },
        money: {
          ...emptyInput.money,
          trackingStartDate: '2026-07-01',
          accounts: [account()],
        },
        today: {
          ...emptyInput.today,
          route: {
            ...emptyInput.today.route,
            mainQuest: routeQuest(),
          },
        },
      }),
    )

    expect(moduleById(modules, 'body').progressPercent).toBe(100)
    expect(moduleById(modules, 'money').progressPercent).toBe(0)
    expect(moduleById(modules, 'recovery').progressPercent).toBe(100)
  })

  it('body module reacts to body check-in and water', () => {
    const modules = buildLifeQuestSkillTree(
      buildInput({
        body: {
          today: {
            ...emptyInput.body.today,
            waterLiters: 1,
            steps: 1200,
          },
          dailyLogs: [{ date: '2026-07-19', waterLiters: 1, steps: 1200, workoutDone: false }],
        },
      }),
    )
    const body = moduleById(modules, 'body')

    expect(body.state).not.toBe('locked')
    expect(body.nextSignal).toBe('Обновить чек-ин тела')
  })

  it('money module reacts to baseline and import without private details', () => {
    const modules = buildLifeQuestSkillTree(
      buildInput({
        money: {
          ...emptyInput.money,
          trackingStartDate: '2026-07-01',
          lastImportAt: '2026-07-20T10:00:00.000Z',
          accounts: [account({ last4: '1234' })],
          transactions: [transaction()],
        },
        milestones: [
          milestone({
            id: 'money_first_import',
            type: 'money_first_import',
            domain: 'money',
            title: 'Первый импорт операций принят',
          }),
        ],
      }),
    )
    const money = moduleById(modules, 'money')
    const output = JSON.stringify(money)

    expect(money.relatedMilestoneCount).toBe(1)
    expect(money.nextSignal).toContain('Обновить импорт')
    expect(output).not.toContain('Аптека')
    expect(output).not.toContain('1234')
    expect(output).not.toContain('приватная')
    expect(output).not.toContain('raw private')
  })

  it('suggestions do not include private money details', () => {
    const money = moduleById(
      buildLifeQuestSkillTree(
        buildInput({
          money: {
            ...emptyInput.money,
            trackingStartDate: '2026-07-01',
            accounts: [account({ last4: '1234' })],
            transactions: [transaction()],
            importWarnings: ['Есть денежный сигнал без raw details.'],
          },
        }),
      ),
      'money',
    )
    const output = JSON.stringify(money.suggestion)

    expect(output).not.toContain('Аптека')
    expect(output).not.toContain('1234')
    expect(output).not.toContain('приватная')
    expect(output).not.toContain('raw private')
  })

  it('focus module links to daily quest with safe fallback title', () => {
    const modules = buildLifeQuestSkillTree(
      buildInput({
        today: {
          ...emptyInput.today,
          dailyQuest: privateFocusQuest(),
          route: {
            ...emptyInput.today.route,
            mainQuest: routeQuest(),
          },
        },
      }),
    )
    const focus = moduleById(modules, 'focus')

    expect(focus.linkedQuest).toMatchObject({
      title: 'Закрыть один быстрый шаг',
      status: 'waiting',
    })
    expect(JSON.stringify(focus)).not.toContain('Позвонить врачу')
  })

  it('recovery module does not shame low energy', () => {
    const modules = buildLifeQuestSkillTree(
      buildInput({
        today: {
          ...emptyInput.today,
          currentMode: 'low',
        },
      }),
    )
    const recovery = moduleById(modules, 'recovery')
    const copy = JSON.stringify(recovery).toLowerCase()

    expect(recovery.state).not.toBe('locked')
    expect(copy).not.toMatch(/провал|стыд|штраф|виноват|серия потер/)
    expect(copy).toContain('снизить нагрузку')
    expect(recovery.suggestion?.caption.toLowerCase()).not.toMatch(/провал|стыд|штраф|виноват|серия потер/)
  })

  it('system module reacts to backup and onboarding', () => {
    const modules = buildLifeQuestSkillTree(
      buildInput({
        settings: {
          onboarding: {
            completed: true,
            skipped: false,
          },
          lastBackupAt: '2026-07-20T10:00:00.000Z',
          userName: 'Оператор',
          userRole: 'Система',
        },
      }),
    )
    const system = moduleById(modules, 'system')

    expect(system.state).not.toBe('locked')
    expect(system.nextSignal).toBe('Уточнить профиль системы')
  })

  it('companion module reacts to customization and evolution', () => {
    const modules = buildLifeQuestSkillTree(
      buildInput({
        companion: {
          ...emptyInput.companion,
          evolutionLevel: 8,
          activeMessage: 'Сигнал принят.',
          customization: {
            displayName: 'NOVA',
            accent: 'violet',
            shell: 'deepSpace',
          },
        },
        milestones: [
          milestone({
            id: 'core_customized',
            type: 'core_customized',
            domain: 'companion',
            title: 'Core персонализирован',
          }),
        ],
      }),
    )
    const companion = moduleById(modules, 'companion')

    expect(companion.state).not.toBe('locked')
    expect(companion.relatedMilestoneCount).toBe(1)
    expect(companion.nextSignal).toContain('устойчивые сигналы')
  })

  it('groups milestone counts by module domain', () => {
    const modules = buildLifeQuestSkillTree(
      buildInput({
        milestones: [
          milestone({ id: 'body_first_signal', type: 'body_first_signal', domain: 'body', title: 'Первый сигнал тела' }),
          milestone({ id: 'daily_quest_completed', type: 'daily_quest_completed', domain: 'focus', title: 'Первый квест дня выполнен' }),
          milestone({ id: 'backup_created', type: 'backup_created', domain: 'system', title: 'Первая резервная копия создана' }),
          milestone({ id: 'core_customized', type: 'core_customized', domain: 'companion', title: 'Core персонализирован' }),
        ],
      }),
    )

    expect(moduleById(modules, 'body').relatedMilestoneCount).toBe(1)
    expect(moduleById(modules, 'focus').relatedMilestoneCount).toBe(1)
    expect(moduleById(modules, 'system').relatedMilestoneCount).toBe(1)
    expect(moduleById(modules, 'companion').relatedMilestoneCount).toBe(1)
  })

  it('does not require API/backend and avoids shame/fear/streak copy', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const modules = buildLifeQuestSkillTree(emptyInput)
    const copy = JSON.stringify(modules).toLowerCase()

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(copy).not.toMatch(/серия потер|провал|стыд|штраф|наказ|виноват|leaderboard|streak/)

    fetchSpy.mockRestore()
  })
})
