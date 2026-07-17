import { create } from 'zustand'
import type { ProgressReward, SectorKey } from '@/shared/types'

interface RewardToast {
  id: string
  xp: number
  sector: SectorKey
  recoveryXp: number
  message: string
  signal: string
}

interface FeedbackState {
  rewardToast: RewardToast | null
  showRewardToast: (reward: ProgressReward, message: string, signal: string) => void
  dismissRewardToast: () => void
}

function createRewardToastId() {
  return globalThis.crypto?.randomUUID?.() ?? `reward-${Date.now()}-${Math.random()}`
}

export const useFeedbackStore = create<FeedbackState>()((set) => ({
  rewardToast: null,
  showRewardToast: (reward, message, signal) =>
    set({
      rewardToast: {
        id: createRewardToastId(),
        xp: reward.xp,
        sector: reward.sector,
        recoveryXp: reward.recoveryXp ?? 0,
        message,
        signal,
      },
    }),
  dismissRewardToast: () =>
    set({
      rewardToast: null,
    }),
}))
