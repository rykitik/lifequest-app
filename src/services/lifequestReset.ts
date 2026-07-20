import { useBodyStore } from '@/stores/useBodyStore'
import { useCompanionStore } from '@/stores/useCompanionStore'
import { useMoneyStore } from '@/stores/useMoneyStore'
import { useMilestonesStore } from '@/stores/useMilestonesStore'
import { useProgressStore } from '@/stores/useProgressStore'
import { usePromptCenterStore } from '@/stores/usePromptCenterStore'
import { useQuestStore } from '@/stores/useQuestStore'
import { useRescueStore } from '@/stores/useRescueStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { useSyncStore } from '@/stores/useSyncStore'
import { useTodayStore } from '@/stores/useTodayStore'
import { useWeeklyReviewStore } from '@/stores/useWeeklyReviewStore'

export function resetLifeQuestDemoData(resetSettings: () => void) {
  useAuthStore.getState().resetDemoData()
  useSyncStore.getState().resetSyncState()
  useQuestStore.getState().resetDemoData()
  useTodayStore.getState().resetDemoData()
  useProgressStore.getState().resetDemoData()
  useMilestonesStore.getState().resetDemoData()
  useBodyStore.getState().resetDemoData()
  useMoneyStore.getState().resetDemoData()
  useCompanionStore.getState().resetDemoData()
  usePromptCenterStore.getState().resetDemoData()
  useWeeklyReviewStore.getState().resetWeeklyReviews()
  useRescueStore.getState().resetRescueState()
  resetSettings()
}
