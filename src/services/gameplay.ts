import type { ProgressReward } from '@/shared/types'
import { useCompanionStore } from '@/stores/useCompanionStore'
import { useFeedbackStore } from '@/stores/useFeedbackStore'
import { useProgressStore } from '@/stores/useProgressStore'
import { useRescueStore } from '@/stores/useRescueStore'
import { useTodayStore } from '@/stores/useTodayStore'

export const companionProgressSignals = [
  'Шаг принят.',
  'Сигнал усилен.',
  'База стала стабильнее.',
  'Прогресс зафиксирован.',
  'Ядро обновило маршрут.',
] as const

export const rewardFeedbackMessages = {
  bodyCheckinSaved: 'Чек-ин сохранён · Ядро получило сигнал',
  waterAdded: 'Вода отмечена · +5 XP',
  quickWinDone: 'Быстрая победа закрыта · прогресс зафиксирован',
  moneyImportCompleted: 'Операции учтены · финансовый сигнал обновлён',
  weeklyReviewSaved: 'Недельный итог сохранён · риск недели зафиксирован',
  promptActionsApplied: 'Рекомендации применены · маршрут обновлён',
  onboardingCompleted: 'Настройка завершена · система готова к первому шагу',
} as const

function getCompanionProgressSignal(reward: ProgressReward) {
  if ((reward.recoveryXp ?? 0) > 0 || reward.sector === 'stability') {
    return 'База стала стабильнее.'
  }

  if (reward.sector === 'money') {
    return 'Сигнал усилен.'
  }

  if (reward.completedTask) {
    return 'Прогресс зафиксирован.'
  }

  if (reward.xp >= 10) {
    return 'Ядро обновило маршрут.'
  }

  return 'Шаг принят.'
}

export function applyLifeQuestReward(
  reward: ProgressReward,
  message: string,
  feedbackMessage = 'Шаг записан · система отреагировала',
) {
  const applied = useProgressStore.getState().applyReward(reward)

  if (!applied) {
    return false
  }

  const progressState = useProgressStore.getState()
  const stability = progressState.sectors.find((sector) => sector.key === 'stability')?.percent ?? 72

  useCompanionStore.getState().updateMoodFromContext({
    mode: useTodayStore.getState().currentMode,
    level: progressState.level,
    stability,
    isRecovering: useRescueStore.getState().completed,
  })
  useCompanionStore.getState().setActiveMessage(message)
  const signal = getCompanionProgressSignal(reward)

  useCompanionStore.getState().triggerProgressReaction(signal)
  useFeedbackStore.getState().showRewardToast(reward, feedbackMessage, signal)

  return true
}
