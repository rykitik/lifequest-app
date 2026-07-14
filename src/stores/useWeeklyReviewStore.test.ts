import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BodySnapshot, LifeQuestPromptResponse } from '@/shared/types'

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

function validWeeklyReviewResponse(): LifeQuestPromptResponse {
  return {
    summary: 'Неделя держится на маленьких фактах.',
    todayMainQuest: 'Удержать главный блок',
    quickWin: 'Записать воду утром',
    recoveryAction: 'Вода и короткая прогулка',
    bodyFocus: 'Собрать 3 дня данных по телу.',
    moneyFocus: 'Один денежный чек.',
    risk: 'Раздуть план вместо мягкого ритма.',
    coreMessage: 'Система спокойна. Сначала факты, потом усиление.',
    suggestedActions: [
      { title: 'Записать вес и воду', domain: 'body', difficulty: 'easy', xp: 10 },
      { title: 'Выбрать фокус недели', domain: 'today', difficulty: 'medium', xp: 12 },
      { title: 'Подготовить запасной план', domain: 'rescue', difficulty: 'easy', xp: 8 },
    ],
  }
}

async function importWeeklyStore() {
  vi.resetModules()
  installStorage()

  return import('@/stores/useWeeklyReviewStore')
}

async function importPromptFlowStores() {
  vi.resetModules()
  installStorage()

  const weekly = await import('@/stores/useWeeklyReviewStore')
  const prompt = await import('@/stores/usePromptCenterStore')
  const quests = await import('@/stores/useQuestStore')

  return { weekly, prompt, quests }
}

describe('useWeeklyReviewStore', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  it('сохраняет подтверждённый weekly summary локально', async () => {
    const { useWeeklyReviewStore } = await importWeeklyStore()

    const result = useWeeklyReviewStore.getState().saveWeeklyReviewSummary({
      periodStart: '2026-07-06',
      periodEnd: '2026-07-12',
      dataQuality: 'medium',
      summary: 'Неделя держится на маленьких фактах.',
      coreMessage: 'Ядро спокойно.',
      bodyFocus: 'Вода и шаги.',
      moneyFocus: 'Один денежный чек.',
      risk: 'Перегрузить план.',
      suggestedActionsCount: 3,
      appliedActionsCount: 1,
      suggestedActions: validWeeklyReviewResponse().suggestedActions,
    })

    expect(result.ok).toBe(true)
    expect(useWeeklyReviewStore.getState().summaries).toHaveLength(1)
    expect(useWeeklyReviewStore.getState().summaries[0]).toMatchObject({
      periodStart: '2026-07-06',
      periodEnd: '2026-07-12',
      weekStart: '2026-07-06',
      weekEnd: '2026-07-12',
      dataQuality: 'medium',
      summary: 'Неделя держится на маленьких фактах.',
      moneyFocus: 'Один денежный чек.',
      suggestedActionsCount: 3,
      appliedActionsCount: 1,
      source: 'weekly_review',
    })
  })

  it('не сохраняет итог, если пользователь отказался', async () => {
    const { prompt, weekly } = await importPromptFlowStores()

    prompt.usePromptCenterStore.setState({
      selectedCardId: 'weekly-review',
      parsedResponse: validWeeklyReviewResponse(),
      selectedSuggestedActionIndexes: [0],
      shouldApplyCoreMessage: false,
    })

    prompt.usePromptCenterStore.getState().applyParsedResponse()
    prompt.usePromptCenterStore.getState().dismissPendingWeeklyReviewSummary()

    expect(weekly.useWeeklyReviewStore.getState().summaries).toHaveLength(0)
    expect(prompt.usePromptCenterStore.getState().pendingWeeklyReviewSummary).toBeNull()
  })

  it('сохранение итога не применяет задачи повторно', async () => {
    const { prompt, weekly, quests } = await importPromptFlowStores()
    const inboxBeforeApply = quests.useQuestStore.getState().inbox.length

    prompt.usePromptCenterStore.setState({
      selectedCardId: 'weekly-review',
      parsedResponse: validWeeklyReviewResponse(),
      selectedSuggestedActionIndexes: [0, 2],
      shouldApplyCoreMessage: false,
    })

    prompt.usePromptCenterStore.getState().applyParsedResponse()
    const inboxAfterApply = quests.useQuestStore.getState().inbox.length

    prompt.usePromptCenterStore.getState().savePendingWeeklyReviewSummary()

    expect(inboxAfterApply).toBe(inboxBeforeApply + 2)
    expect(quests.useQuestStore.getState().inbox).toHaveLength(inboxAfterApply)
    expect(weekly.useWeeklyReviewStore.getState().summaries[0]).toMatchObject({
      moneyFocus: validWeeklyReviewResponse().moneyFocus,
      suggestedActionsCount: 3,
      appliedActionsCount: 2,
    })
    expect(weekly.useWeeklyReviewStore.getState().summaries[0]!.suggestedActions).toHaveLength(2)
  })

  it('повторное сохранение той же недели не оставляет активную pending-панель', async () => {
    const { prompt, weekly } = await importPromptFlowStores()

    prompt.usePromptCenterStore.setState({
      selectedCardId: 'weekly-review',
      parsedResponse: validWeeklyReviewResponse(),
      selectedSuggestedActionIndexes: [0],
      shouldApplyCoreMessage: false,
    })

    prompt.usePromptCenterStore.getState().applyParsedResponse()
    prompt.usePromptCenterStore.getState().savePendingWeeklyReviewSummary()

    prompt.usePromptCenterStore.setState({
      selectedCardId: 'weekly-review',
      parsedResponse: validWeeklyReviewResponse(),
      selectedSuggestedActionIndexes: [0],
      shouldApplyCoreMessage: false,
    })

    prompt.usePromptCenterStore.getState().applyParsedResponse()
    prompt.usePromptCenterStore.getState().savePendingWeeklyReviewSummary()

    expect(weekly.useWeeklyReviewStore.getState().summaries).toHaveLength(1)
    expect(prompt.usePromptCenterStore.getState().pendingWeeklyReviewSummary).toBeNull()
    expect(prompt.usePromptCenterStore.getState().weeklyReviewSaveMessage).toBe(
      'Этот недельный итог уже сохранён.',
    )
  })

  it('защищает от дубликата одного и того же weekly summary', async () => {
    const { useWeeklyReviewStore } = await importWeeklyStore()
    const input = {
      periodStart: '2026-07-06',
      periodEnd: '2026-07-12',
      coreMessage: 'Один и тот же сигнал.',
      bodyFocus: 'Один и тот же фокус.',
      risk: 'Один и тот же риск.',
      suggestedActions: validWeeklyReviewResponse().suggestedActions.slice(0, 1),
    }

    expect(useWeeklyReviewStore.getState().saveWeeklyReviewSummary(input).ok).toBe(true)
    const duplicateResult = useWeeklyReviewStore.getState().saveWeeklyReviewSummary(input)

    expect(duplicateResult.ok).toBe(false)
    expect(duplicateResult.duplicate).toBe(true)
    expect(useWeeklyReviewStore.getState().summaries).toHaveLength(1)
  })

  it('считает дубликатом одинаковые suggestedActions в другом порядке', async () => {
    const { useWeeklyReviewStore } = await importWeeklyStore()
    const actions = validWeeklyReviewResponse().suggestedActions
    const input = {
      periodStart: '2026-07-06',
      periodEnd: '2026-07-12',
      coreMessage: '  Один   и тот же сигнал. ',
      bodyFocus: 'Один и тот же фокус.',
      risk: 'Один и тот же риск.',
      suggestedActions: actions,
    }

    expect(useWeeklyReviewStore.getState().saveWeeklyReviewSummary(input).ok).toBe(true)
    const duplicateResult = useWeeklyReviewStore.getState().saveWeeklyReviewSummary({
      ...input,
      coreMessage: 'Один и тот же сигнал.',
      suggestedActions: [...actions].reverse(),
    })

    expect(duplicateResult.ok).toBe(false)
    expect(useWeeklyReviewStore.getState().summaries).toHaveLength(1)
  })

  it('не создаёт второй итог для той же недели даже с другим текстом', async () => {
    const { useWeeklyReviewStore } = await importWeeklyStore()

    expect(useWeeklyReviewStore.getState().saveWeeklyReviewSummary({
      periodStart: '2026-07-06',
      periodEnd: '2026-07-12',
      summary: 'Первый вывод недели.',
      coreMessage: 'Первое сообщение.',
    }).ok).toBe(true)

    const duplicateResult = useWeeklyReviewStore.getState().saveWeeklyReviewSummary({
      periodStart: '2026-07-06',
      periodEnd: '2026-07-12',
      summary: 'Другой вывод той же недели.',
      coreMessage: 'Другое сообщение.',
      moneyFocus: 'Другой фокус.',
    })

    expect(duplicateResult.ok).toBe(false)
    expect(duplicateResult.duplicate).toBe(true)
    expect(useWeeklyReviewStore.getState().summaries).toHaveLength(1)
  })

  it('хранит максимум 12 последних итогов', async () => {
    vi.useFakeTimers()
    const { useWeeklyReviewStore } = await importWeeklyStore()

    for (let index = 0; index < 13; index += 1) {
      vi.setSystemTime(new Date(`2026-07-${String(index + 1).padStart(2, '0')}T10:00:00.000Z`))
      useWeeklyReviewStore.getState().saveWeeklyReviewSummary({
        periodStart: `2026-07-${String(index + 1).padStart(2, '0')}`,
        periodEnd: `2026-07-${String(index + 1).padStart(2, '0')}`,
        coreMessage: `Итог ${index}`,
        bodyFocus: 'База тела.',
        risk: 'Перегруз.',
        suggestedActions: [],
      })
    }

    const summaries = useWeeklyReviewStore.getState().summaries

    expect(summaries).toHaveLength(12)
    expect(summaries.some((summary) => summary.coreMessage === 'Итог 0')).toBe(false)
    expect(summaries[0]!.coreMessage).toBe('Итог 12')
  })

  it('показывает самым первым самый новый итог по createdAt', async () => {
    vi.useFakeTimers()
    const { useWeeklyReviewStore } = await importWeeklyStore()

    vi.setSystemTime(new Date('2026-07-10T10:00:00.000Z'))
    useWeeklyReviewStore.getState().saveWeeklyReviewSummary({
      periodStart: '2026-07-01',
      periodEnd: '2026-07-07',
      coreMessage: 'Старый итог.',
    })

    vi.setSystemTime(new Date('2026-07-12T10:00:00.000Z'))
    useWeeklyReviewStore.getState().saveWeeklyReviewSummary({
      periodStart: '2026-07-08',
      periodEnd: '2026-07-12',
      coreMessage: 'Новый итог.',
    })

    expect(useWeeklyReviewStore.getState().summaries[0]!.coreMessage).toBe('Новый итог.')
  })

  it('удаляет сохранённый итог', async () => {
    const { useWeeklyReviewStore } = await importWeeklyStore()
    const result = useWeeklyReviewStore.getState().saveWeeklyReviewSummary({
      periodStart: '2026-07-06',
      periodEnd: '2026-07-12',
      coreMessage: 'Удаляемый итог.',
      bodyFocus: 'Вода.',
      risk: 'Шум.',
      suggestedActions: [],
    })

    expect(useWeeklyReviewStore.getState().deleteWeeklyReviewSummary(result.summary.id)).toBe(true)
    expect(useWeeklyReviewStore.getState().summaries).toHaveLength(0)
  })

  it('не падает на повреждённом localStorage', async () => {
    vi.resetModules()
    installStorage()
    localStorage.setItem('lifequest-weekly-reviews', '{broken')

    const { useWeeklyReviewStore } = await import('@/stores/useWeeklyReviewStore')

    expect(useWeeklyReviewStore.getState().summaries).toEqual([])
  })

  it('не сохраняет приватные хвосты выписок и полные номера в weekly record', async () => {
    const { useWeeklyReviewStore } = await importWeeklyStore()

    useWeeklyReviewStore.getState().saveWeeklyReviewSummary({
      periodStart: '2026-07-06',
      periodEnd: '2026-07-12',
      summary: 'PDF statement text rawDescription 40817810099910004312',
      bodyFocus: 'Тело спокойно.',
      moneyFocus: 'Счёт 40817810099910004312 проверен.',
      rawTextNote: 'rawDescription PDF statement text 40817810099910004312',
    })

    const serialized = JSON.stringify(useWeeklyReviewStore.getState().summaries[0])

    expect(serialized).not.toContain('rawDescription')
    expect(serialized).not.toContain('PDF')
    expect(serialized).not.toContain('statement text')
    expect(serialized).not.toContain('40817810099910004312')
    expect(serialized).toContain('[номер скрыт]')
  })

  it('фильтрует persisted-записи неправильной структуры', async () => {
    vi.resetModules()
    installStorage()
    localStorage.setItem(
      'lifequest-weekly-reviews',
      JSON.stringify({
        state: {
          summaries: [
            { id: 'broken', createdAt: 'не дата', source: 'weekly_review' },
            {
              id: 'ok',
              createdAt: '2026-07-12T10:00:00.000Z',
              periodStart: '2026-07-06',
              periodEnd: '2026-07-12',
              coreMessage: 'Сохранить.',
              source: 'weekly_review',
            },
          ],
        },
        version: 1,
      }),
    )

    const { useWeeklyReviewStore } = await import('@/stores/useWeeklyReviewStore')

    expect(useWeeklyReviewStore.getState().summaries).toHaveLength(1)
    expect(useWeeklyReviewStore.getState().summaries[0]!.id).toBe('ok')
    expect(useWeeklyReviewStore.getState().summaries[0]).toMatchObject({
      summary: 'Сохранить.',
      weekStart: '2026-07-06',
      weekEnd: '2026-07-12',
      suggestedActionsCount: 0,
      appliedActionsCount: 0,
    })
  })

  it('старый persisted state Prompt Center мягко мигрирует после добавления истории', async () => {
    vi.resetModules()
    installStorage()
    localStorage.setItem(
      'lifequest-prompt-center',
      JSON.stringify({
        state: {
          selectedCard: { id: 'weekly-review' },
          userRequest: 'Разбери неделю.',
          preferredResponseFormat: 'Коротко.',
        },
        version: 1,
      }),
    )

    const { usePromptCenterStore } = await import('@/stores/usePromptCenterStore')

    expect(typeof usePromptCenterStore.getState().selectedCardId).toBe('string')
    expect(usePromptCenterStore.getState().pendingWeeklyReviewSummary).toBeNull()
  })

  it('parseImportedResponse разбирает длинный текст, если в конце есть lifequest JSON', async () => {
    const { prompt } = await importPromptFlowStores()

    prompt.usePromptCenterStore.setState({
      importedResponseText: `${'Длинный спокойный разбор недели. '.repeat(4_000)}${JSON.stringify({
        lifequest: validWeeklyReviewResponse(),
      })}`,
      parseError: null,
      parsedResponse: null,
    })

    prompt.usePromptCenterStore.getState().parseImportedResponse()

    expect(prompt.usePromptCenterStore.getState().parseError).toBeNull()
    expect(prompt.usePromptCenterStore.getState().parsedResponse?.summary).toBe(
      validWeeklyReviewResponse().summary,
    )
  })

  it('parseImportedResponse на длинном тексте без JSON выставляет мягкую ошибку', async () => {
    const { prompt } = await importPromptFlowStores()

    prompt.usePromptCenterStore.setState({
      importedResponseText: 'x'.repeat(120_000),
      parseError: null,
      parsedResponse: null,
    })

    prompt.usePromptCenterStore.getState().parseImportedResponse()

    expect(prompt.usePromptCenterStore.getState().parsedResponse).toBeNull()
    expect(prompt.usePromptCenterStore.getState().parseError).toContain('JSON-блок lifequest')
  })

  it('мягко нормализует отсутствующие optional-поля', async () => {
    const { useWeeklyReviewStore } = await importWeeklyStore()

    const result = useWeeklyReviewStore.getState().saveWeeklyReviewSummary({
      periodStart: '2026-07-06',
      periodEnd: '2026-07-12',
    })

    expect(result.ok).toBe(true)
    expect(result.summary).toMatchObject({
      summary: 'Недельный итог сохранён.',
      coreMessage: '',
      bodyFocus: '',
      moneyFocus: '',
      risk: '',
      suggestedActionsCount: 0,
      appliedActionsCount: 0,
      suggestedActions: [],
    })
  })

  it('очищает pending weekly summary при закрытии Prompt Center', async () => {
    const { prompt } = await importPromptFlowStores()

    prompt.usePromptCenterStore.setState({
      isOpen: true,
      selectedCardId: 'weekly-review',
      parsedResponse: validWeeklyReviewResponse(),
      selectedSuggestedActionIndexes: [0],
      shouldApplyCoreMessage: false,
    })

    prompt.usePromptCenterStore.getState().applyParsedResponse()
    expect(prompt.usePromptCenterStore.getState().pendingWeeklyReviewSummary).not.toBeNull()

    prompt.usePromptCenterStore.getState().closePromptCenter()

    expect(prompt.usePromptCenterStore.getState().pendingWeeklyReviewSummary).toBeNull()
  })

  it('очищает pending weekly summary при смене prompt', async () => {
    const { prompt } = await importPromptFlowStores()

    prompt.usePromptCenterStore.setState({
      selectedCardId: 'weekly-review',
      parsedResponse: validWeeklyReviewResponse(),
      selectedSuggestedActionIndexes: [0],
      shouldApplyCoreMessage: false,
    })

    prompt.usePromptCenterStore.getState().applyParsedResponse()
    expect(prompt.usePromptCenterStore.getState().pendingWeeklyReviewSummary).not.toBeNull()

    prompt.usePromptCenterStore.getState().setSelectedCard('plan-day')

    expect(prompt.usePromptCenterStore.getState().pendingWeeklyReviewSummary).toBeNull()
  })
})

describe('buildWeeklyReviewContext', () => {
  it('не учитывает сегодняшний body log дважды и считает nutrition flags предсказуемо', async () => {
    vi.resetModules()
    installStorage()
    const { useBodyStore } = await import('@/stores/useBodyStore')
    const { buildWeeklyReviewContext } = await import('@/services/contextBuilder')
    const today: BodySnapshot = {
      date: '2026-07-12',
      weightKg: 82,
      weightTrendKg: 0,
      waterLiters: 2,
      steps: 7000,
      workout: 'Не выбрано',
      workoutDone: false,
      foodDiscipline: 0,
      nutritionStatus: 'Сладкое',
      movementType: 'Без тренировки',
      quickAction: '',
    }

    useBodyStore.setState({
      today,
      history: [83, 82],
      dailyLogs: [
        {
          date: '2026-07-12',
          weightKg: 83,
          waterLiters: 1,
          steps: 2000,
          workoutDone: true,
          nutritionStatus: 'Переел',
          movementType: 'Прогулка',
        },
        {
          date: '2026-07-11',
          weightKg: 82.5,
          waterLiters: 1.5,
          steps: 5000,
          workoutDone: false,
          nutritionStatus: 'Переел',
          movementType: 'Без тренировки',
        },
      ],
    })

    const context = buildWeeklyReviewContext()
    const todayLogs = context.body.dailyLogs.filter((log) => log.date === '2026-07-12')

    expect(todayLogs).toHaveLength(1)
    expect(todayLogs[0]!.nutritionStatus).toBe('Сладкое')
    expect(context.body.summary.nutritionFlagsCount).toMatchObject({
      Переел: 1,
      Сладкое: 1,
    })
  })

  it('отдаёт максимум 7 уникальных body logs в хронологическом порядке', async () => {
    vi.resetModules()
    installStorage()
    const { useBodyStore } = await import('@/stores/useBodyStore')
    const { buildWeeklyReviewContext } = await import('@/services/contextBuilder')

    useBodyStore.setState((state) => ({
      today: {
        ...state.today,
        date: '2026-07-10',
        weightKg: 82,
      },
      dailyLogs: Array.from({ length: 10 }, (_, index) => ({
        date: `2026-07-${String(index + 1).padStart(2, '0')}`,
        weightKg: 90 - index,
        waterLiters: 0,
        steps: 0,
        workoutDone: false,
        nutritionStatus: 'Не выбрано',
        movementType: 'Не выбрано',
      })),
    }))

    const logs = buildWeeklyReviewContext().body.dailyLogs

    expect(logs).toHaveLength(7)
    expect(logs.map((log) => log.date)).toEqual([
      '2026-07-04',
      '2026-07-05',
      '2026-07-06',
      '2026-07-07',
      '2026-07-08',
      '2026-07-09',
      '2026-07-10',
    ])
  })

  it('не возвращает NaN в averages и weightDelta при пустых числовых данных', async () => {
    vi.resetModules()
    installStorage()
    const { useBodyStore } = await import('@/stores/useBodyStore')
    const { buildWeeklyReviewContext } = await import('@/services/contextBuilder')

    useBodyStore.setState((state) => ({
      today: {
        ...state.today,
        weightKg: Number.NaN,
        waterLiters: Number.NaN,
        steps: Number.NaN,
      },
      dailyLogs: [],
      history: [],
    }))

    const summary = buildWeeklyReviewContext().body.summary

    expect(summary.averageWaterLiters).toBeNull()
    expect(summary.averageSteps).toBeNull()
    expect(summary.weightDelta).toBeNull()
  })

  it('не считает weightDelta при одной валидной точке веса, но учитывает нули в averages', async () => {
    vi.resetModules()
    installStorage()
    const { useBodyStore } = await import('@/stores/useBodyStore')
    const { buildWeeklyReviewContext } = await import('@/services/contextBuilder')

    useBodyStore.setState((state) => ({
      today: {
        ...state.today,
        date: '2026-07-12',
        weightKg: 82,
        waterLiters: 0,
        steps: 0,
      },
      dailyLogs: [],
    }))

    const summary = buildWeeklyReviewContext().body.summary

    expect(summary.weightStart).toBe(82)
    expect(summary.weightEnd).toBe(82)
    expect(summary.weightDelta).toBeNull()
    expect(summary.averageWaterLiters).toBe(0)
    expect(summary.averageSteps).toBe(0)
  })
})
