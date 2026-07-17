import { describe, expect, it, vi } from 'vitest'

describe('runtimeConfig', () => {
  it('keeps auth disabled by default', async () => {
    vi.resetModules()
    vi.stubEnv('VITE_AUTH_ENABLED', undefined)

    const { isAuthEnabled } = await import('@/services/runtimeConfig')

    expect(isAuthEnabled()).toBe(false)
  })
})
