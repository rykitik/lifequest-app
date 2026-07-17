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

function installBrowserStorage() {
  const storage = new MemoryStorage()

  Object.defineProperty(globalThis, 'window', {
    value: {
      ...globalThis,
      location: {
        hostname: 'ry-kit.ru',
        origin: 'https://ry-kit.ru',
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

async function importAuthStoreWithMockedApi() {
  const refresh = vi.fn()
  const me = vi.fn()
  const login = vi.fn()
  const register = vi.fn()
  const logout = vi.fn()

  vi.resetModules()
  vi.doMock('@/services/authApi', () => ({
    refresh,
    me,
    login,
    register,
    logout,
  }))

  const module = await import('@/stores/useAuthStore')

  return {
    ...module,
    authApi: {
      refresh,
      me,
      login,
      register,
      logout,
    },
  }
}

describe('useAuthStore local-first runtime', () => {
  it('does not call auth API on bootstrap when auth is disabled and API URL is empty', async () => {
    installBrowserStorage()
    vi.stubEnv('VITE_AUTH_ENABLED', 'false')
    vi.stubEnv('VITE_API_URL', '')

    const { useAuthStore, authApi } = await importAuthStoreWithMockedApi()

    await useAuthStore.getState().bootstrap()

    expect(authApi.refresh).not.toHaveBeenCalled()
    expect(authApi.me).not.toHaveBeenCalled()
    expect(useAuthStore.getState()).toMatchObject({
      mode: 'local',
      status: 'local',
      isAuthenticated: false,
      accessToken: null,
    })
  })

  it('returns to local mode if old account state exists in a static PWA build', async () => {
    installBrowserStorage()
    vi.stubEnv('VITE_AUTH_ENABLED', 'false')
    localStorage.setItem(
      'lifequest-auth',
      JSON.stringify({
        state: {
          mode: 'account',
          user: {
            id: 'user-1',
            userId: 'user-1',
            email: 'user@example.com',
            name: 'Иван',
          },
        },
        version: 4,
      }),
    )

    const { useAuthStore, authApi } = await importAuthStoreWithMockedApi()

    await useAuthStore.getState().bootstrap()

    expect(authApi.refresh).not.toHaveBeenCalled()
    expect(useAuthStore.getState()).toMatchObject({
      mode: 'local',
      user: null,
      isAuthenticated: false,
    })
  })

  it('keeps explicit login and register local when auth is disabled', async () => {
    installBrowserStorage()
    vi.stubEnv('VITE_AUTH_ENABLED', 'false')

    const { useAuthStore, authApi } = await importAuthStoreWithMockedApi()
    const loginResult = await useAuthStore.getState().login({
      email: 'user@example.com',
      password: 'password123',
    })
    const registerResult = await useAuthStore.getState().register({
      email: 'user@example.com',
      password: 'password123',
      name: 'Иван',
    })

    expect(authApi.login).not.toHaveBeenCalled()
    expect(authApi.register).not.toHaveBeenCalled()
    expect(loginResult.success).toBe(false)
    expect(registerResult.success).toBe(false)
    expect(loginResult.message).toContain('Аккаунты пока выключены')
    expect(useAuthStore.getState().mode).toBe('local')
  })
})
