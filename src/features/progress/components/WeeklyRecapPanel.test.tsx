import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { WeeklyRecapPanel } from '@/features/progress/components/WeeklyRecapPanel'
import type { WeeklyRecapViewModel } from '@/features/profile/lib/weeklyRecap'

const recap: WeeklyRecapViewModel = {
  weekKey: '2026-07-20',
  periodLabel: '20 июл. — 26 июл.',
  status: 'active',
  headline: 'Неделя дала устойчивые сигналы',
  summary: 'Фокус получил заметные сигналы. Восстановление стоит держать мягким фокусом дальше.',
  strongestModule: {
    id: 'focus',
    label: 'Фокус',
    reason: 'маршрут дня получил сигналы недели.',
  },
  attentionModule: {
    id: 'recovery',
    label: 'Восстановление',
    reason: 'контур восстановления стоит держать мягким фокусом без давления.',
  },
  signals: [
    {
      id: 'focus-completion',
      label: 'Завершённые шаги',
      value: 'квест дня',
      domain: 'focus',
    },
  ],
  milestones: [
    {
      id: 'daily',
      title: 'Первый квест дня выполнен',
      domain: 'focus',
    },
  ],
  nextWeekFocus: {
    title: 'Стабилизировать восстановление',
    caption: 'Один мягкий recovery-сигнал в день поможет Core держать темп.',
    domain: 'recovery',
  },
  promptCenterHint: {
    title: 'Для глубокого разбора',
    caption: 'Можно открыть недельный промпт в Prompt Center.',
  },
}

describe('WeeklyRecapPanel', () => {
  it('renders compact weekly recap sections without API calls', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const html = renderToStaticMarkup(<WeeklyRecapPanel recap={recap} />)

    expect(html).toContain('Недельное отражение')
    expect(html).toContain('Усилен модуль')
    expect(html).toContain('Мягкий фокус')
    expect(html).toContain('Фокус следующей недели')
    expect(html).toContain('Показать сигналы недели')
    expect(html).not.toContain('Завершённые шаги')
    expect(html).not.toContain('Первый квест дня выполнен')
    expect(fetchSpy).not.toHaveBeenCalled()

    fetchSpy.mockRestore()
  })

  it('renders weekly signals and milestones when expanded', () => {
    const html = renderToStaticMarkup(<WeeklyRecapPanel initialExpanded recap={recap} />)

    expect(html).toContain('Сигналы недели')
    expect(html).toContain('Завершённые шаги')
    expect(html).toContain('Вехи недели')
    expect(html).toContain('Первый квест дня выполнен')
    expect(html).toContain('Для глубокого разбора')
    expect(html.toLowerCase()).not.toMatch(/провал|плохая неделя|слабая дисциплина|серия потер|верни серию|streak/)
  })
})
