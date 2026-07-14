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
  const storage = new MemoryStorage()

  Object.defineProperty(globalThis, 'window', {
    value: {
      ...globalThis,
      location: {
        hostname: 'localhost',
        origin: 'http://localhost',
      },
      localStorage: storage,
    },
    configurable: true,
  })
  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
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
    expect(useSettingsStore.getState().onboarding).toMatchObject({
      completed: false,
      skipped: false,
      currentStep: 'welcome',
    })
  })

  it('stores first-run onboarding lifecycle', async () => {
    const { useSettingsStore } = await importSettingsStore()

    expect(useSettingsStore.getState().onboarding.currentStep).toBe('welcome')

    useSettingsStore.getState().setOnboardingStep('body')
    expect(useSettingsStore.getState().onboarding).toMatchObject({
      completed: false,
      skipped: false,
      currentStep: 'body',
    })

    useSettingsStore.getState().skipOnboarding()
    expect(useSettingsStore.getState().onboarding.skipped).toBe(true)
    expect(useSettingsStore.getState().onboarding.completed).toBe(false)
    expect(useSettingsStore.getState().onboarding.skippedAt).toEqual(expect.any(String))

    useSettingsStore.getState().resetOnboarding()
    expect(useSettingsStore.getState().onboarding).toMatchObject({
      completed: false,
      skipped: false,
      currentStep: 'welcome',
    })

    useSettingsStore.getState().completeOnboarding()
    expect(useSettingsStore.getState().onboarding.completed).toBe(true)
    expect(useSettingsStore.getState().onboarding.skipped).toBe(false)
    expect(useSettingsStore.getState().onboarding.completedAt).toEqual(expect.any(String))
  })

  it('keeps onboarding step after store reload', async () => {
    vi.resetModules()
    installStorage()
    const { useSettingsStore } = await import('@/stores/useSettingsStore')

    useSettingsStore.getState().setOnboardingStep('money')
    vi.resetModules()

    const { useSettingsStore: reloadedSettingsStore } = await import('@/stores/useSettingsStore')

    expect(reloadedSettingsStore.getState().onboarding.currentStep).toBe('money')
  })

  it('recovers invalid persisted onboarding state safely', async () => {
    vi.resetModules()
    installStorage()
    localStorage.setItem(
      'lifequest-settings',
      JSON.stringify({
        state: {
          userName: 'Ivan',
          userRole: 'Operator',
          preferredTone: 'calm',
          onboarding: {
            completed: 'yes',
            skipped: 1,
            currentStep: 'unknown-step',
          },
        },
        version: 5,
      }),
    )

    const { useSettingsStore } = await import('@/stores/useSettingsStore')

    expect(useSettingsStore.getState().onboarding).toMatchObject({
      completed: false,
      skipped: false,
      currentStep: 'welcome',
    })
  })
})
