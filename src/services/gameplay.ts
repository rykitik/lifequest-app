import type { ProgressReward } from '@/shared/types'
import { useCompanionStore } from '@/stores/useCompanionStore'
import { useFeedbackStore } from '@/stores/useFeedbackStore'
import { useProgressStore } from '@/stores/useProgressStore'
import { useRescueStore } from '@/stores/useRescueStore'
import { useTodayStore } from '@/stores/useTodayStore'

export function applyLifeQuestReward(reward: ProgressReward, message: string) {
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
  useFeedbackStore.getState().showRewardToast(reward)

  return true
}
