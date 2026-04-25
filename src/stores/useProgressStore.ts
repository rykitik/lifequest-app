import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getMockProgressProfile } from '@/services/mockData'
import type { ProgressReward, SectorProgress } from '@/shared/types'

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
  applyReward: (reward: ProgressReward) => void
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

export const useProgressStore = create<ProgressState>()(
  persist(
    (set) => ({
      ...getMockProgressProfile(),
      applyReward: (reward) =>
        set((state) => {
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
          }
        }),
    }),
    {
      name: 'lifequest-progress',
      version: 2,
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
      }),
    },
  ),
)
