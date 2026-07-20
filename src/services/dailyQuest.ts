import { getLocalDateKey } from '@/shared/lib/date'
import type {
  DailyQuest,
  DailyQuestActionType,
  DailyQuestCompletion,
  DailyQuestDifficulty,
  DailyQuestDomain,
  SectorKey,
} from '@/shared/types'
import { applyLifeQuestReward } from '@/services/gameplay'
import type { TodayNextStepRecommendation } from '@/services/todayNextStep'
import { useTodayStore } from '@/stores/useTodayStore'

const domainLabels: Record<DailyQuestDomain, string> = {
  body: 'Тело',
  money: 'Деньги',
  focus: 'Фокус',
  recovery: 'Восстановление',
  system: 'Система',
}

const companionReactions: Record<DailyQuestDomain, string> = {
  body: 'Ядро стало стабильнее.',
  money: 'Финансовая база стала точнее.',
  focus: 'Маршрут укреплён.',
  recovery: 'Сигнал восстановления зафиксирован.',
  system: 'Сигнал дня зафиксирован.',
}

function toDailyQuestDomain(domain: TodayNextStepRecommendation['domain']): DailyQuestDomain {
  if (domain === 'weekly' || domain === 'profile') {
    return 'system'
  }

  return domain
}

function toRewardSector(domain: DailyQuestDomain): SectorKey {
  if (domain === 'recovery' || domain === 'system') {
    return 'stability'
  }

  return domain
}

function toDifficulty(difficulty: TodayNextStepRecommendation['difficulty']): DailyQuestDifficulty {
  return difficulty === 'easy' ? 'tiny' : 'normal'
}

function getActionType(recommendation: TodayNextStepRecommendation): DailyQuestActionType {
  if (recommendation.id === 'body-quick-checkin' || recommendation.id.startsWith('baseline-')) {
    return 'body_checkin'
  }

  if (recommendation.id === 'body-water-low') {
    return 'add_water'
  }

  if (recommendation.domain === 'body') {
    return 'open_body'
  }

  if (recommendation.domain === 'money') {
    return 'open_money'
  }

  if (recommendation.domain === 'focus') {
    return 'focus_step'
  }

  if (recommendation.domain === 'recovery') {
    return 'open_recovery'
  }

  if (recommendation.domain === 'weekly') {
    return 'open_prompt_center'
  }

  return 'open_settings'
}

function getDailyQuestTitle(recommendation: TodayNextStepRecommendation) {
  if (recommendation.id === 'body-quick-checkin' || recommendation.id.startsWith('baseline-')) {
    return 'Собрать первый сигнал'
  }

  if (recommendation.id === 'body-water-low') {
    return 'Восстановить водный баланс'
  }

  if (recommendation.id === 'body-steps-low') {
    return 'Запустить движение'
  }

  if (recommendation.domain === 'money') {
    return 'Проверить финансовую базу'
  }

  if (recommendation.domain === 'recovery') {
    return 'Снизить перегруз'
  }

  if (recommendation.domain === 'weekly') {
    return 'Разобрать риск недели'
  }

  if (recommendation.domain === 'profile') {
    return 'Настроить базу системы'
  }

  return 'Закрыть один быстрый шаг'
}

function getDailyQuestCaption(recommendation: TodayNextStepRecommendation) {
  if (recommendation.id === 'body-quick-checkin' || recommendation.id.startsWith('baseline-')) {
    return 'Начни с короткого чек-ина тела. Один сигнал уже достаточно важен.'
  }

  if (recommendation.id === 'body-water-low') {
    return '+500 мл воды укрепят телесную базу.'
  }

  if (recommendation.domain === 'money') {
    return 'Безопасный остаток станет точнее без лишних деталей.'
  }

  if (recommendation.domain === 'recovery') {
    return 'Короткое восстановление стабилизирует Core.'
  }

  if (recommendation.domain === 'focus') {
    return 'Система получит сигнал фокуса.'
  }

  return recommendation.reason
}

function getActionLabel(actionType: DailyQuestActionType, fallbackLabel: string) {
  if (actionType === 'body_checkin') return 'Начать'
  if (actionType === 'add_water') return 'Добавить воду'
  if (actionType === 'open_money') return 'Открыть деньги'
  if (actionType === 'focus_step') return 'Выполнить'
  if (actionType === 'open_recovery') return 'Включить режим восстановления'

  return fallbackLabel
}

export function getDailyQuestRewardSourceId(quest: Pick<DailyQuest, 'id'>, dateKey = getLocalDateKey()) {
  return quest.id.startsWith(`${dateKey}:`) ? `daily-quest:${quest.id}` : `daily-quest:${dateKey}:${quest.id}`
}

export function buildDailyQuest(
  recommendation: TodayNextStepRecommendation,
  completion: DailyQuestCompletion | null = null,
  dateKey = getLocalDateKey(),
): DailyQuest {
  const domain = toDailyQuestDomain(recommendation.domain)
  const actionType = getActionType(recommendation)
  const id = `${dateKey}:${recommendation.id}`
  const xp = Math.max(3, Math.min(12, Math.round(recommendation.xp ?? 5)))
  const completedAt =
    completion?.date === dateKey && completion.questId === id ? completion.completedAt : undefined

  return {
    id,
    title: getDailyQuestTitle(recommendation),
    caption: getDailyQuestCaption(recommendation),
    domain,
    difficulty: toDifficulty(recommendation.difficulty),
    rewardSignal: `${domainLabels[domain]} +${xp}`,
    companionReaction: companionReactions[domain],
    actionType,
    actionLabel: getActionLabel(actionType, recommendation.actionLabel),
    xp,
    sector: toRewardSector(domain),
    completedAt,
  }
}

export function completeDailyQuestReward(quest: DailyQuest, dateKey = getLocalDateKey()) {
  const completedAt = new Date().toISOString()
  const rewardSourceId = getDailyQuestRewardSourceId(quest, dateKey)
  const didComplete = useTodayStore.getState().completeDailyQuest({
    date: dateKey,
    questId: quest.id,
    completedAt,
    rewardSourceId,
    title: quest.title,
    domain: quest.domain,
    rewardSignal: quest.rewardSignal,
  })

  if (!didComplete) {
    return false
  }

  return applyLifeQuestReward(
    {
      xp: quest.xp,
      recoveryXp: quest.domain === 'recovery' ? Math.min(quest.xp, 5) : 0,
      consistencyXp: 2,
      sector: quest.sector,
      completedTask: true,
      sourceId: rewardSourceId,
    },
    quest.companionReaction,
    `Квест выполнен · ${quest.rewardSignal}`,
  )
}
