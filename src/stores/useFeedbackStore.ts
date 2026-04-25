import { create } from 'zustand'
import type { ProgressReward, SectorKey } from '@/shared/types'

interface RewardToast {
  id: string
  xp: number
  sector: SectorKey
  recoveryXp: number
}

interface FeedbackState {
  rewardToast: RewardToast | null
  showRewardToast: (reward: ProgressReward) => void
  dismissRewardToast: () => void
}

export const useFeedbackStore = create<FeedbackState>()((set) => ({
  rewardToast: null,
  showRewardToast: (reward) =>
    set({
      rewardToast: {
        id: crypto.randomUUID(),
        xp: reward.xp,
        sector: reward.sector,
        recoveryXp: reward.recoveryXp ?? 0,
      },
    }),
  dismissRewardToast: () =>
    set({
      rewardToast: null,
    }),
}))
