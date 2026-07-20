import { useCompanionStore } from '@/stores/useCompanionStore'
import { useFeedbackStore } from '@/stores/useFeedbackStore'
import { useMilestonesStore } from '@/stores/useMilestonesStore'
import type {
  LifeQuestMilestone,
  LifeQuestMilestoneDomain,
  LifeQuestMilestoneRarity,
  LifeQuestMilestoneType,
} from '@/shared/types'

export interface LifeQuestMilestoneDefinition {
  type: LifeQuestMilestoneType
  title: string
  caption: string
  domain: LifeQuestMilestoneDomain
  rarity: LifeQuestMilestoneRarity
}

export interface UnlockMilestoneOptions {
  deferFeedback?: boolean
}

export const milestoneDefinitions: Record<LifeQuestMilestoneType, LifeQuestMilestoneDefinition> = {
  system_activated: {
    type: 'system_activated',
    title: 'Система активирована',
    caption: 'Локальная база готова хранить первые сигналы.',
    domain: 'system',
    rarity: 'core',
  },
  onboarding_completed: {
    type: 'onboarding_completed',
    title: 'Онбординг завершён',
    caption: 'Профиль готов к первому маршруту.',
    domain: 'system',
    rarity: 'core',
  },
  body_first_signal: {
    type: 'body_first_signal',
    title: 'Первый сигнал тела',
    caption: 'Система приняла первый безопасный телесный сигнал.',
    domain: 'body',
    rarity: 'common',
  },
  body_first_checkin: {
    type: 'body_first_checkin',
    title: 'Первый чек-ин тела принят',
    caption: 'Контур тела начал собирать историю без лишних деталей.',
    domain: 'body',
    rarity: 'common',
  },
  money_baseline_created: {
    type: 'money_baseline_created',
    title: 'Финансовая база создана',
    caption: 'Денежный контур получил стартовую точку без раскрытия сумм.',
    domain: 'money',
    rarity: 'core',
  },
  money_first_import: {
    type: 'money_first_import',
    title: 'Первый импорт операций принят',
    caption: 'Финансовый сигнал учтён без приватных деталей.',
    domain: 'money',
    rarity: 'rare',
  },
  weekly_review_saved: {
    type: 'weekly_review_saved',
    title: 'Первый недельный обзор сохранён',
    caption: 'Система зафиксировала выводы недели.',
    domain: 'system',
    rarity: 'rare',
  },
  backup_created: {
    type: 'backup_created',
    title: 'Первая резервная копия создана',
    caption: 'Локальная база защищена отдельным файлом.',
    domain: 'system',
    rarity: 'core',
  },
  daily_quest_completed: {
    type: 'daily_quest_completed',
    title: 'Первый квест дня выполнен',
    caption: 'Один полезный шаг стал частью истории системы.',
    domain: 'focus',
    rarity: 'core',
  },
  daily_route_locked: {
    type: 'daily_route_locked',
    title: 'Маршрут дня закреплён',
    caption: 'На день выбраны опорные линии без длинного списка.',
    domain: 'focus',
    rarity: 'common',
  },
  core_customized: {
    type: 'core_customized',
    title: 'Core персонализирован',
    caption: 'Имя и оболочка Companion Core настроены.',
    domain: 'companion',
    rarity: 'core',
  },
  companion_evolved: {
    type: 'companion_evolved',
    title: 'Companion Core эволюционировал',
    caption: 'Форма ядра выросла вместе с системой.',
    domain: 'companion',
    rarity: 'rare',
  },
}

export function createLifeQuestMilestone(
  type: LifeQuestMilestoneType,
  unlockedAt = new Date().toISOString(),
): LifeQuestMilestone {
  const definition = milestoneDefinitions[type]

  return {
    id: type,
    unlockedAt,
    type,
    title: definition.title,
    caption: definition.caption,
    domain: definition.domain,
    rarity: definition.rarity,
  }
}

export function unlockLifeQuestMilestone(
  type: LifeQuestMilestoneType,
  unlockedAt = new Date().toISOString(),
  options: UnlockMilestoneOptions = {},
) {
  const milestone = createLifeQuestMilestone(type, unlockedAt)
  const unlocked = useMilestonesStore.getState().unlockMilestone(milestone)

  if (!unlocked) {
    return false
  }

  showMilestoneFeedback(milestone, options)

  return true
}

export function unlockLifeQuestMilestones(
  types: LifeQuestMilestoneType[],
  unlockedAt = new Date().toISOString(),
  options: UnlockMilestoneOptions = {},
) {
  const unlockedMilestones = types
    .map((type) => createLifeQuestMilestone(type, unlockedAt))
    .filter((milestone) => useMilestonesStore.getState().unlockMilestone(milestone))

  if (!unlockedMilestones.length) {
    return false
  }

  showMilestoneFeedback(unlockedMilestones[0]!, options)

  return true
}

function showMilestoneFeedback(milestone: LifeQuestMilestone, options: UnlockMilestoneOptions) {
  const reaction = 'Веха зафиксирована.'
  const emit = () => {
    useCompanionStore.getState().setActiveMessage('Сигнал сохранён в истории.')
    useCompanionStore.getState().triggerProgressReaction(reaction)
    useFeedbackStore.getState().showSystemToast(`Веха открыта · ${milestone.title}`, reaction)
  }

  if (options.deferFeedback) {
    globalThis.setTimeout(emit, 0)
    return
  }

  emit()
}
