import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { SkillTreePanel } from '@/features/progress/components/SkillTreePanel'
import type { LifeQuestSkillModule } from '@/features/profile/lib/skillTree'

const module: LifeQuestSkillModule = {
  id: 'body',
  label: 'Тело',
  levelLabel: 'База собирается',
  progressPercent: 42,
  state: 'forming',
  summary: 'Телесная база',
  nextSignal: 'Обновить чек-ин тела',
  relatedMilestoneCount: 1,
  recentMilestones: [
    {
      id: 'body_first_signal',
      title: 'Первый сигнал тела',
    },
  ],
  suggestion: {
    id: 'body-water',
    title: 'Добавить воду',
    caption: '+500 мл укрепят телесную базу.',
    actionLabel: 'Добавить воду',
    actionType: 'add_water',
    priority: 'normal',
    safeDomain: 'body',
    linkedDailyQuest: 'waiting',
  },
}

describe('SkillTreePanel', () => {
  it('renders compact module suggestions without API calls', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const html = renderToStaticMarkup(<SkillTreePanel modules={[module]} />)

    expect(html).toContain('Сигнал модуля')
    expect(html).toContain('Добавить воду')
    expect(html).toContain('Квест дня')
    expect(fetchSpy).not.toHaveBeenCalled()

    fetchSpy.mockRestore()
  })
})
