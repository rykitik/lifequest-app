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
  linkedQuest: {
    title: 'private-focus-task-title',
    status: 'waiting',
  },
}

describe('SkillTreePanel', () => {
  it('renders suggestions in the simplified one-signal layout without API calls', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const html = renderToStaticMarkup(<SkillTreePanel modules={[module]} />)

    expect(html).toContain('grid grid-cols-1 gap-3 min-[560px]:grid-cols-2')
    expect(html).toContain('Следующий сигнал')
    expect(html).not.toContain('Сигнал модуля')
    expect(html).toContain('Добавить воду')
    expect(html).toContain('module-suggestion-action-body')
    expect(html).toContain('Квест дня')
    expect(html).not.toContain('private-focus-task-title')
    expect(fetchSpy).not.toHaveBeenCalled()

    fetchSpy.mockRestore()
  })

  it('renders completed daily quest status as a compact chip', () => {
    const completedModule: LifeQuestSkillModule = {
      ...module,
      suggestion: module.suggestion
        ? {
            ...module.suggestion,
            linkedDailyQuest: 'completed',
          }
        : undefined,
      linkedQuest: {
        title: 'private-completed-title',
        status: 'completed',
      },
    }
    const html = renderToStaticMarkup(<SkillTreePanel modules={[completedModule]} />)

    expect(html).toContain('Квест дня выполнен')
    expect(html).not.toContain('private-completed-title')
    expect(html.toLowerCase()).not.toMatch(/серия потер|провал|стыд|штраф|наказ|виноват|страх|streak/)
  })
})
