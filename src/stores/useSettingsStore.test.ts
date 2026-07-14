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

async function importSettingsStore() {
  vi.resetModules()
  installStorage()

  return import('@/stores/useSettingsStore')
}

describe('useSettingsStore profile baseline', () => {
  it('сохраняет рост, цель и активность профиля', async () => {
    const { useSettingsStore } = await importSettingsStore()

    useSettingsStore.getState().updateProfile({
      heightCm: 182,
      bodyGoal: 'weight_loss',
      targetWeightKg: 78,
      targetPace: 'calm',
      activityLevel: 'medium',
      bodyLimitations: 'Беречь колени.',
    })

    expect(useSettingsStore.getState()).toMatchObject({
      heightCm: 182,
      bodyGoal: 'weight_loss',
      targetWeightKg: 78,
      targetPace: 'calm',
      activityLevel: 'medium',
      bodyLimitations: 'Беречь колени.',
    })
  })

  it('старый persisted settings state без body-полей мигрирует мягко', async () => {
    vi.resetModules()
    installStorage()
    localStorage.setItem(
      'lifequest-settings',
      JSON.stringify({
        state: {
          userName: 'Иван',
          userRole: 'Оператор',
          preferredTone: 'calm',
          lastBackupExportAt: null,
        },
        version: 4,
      }),
    )

    const { useSettingsStore } = await import('@/stores/useSettingsStore')

    expect(typeof useSettingsStore.getState().userName).toBe('string')
    expect(useSettingsStore.getState().heightCm).toBeUndefined()
    expect(useSettingsStore.getState().bodyGoal).toBe('not_set')
  })
})
