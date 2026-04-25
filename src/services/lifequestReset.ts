import { useBodyStore } from '@/stores/useBodyStore'
import { useCompanionStore } from '@/stores/useCompanionStore'
import { useMoneyStore } from '@/stores/useMoneyStore'
import { useProgressStore } from '@/stores/useProgressStore'
import { usePromptCenterStore } from '@/stores/usePromptCenterStore'
import { useQuestStore } from '@/stores/useQuestStore'
import { useRescueStore } from '@/stores/useRescueStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { useTodayStore } from '@/stores/useTodayStore'

export function resetLifeQuestDemoData(resetSettings: () => void) {
  useAuthStore.getState().resetDemoData()
  useQuestStore.getState().resetDemoData()
  useTodayStore.getState().resetDemoData()
  useProgressStore.getState().resetDemoData()
  useBodyStore.getState().resetDemoData()
  useMoneyStore.getState().resetDemoData()
  useCompanionStore.getState().resetDemoData()
  usePromptCenterStore.getState().resetDemoData()
  useRescueStore.getState().resetRescueState()
  resetSettings()
}
