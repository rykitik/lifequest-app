import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import widgetSource from './CompanionCoreWidget.tsx?raw'
import type { CompanionCustomization } from '@/shared/types'

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

async function renderWidget(customization: CompanionCustomization) {
  vi.resetModules()
  installStorage()

  const { CompanionCoreWidget } = await import('./CompanionCoreWidget')

  return renderToStaticMarkup(
    <CompanionCoreWidget
      mood="focused"
      message="Маршрут укреплён."
      level={7}
      stabilityScore={72}
      currentXp={40}
      nextLevelXp={100}
      customization={customization}
      surface="inline"
    />,
  )
}

describe('CompanionCoreWidget customization', () => {
  it('renders with customization', async () => {
    const markup = await renderWidget({
      displayName: 'NOVA',
      accent: 'violet',
      shell: 'deepSpace',
    })

    expect(markup).toContain('NOVA')
    expect(markup).toContain('#A78BFA')
    expect(markup).toContain('Маршрут укреплён.')
  })

  it('keeps reduced motion path wired', () => {
    expect(widgetSource).toContain('useReducedMotion')
    expect(widgetSource).toContain('reducedMotion')
    expect(widgetSource).toContain('repeat: reducedMotion ? 0 : Infinity')
  })
})
