import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
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

async function renderPanel(customization: CompanionCustomization, initialExpanded = false) {
  vi.resetModules()
  installStorage()

  const { CompanionCustomizationPanel } = await import('./CompanionCustomizationPanel')

  return renderToStaticMarkup(
    <CompanionCustomizationPanel
      customization={customization}
      currentXp={42}
      initialExpanded={initialExpanded}
      level={7}
      message="Система стабильна."
      mood="idle"
      nextLevelXp={100}
      stabilityScore={76}
    />,
  )
}

describe('CompanionCustomizationPanel', () => {
  it('renders collapsed summary by default without API calls', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const html = await renderPanel({
      displayName: 'Companion Core',
      accent: 'cyan',
      shell: 'system',
    })

    expect(html).toContain('Персонализация Core')
    expect(html).toContain('Companion Core · System Core · Cyan')
    expect(html).toContain('Настроить')
    expect(html).not.toContain('Сохранить Core')
    expect(html).not.toContain('data-preview-shell')
    expect(fetchSpy).not.toHaveBeenCalled()

    fetchSpy.mockRestore()
  })

  it('renders expanded mobile single-column editor with wide live preview', async () => {
    const html = await renderPanel(
      {
        displayName: 'NOVA Core With Long Safe Name',
        accent: 'violet',
        shell: 'deepSpace',
      },
      true,
    )

    expect(html).toContain('grid grid-cols-1 gap-3')
    expect(html).toContain('min-w-[260px]')
    expect(html).toContain('data-preview-accent="violet"')
    expect(html).toContain('data-preview-shell="deepSpace"')
    expect(html).toContain('Preview · Deep Space / Violet')
    expect(html).toContain('Сохранить Core')
    expect(html).toContain('motion-reduce:animate-none')
    expect(html.toLowerCase()).not.toMatch(/питом|маскот|роман|любим|стыд|провал|наказ|серия потер|streak/)
  })

  it('uses visibly different preview markers for shell presets', async () => {
    const deepSpaceHtml = await renderPanel(
      {
        displayName: 'NOVA',
        accent: 'violet',
        shell: 'deepSpace',
      },
      true,
    )
    const neonFocusHtml = await renderPanel(
      {
        displayName: 'NOVA',
        accent: 'violet',
        shell: 'neonFocus',
      },
      true,
    )

    expect(deepSpaceHtml).toContain('data-preview-shell="deepSpace"')
    expect(neonFocusHtml).toContain('data-preview-shell="neonFocus"')
    expect(deepSpaceHtml).toContain('border-dotted')
    expect(neonFocusHtml).toContain('shadow-[0_0_32px_rgba(34,211,238,0.28)]')
  })
})
