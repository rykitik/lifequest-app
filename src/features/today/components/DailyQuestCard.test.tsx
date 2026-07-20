import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DailyQuestCard } from './DailyQuestCard'
import type { DailyQuest } from '@/shared/types'

const quest: DailyQuest = {
  id: '2026-07-20:body-water-low',
  title: 'Восстановить водный баланс',
  caption: '+500 мл воды укрепят телесную базу.',
  domain: 'body',
  difficulty: 'tiny',
  rewardSignal: 'Тело +5',
  companionReaction: 'Ядро стало стабильнее.',
  actionType: 'add_water',
  actionLabel: 'Добавить воду',
  xp: 5,
  sector: 'body',
  completedAt: '2026-07-20T10:00:00.000Z',
}

describe('DailyQuestCard', () => {
  it('renders completed state safely', () => {
    const markup = renderToStaticMarkup(<DailyQuestCard quest={quest} onAction={() => undefined} />)

    expect(markup).toContain('Главный квест дня')
    expect(markup).toContain('Восстановить водный баланс')
    expect(markup).toContain('Выполнено сегодня')
    expect(markup).toContain('Тело +5')
    expect(markup).not.toContain('Добавить воду')
  })

  it('does not render shame or punishment copy', () => {
    const markup = renderToStaticMarkup(<DailyQuestCard quest={quest} onAction={() => undefined} />)

    expect(markup.toLowerCase()).not.toMatch(/серия потер|провал|стыд|штраф|наказ|виноват/)
  })
})
