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

function installLocalFirstBrowser() {
  const storage = new MemoryStorage()

  Object.defineProperty(globalThis, 'window', {
    value: {
      ...globalThis,
      location: {
        hostname: 'ry-kit.ru',
        origin: 'https://ry-kit.ru',
      },
      localStorage: storage,
      open: vi.fn(),
    },
    configurable: true,
  })
  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
    configurable: true,
  })
  Object.defineProperty(globalThis, 'navigator', {
    value: {
      onLine: true,
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    },
    configurable: true,
  })
}

async function importLocalStores() {
  vi.resetModules()
  vi.stubEnv('VITE_AUTH_ENABLED', 'false')
  vi.stubEnv('VITE_API_URL', '')
  installLocalFirstBrowser()

  return {
    ...(await import('@/stores/useTodayStore')),
    ...(await import('@/stores/useBodyStore')),
    ...(await import('@/stores/useMoneyStore')),
    ...(await import('@/stores/usePromptCenterStore')),
    ...(await import('@/stores/useWeeklyReviewStore')),
    ...(await import('@/stores/useSyncStore')),
    ...(await import('@/stores/useSettingsStore')),
  }
}

describe('local-first feature stores', () => {
  it('keeps Today, Body, Money, Prompt Center and Weekly Review usable without backend env', async () => {
    const {
      useTodayStore,
      useBodyStore,
      useMoneyStore,
      usePromptCenterStore,
      useWeeklyReviewStore,
      useSyncStore,
      useSettingsStore,
    } = await importLocalStores()

    useTodayStore.getState().setMode('low')
    useTodayStore.getState().completeRouteItem('quickWin')
    useBodyStore.getState().saveCheckin({ waterLiters: 1.2, steps: 2500 })
    const moneyResult = useMoneyStore.getState().setupMoneyBaseline({
      trackingStartDate: '2026-07-17',
      accounts: [
        {
          name: 'Карта',
          type: 'debit_card',
          openingBalance: 1000,
        },
      ],
    })
    usePromptCenterStore.getState().generatePrompt()
    usePromptCenterStore.getState().openChatGPT()
    useWeeklyReviewStore.getState().saveWeeklyReviewSummary({
      periodStart: '2026-07-13',
      periodEnd: '2026-07-19',
      weekStart: '2026-07-13',
      weekEnd: '2026-07-19',
      summary: 'Неделя сохранена локально.',
      coreMessage: 'Держим спокойный темп.',
      bodyFocus: 'Вода и шаги.',
      moneyFocus: 'Без резких решений.',
      risk: 'Перегруз.',
      suggestedActionsCount: 0,
      appliedActionsCount: 0,
      suggestedActions: [],
    })
    useSyncStore.getState().bootstrapLocalSync()
    useSettingsStore.getState().updateProfile({ userName: 'Иван' })

    expect(moneyResult.ok).toBe(true)
    expect(useTodayStore.getState().currentMode).toBe('low')
    expect(useBodyStore.getState().today.waterLiters).toBe(1.2)
    expect(useMoneyStore.getState().accounts).toHaveLength(1)
    expect(usePromptCenterStore.getState().generatedPrompt).toContain('LifeQuest')
    expect(window.open).toHaveBeenCalledWith('https://chatgpt.com', '_blank', 'noopener,noreferrer')
    expect(useWeeklyReviewStore.getState().summaries).toHaveLength(1)
    expect(useSyncStore.getState().status).toBe('local_only')
    expect(useSettingsStore.getState().userName).toBe('Иван')
  })

  it('sync bootstrap stays local and does not call sync API when auth is disabled', async () => {
    const bootstrapSync = vi.fn()
    const normalizeApiError = vi.fn()

    vi.resetModules()
    vi.stubEnv('VITE_AUTH_ENABLED', 'false')
    vi.stubEnv('VITE_API_URL', '')
    installLocalFirstBrowser()
    vi.doMock('@/services/syncApi', () => ({
      bootstrapSync,
    }))
    vi.doMock('@/services/httpClientContract', () => ({
      normalizeApiError,
    }))

    const { useSyncStore } = await import('@/stores/useSyncStore')
    const result = await useSyncStore.getState().bootstrapAccountSync()

    expect(result.success).toBe(false)
    expect(result.message).toContain('Аккаунты пока выключены')
    expect(useSyncStore.getState().status).toBe('local_only')
    expect(bootstrapSync).not.toHaveBeenCalled()
    expect(normalizeApiError).not.toHaveBeenCalled()
  })
})
