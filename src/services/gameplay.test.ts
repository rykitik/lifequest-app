import { describe, expect, it, vi } from 'vitest'
import type { SectorKey } from '@/shared/types'
import moneyScreenSource from '@/features/money/screens/MoneyScreen.tsx?raw'
import textParserSource from '@/services/moneyImport/sberStatementParser.ts?raw'

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

async function importGameplay() {
  vi.resetModules()
  installStorage()

  const gameplay = await import('@/services/gameplay')
  const feedback = await import('@/stores/useFeedbackStore')
  const companion = await import('@/stores/useCompanionStore')
  const progress = await import('@/stores/useProgressStore')

  return { companion, feedback, gameplay, progress }
}

async function applyReward(input: {
  feedbackMessage: string
  sector: SectorKey
  sourceId: string
  xp: number
  recoveryXp?: number
}) {
  const { companion, feedback, gameplay, progress } = await importGameplay()

  const applied = gameplay.applyLifeQuestReward(
    {
      xp: input.xp,
      recoveryXp: input.recoveryXp,
      consistencyXp: 1,
      sector: input.sector,
      sourceId: input.sourceId,
    },
    'Системный сигнал обновлён.',
    input.feedbackMessage,
  )

  return {
    applied,
    companionState: companion.useCompanionStore.getState(),
    feedbackState: feedback.useFeedbackStore.getState(),
    progressState: progress.useProgressStore.getState(),
  }
}

describe('applyLifeQuestReward', () => {
  it('water action даёт progress feedback', async () => {
    const { applied, companionState, feedbackState, progressState } = await applyReward({
      xp: 5,
      sector: 'body',
      sourceId: 'water:test',
      feedbackMessage: 'Вода отмечена · +5 XP',
    })

    expect(applied).toBe(true)
    expect(progressState.dailySummary.xpToday).toBeGreaterThanOrEqual(5)
    expect(feedbackState.rewardToast).toMatchObject({
      xp: 5,
      sector: 'body',
      message: 'Вода отмечена · +5 XP',
    })
    expect(companionState.reaction?.message).toBe('Шаг принят.')
  })

  it('body check-in даёт progress feedback', async () => {
    const { feedbackState } = await applyReward({
      xp: 8,
      sector: 'body',
      sourceId: 'body-checkin:test',
      feedbackMessage: 'Чек-ин сохранён · Ядро получило сигнал',
    })

    expect(feedbackState.rewardToast).toMatchObject({
      sector: 'body',
      message: 'Чек-ин сохранён · Ядро получило сигнал',
    })
  })

  it('money import completed даёт спокойный financial feedback', async () => {
    const { companionState, feedbackState } = await applyReward({
      xp: 10,
      sector: 'money',
      sourceId: 'money:import:test',
      feedbackMessage: 'Операции учтены · финансовый сигнал обновлён',
    })

    expect(feedbackState.rewardToast).toMatchObject({
      sector: 'money',
      message: 'Операции учтены · финансовый сигнал обновлён',
      signal: 'Сигнал усилен.',
    })
    expect(companionState.reaction?.message).toBe('Сигнал усилен.')
  })

  it('money import completed помечает backup как recommended', async () => {
    const { gameplay } = await importGameplay()
    const settings = await import('@/stores/useSettingsStore')

    expect(gameplay.applyLifeQuestReward(
      { xp: 10, sector: 'money', sourceId: 'money:import:test' },
      'Операции учтены.',
      'Операции учтены · финансовый сигнал обновлён',
    )).toBe(true)
    await vi.waitFor(() => {
      expect(settings.useSettingsStore.getState().lastBackupReason).toBe('money_import_completed')
    })
  })

  it('weekly review saved даёт stability feedback', async () => {
    const { companionState, feedbackState } = await applyReward({
      xp: 14,
      recoveryXp: 4,
      sector: 'stability',
      sourceId: 'weekly-review:test',
      feedbackMessage: 'Недельный итог сохранён · риск недели зафиксирован',
    })

    expect(feedbackState.rewardToast).toMatchObject({
      sector: 'stability',
      recoveryXp: 4,
      message: 'Недельный итог сохранён · риск недели зафиксирован',
    })
    expect(companionState.reaction?.message).toBe('База стала стабильнее.')
  })

  it('weekly review saved помечает backup как recommended', async () => {
    const { gameplay } = await importGameplay()
    const settings = await import('@/stores/useSettingsStore')

    expect(gameplay.applyLifeQuestReward(
      { xp: 14, recoveryXp: 4, sector: 'stability', sourceId: 'weekly-review:test' },
      'Недельный итог сохранён.',
      'Недельный итог сохранён · риск недели зафиксирован',
    )).toBe(true)
    await vi.waitFor(() => {
      expect(settings.useSettingsStore.getState().lastBackupReason).toBe('weekly_review_saved')
    })
  })

  it('prompt actions applied даёт route feedback без приватного persist feedback-store', async () => {
    const { feedbackState } = await applyReward({
      xp: 12,
      sector: 'focus',
      sourceId: 'prompt-actions:test',
      feedbackMessage: 'Рекомендации применены · маршрут обновлён',
    })

    expect(feedbackState.rewardToast?.message).toBe('Рекомендации применены · маршрут обновлён')
    expect(localStorage.getItem('lifequest-feedback')).toBeNull()
  })

  it('повторный reward с тем же sourceId не дублирует XP и toast', async () => {
    const { feedback, gameplay, progress } = await importGameplay()

    expect(gameplay.applyLifeQuestReward(
      { xp: 5, sector: 'body', sourceId: 'same-water' },
      'Вода добавлена.',
      'Вода отмечена · +5 XP',
    )).toBe(true)
    const xpAfterFirstApply = progress.useProgressStore.getState().totalXp
    const firstToastId = feedback.useFeedbackStore.getState().rewardToast?.id

    expect(gameplay.applyLifeQuestReward(
      { xp: 5, sector: 'body', sourceId: 'same-water' },
      'Вода добавлена.',
      'Вода отмечена · +5 XP',
    )).toBe(false)
    expect(progress.useProgressStore.getState().totalXp).toBe(xpAfterFirstApply)
    expect(feedback.useFeedbackStore.getState().rewardToast?.id).toBe(firstToastId)
  })

  it('predefined feedback text не содержит shame-based сообщений', async () => {
    const { gameplay } = await importGameplay()
    const text = JSON.stringify({
      rewardFeedbackMessages: gameplay.rewardFeedbackMessages,
      companionProgressSignals: gameplay.companionProgressSignals,
    }).toLowerCase()

    expect(text).not.toMatch(/серия потер|провал|стыд|наказ|обязан|виноват/)
  })
})

describe('money import lazy loading', () => {
  it('pdfjs остаётся за dynamic import и не тянется текстовым parser path', () => {
    expect(moneyScreenSource).toContain("await import('@/services/moneyImport/sberPdfStatementParser')")
    expect(moneyScreenSource).not.toContain("from '@/services/moneyImport/sberPdfStatementParser'")
    expect(moneyScreenSource).not.toContain('pdfjs-dist')
    expect(textParserSource).not.toContain('pdfjs-dist')
  })
})
