import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PromptCard } from '@/shared/types'

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

describe('buildPrompt weekly_review', () => {
  beforeEach(() => {
    vi.resetModules()
    installStorage()
  })

  it('генерирует недельный prompt с body+money context, ограничениями и JSON-контрактом', async () => {
    const { buildPrompt } = await import('@/services/promptBuilder')
    const card: PromptCard = {
      id: 'weekly-review',
      title: 'Недельный разбор',
      description: 'Найти закономерности по телу, деньгам, фокусу и восстановлению.',
      promptHint: 'Разбери неделю спокойно.',
      preferredFormat: 'Коротко и по делу',
    }

    const prompt = buildPrompt(card, {
      userRequest: 'Хочу понять, что влияло на тело и траты.',
      preferredResponseFormat: 'Короткий недельный разбор',
    })

    expect(prompt).toContain('LifeQuest Core Operator')
    expect(prompt).toContain('"bodySummary"')
    expect(prompt).toContain('"moneySummary"')
    expect(prompt).toContain('закономерности')
    expect(prompt).toContain('деньги')
    expect(prompt).toContain('не выдумывать факты')
    expect(prompt).toContain('"lifequest"')
    expect(prompt).toContain('"bodyFocus"')
    expect(prompt).toContain('"moneyFocus"')
    expect(prompt).toContain('"risk"')
  })
})
