import type {
  ModeKey,
  QuestClassification,
  QuestEffort,
  QuestImpact,
  QuestItem,
  QuestStatus,
  SectorKey,
  TodayRoute,
  TodayRouteKey,
} from '@/shared/types'

export const routeLabels: Record<TodayRouteKey, string> = {
  mainQuest: 'Главный квест',
  quickWin: 'Быстрая победа',
  recoveryQuest: 'Запасной план',
}

export const statusLabels: Record<QuestStatus, string> = {
  ready: 'Новая',
  active: 'В работе',
  parked: 'Позже',
  complete: 'Выполнено',
}

export const classificationLabels: Record<QuestClassification, string> = {
  focus: 'Главная',
  quick_win: 'Быстрая',
  later: 'Позже',
  body: 'Тело',
  money: 'Деньги',
  stability: 'Восстановление',
}

export const sectorLabels: Record<SectorKey, string> = {
  focus: 'Фокус',
  body: 'Тело',
  money: 'Деньги',
  stability: 'Стабильность',
  energy: 'Энергия',
}

export const effortLabels: Record<QuestEffort, string> = {
  tiny: 'Мини',
  light: 'Легко',
  medium: 'Средне',
  heavy: 'Глубоко',
}

export const impactLabels: Record<QuestImpact, string> = {
  small: 'Мягкий эффект',
  medium: 'Полезный эффект',
  high: 'Сильный эффект',
}

export function getQuestEffort(quest: QuestItem): QuestEffort {
  if (quest.minutes <= 5) {
    return 'tiny'
  }

  if (quest.minutes <= 15) {
    return 'light'
  }

  if (quest.minutes <= 35) {
    return 'medium'
  }

  return 'heavy'
}

export function getQuestImpact(quest: QuestItem): QuestImpact {
  if (quest.classification === 'focus' || quest.xp >= 30 || quest.minutes >= 40) {
    return 'high'
  }

  if (quest.classification === 'money' || quest.classification === 'body' || quest.xp >= 18) {
    return 'medium'
  }

  return 'small'
}

export function isTinyQuest(quest: QuestItem) {
  return getQuestEffort(quest) === 'tiny'
}

export function isQuickQuest(quest: QuestItem) {
  return quest.classification === 'quick_win' || quest.minutes <= 12
}

export function isRecoveryQuest(quest: QuestItem) {
  return (
    quest.classification === 'stability' ||
    quest.sector === 'stability' ||
    quest.sector === 'energy' ||
    quest.minutes <= 5
  )
}

export function isMainQuestCandidate(quest: QuestItem) {
  return (
    quest.classification === 'focus' ||
    quest.sector === 'focus' ||
    getQuestImpact(quest) === 'high'
  )
}

export function getQuestDomainLabel(quest: QuestItem) {
  return sectorLabels[quest.sector]
}

export function getQuestClassificationLabel(classification?: QuestClassification) {
  return classification ? classificationLabels[classification] : 'Без типа'
}

export function getQuestStatusLabel(status: QuestStatus) {
  return statusLabels[status]
}

export function getQuestEffortLabel(quest: QuestItem) {
  return effortLabels[getQuestEffort(quest)]
}

export function getQuestImpactLabel(quest: QuestItem) {
  return impactLabels[getQuestImpact(quest)]
}

export function getRouteAssignments(route: TodayRoute, questId: string): TodayRouteKey[] {
  const assignments = Object.entries(route).reduce<TodayRouteKey[]>((accumulator, [key, value]) => {
    if (value?.id === questId) {
      accumulator.push(key as TodayRouteKey)
    }

    return accumulator
  }, [])

  return assignments
}

export function getModeRouteHint(mode: ModeKey) {
  switch (mode) {
    case 'low':
      return 'Сейчас приоритет у мягкого маршрута и лёгкого старта.'
    case 'high':
      return 'Можно брать более сильный шаг, если он действительно важен.'
    case 'drifted':
      return 'Нужен короткий возврат в систему, без перегруза.'
    case 'stable':
    default:
      return 'Один важный шаг, одна быстрая победа и один запасной вариант.'
  }
}
