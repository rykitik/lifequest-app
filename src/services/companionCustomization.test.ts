import { describe, expect, it, vi } from 'vitest'

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
  vi.stubGlobal('localStorage', new MemoryStorage())
}

async function importCompanionCustomization() {
  vi.resetModules()
  installStorage()

  const service = await import('@/services/companionCustomization')
  const companion = await import('@/stores/useCompanionStore')
  const feedback = await import('@/stores/useFeedbackStore')

  return { companion, feedback, service }
}

describe('saveCompanionCustomization', () => {
  it('updates companion customization in local-first store', async () => {
    const { companion, service } = await importCompanionCustomization()

    const saved = service.saveCompanionCustomization({
      displayName: '  NOVA  ',
      accent: 'violet',
      shell: 'deepSpace',
    })

    expect(saved).toMatchObject({
      displayName: 'NOVA',
      accent: 'violet',
      shell: 'deepSpace',
    })
    expect(companion.useCompanionStore.getState().customization).toMatchObject(saved)
  })

  it('triggers feedback and companion reaction once per save', async () => {
    const { companion, feedback, service } = await importCompanionCustomization()

    service.saveCompanionCustomization({
      displayName: 'Aegis',
      accent: 'emerald',
      shell: 'calmSignal',
    })

    expect(companion.useCompanionStore.getState().activeMessage).toBe('Конфигурация принята.')
    expect(companion.useCompanionStore.getState().reaction).toMatchObject({
      id: 1,
      message: 'Конфигурация принята.',
    })
    expect(feedback.useFeedbackStore.getState().rewardToast).toMatchObject({
      type: 'system',
      message: 'Core обновлён.',
      signal: 'Конфигурация принята.',
    })
  })

  it('does not call API when saving customization', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const { service } = await importCompanionCustomization()

    service.saveCompanionCustomization({
      displayName: 'Core',
      accent: 'ice',
      shell: 'system',
    })

    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})
