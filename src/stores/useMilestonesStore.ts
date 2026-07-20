import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { mergePersistedState } from '@/shared/lib/persist'
import type { LifeQuestMilestone } from '@/shared/types'

interface MilestonesState {
  milestones: LifeQuestMilestone[]
  unlockMilestone: (milestone: LifeQuestMilestone) => boolean
  resetDemoData: () => void
}

interface MilestonesPersistedState {
  milestones: LifeQuestMilestone[]
}

function createMilestonesPersistedState(): MilestonesPersistedState {
  return {
    milestones: [],
  }
}

function normalizeMilestones(value: unknown): LifeQuestMilestone[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((item): item is LifeQuestMilestone => {
      if (!item || typeof item !== 'object') {
        return false
      }

      const candidate = item as Partial<LifeQuestMilestone>

      return (
        typeof candidate.id === 'string' &&
        typeof candidate.unlockedAt === 'string' &&
        typeof candidate.type === 'string' &&
        typeof candidate.title === 'string' &&
        typeof candidate.caption === 'string' &&
        typeof candidate.domain === 'string' &&
        typeof candidate.rarity === 'string'
      )
    })
    .slice(0, 80)
}

export const useMilestonesStore = create<MilestonesState>()(
  persist(
    (set) => ({
      ...createMilestonesPersistedState(),
      unlockMilestone: (milestone) => {
        let unlocked = false

        set((state) => {
          const alreadyUnlocked = state.milestones.some(
            (item) => item.id === milestone.id || item.type === milestone.type,
          )

          if (alreadyUnlocked) {
            return state
          }

          unlocked = true

          return {
            milestones: [milestone, ...state.milestones].slice(0, 80),
          }
        })

        return unlocked
      },
      resetDemoData: () =>
        set({
          ...createMilestonesPersistedState(),
        }),
    }),
    {
      name: 'lifequest-milestones',
      version: 1,
      migrate: (persistedState) => {
        const merged = mergePersistedState(
          createMilestonesPersistedState(),
          persistedState,
        ) as MilestonesPersistedState

        return {
          milestones: normalizeMilestones(merged.milestones),
        }
      },
      partialize: (state) => ({
        milestones: state.milestones,
      }),
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
