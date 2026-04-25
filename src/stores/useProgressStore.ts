import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createEmptyDailyProgressSummary, getMockProgressProfile } from '@/services/mockData'
import { getLocalDateKey } from '@/shared/lib/date'
import { mergePersistedState } from '@/shared/lib/persist'
import type {
  DailyProgressSummary,
  ProgressReward,
  SectorKey,
  SectorProgress,
} from '@/shared/types'

interface ProgressState {
  level: number
  totalXp: number
  currentLevelXp: number
  nextLevelXp: number
  actionXp: number
  consistencyXp: number
  recoveryXp: number
  achievements: string[]
  sectors: SectorProgress[]
  dailySummary: DailyProgressSummary
  appliedRewardIds: string[]
  applyReward: (reward: ProgressReward) => boolean
  ensureDailySummaryCurrent: () => void
  resetDemoData: () => void
}

type ProgressPersistedState = Omit<
  ProgressState,
  'appliedRewardIds' | 'applyReward' | 'ensureDailySummaryCurrent' | 'resetDemoData'
>

function createProgressPersistedState(): ProgressPersistedState {
  return getMockProgressProfile()
}

function applySectorReward(sectors: SectorProgress[], reward: ProgressReward) {
  return sectors.map((sector) => {
    if (sector.key !== reward.sector) {
      return sector
    }

    const lift = Math.max(2, Math.round(reward.xp / 8))
    const rawPercent = sector.percent + lift

    if (rawPercent < 100) {
      return {
        ...sector,
        percent: rawPercent,
        xp: sector.xp + reward.xp,
      }
    }

    return {
      ...sector,
      level: sector.level + 1,
      percent: rawPercent - 100,
      xp: sector.xp + reward.xp,
    }
  })
}

function getFreshDailySummary(summary: DailyProgressSummary) {
  const todayKey = getLocalDateKey()

  if (summary.date === todayKey) {
    return summary
  }

  return createEmptyDailyProgressSummary(todayKey)
}

function applyDailyReward(summary: DailyProgressSummary, reward: ProgressReward) {
  const nextSummary = getFreshDailySummary(summary)

  return {
    ...nextSummary,
    xpToday: nextSummary.xpToday + reward.xp,
    completedTasks: nextSummary.completedTasks + (reward.completedTask ? 1 : 0),
    sectorXp: {
      ...nextSummary.sectorXp,
      [reward.sector]:
        nextSummary.sectorXp[reward.sector as SectorKey] + reward.xp,
    },
  }
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set) => ({
      ...createProgressPersistedState(),
      appliedRewardIds: [],
      applyReward: (reward) => {
        let applied = false

        set((state) => {
          const rewardSourceId = reward.sourceId?.trim()

          if (rewardSourceId && state.appliedRewardIds.includes(rewardSourceId)) {
            return state
          }

          applied = true
          let level = state.level
          let currentLevelXp = state.currentLevelXp + reward.xp
          let nextLevelXp = state.nextLevelXp

          while (currentLevelXp >= nextLevelXp) {
            currentLevelXp -= nextLevelXp
            level += 1
            nextLevelXp = Math.round(nextLevelXp * 1.12)
          }

          return {
            level,
            totalXp: state.totalXp + reward.xp,
            currentLevelXp,
            nextLevelXp,
            actionXp: state.actionXp + Math.max(0, reward.xp - (reward.recoveryXp ?? 0)),
            consistencyXp: state.consistencyXp + (reward.consistencyXp ?? 0),
            recoveryXp: state.recoveryXp + (reward.recoveryXp ?? 0),
            sectors: applySectorReward(state.sectors, reward),
            dailySummary: applyDailyReward(state.dailySummary, reward),
            appliedRewardIds: rewardSourceId
              ? [rewardSourceId, ...state.appliedRewardIds].slice(0, 80)
              : state.appliedRewardIds,
          }
        })

        return applied
      },
      ensureDailySummaryCurrent: () =>
        set((state) => {
          const freshSummary = getFreshDailySummary(state.dailySummary)

          if (freshSummary.date === state.dailySummary.date) {
            return state
          }

          return {
            dailySummary: freshSummary,
          }
        }),
      resetDemoData: () =>
        set({
          ...createProgressPersistedState(),
          appliedRewardIds: [],
        }),
    }),
    {
      name: 'lifequest-progress',
      version: 4,
      migrate: (persistedState) =>
        mergePersistedState(
          createProgressPersistedState(),
          persistedState,
        ) as ProgressPersistedState,
      partialize: (state) => ({
        level: state.level,
        totalXp: state.totalXp,
        currentLevelXp: state.currentLevelXp,
        nextLevelXp: state.nextLevelXp,
        actionXp: state.actionXp,
        consistencyXp: state.consistencyXp,
        recoveryXp: state.recoveryXp,
        achievements: state.achievements,
        sectors: state.sectors,
        dailySummary: state.dailySummary,
      }),
    },
  ),
)
