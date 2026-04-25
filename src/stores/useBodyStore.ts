import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getMockBodyHistory, getMockBodySnapshot } from '@/services/mockData'
import { mergePersistedState } from '@/shared/lib/persist'
import type { BodySnapshot } from '@/shared/types'

interface BodyCheckinInput {
  weightKg?: number
  waterLiters?: number
  steps?: number
  workout?: string
  workoutDone?: boolean
  foodDiscipline?: number
}

interface BodyState {
  today: BodySnapshot
  history: number[]
  saveCheckin: (input: BodyCheckinInput) => void
  resetDemoData: () => void
}

type BodyPersistedState = Pick<BodyState, 'today' | 'history'>

function createBodyPersistedState(): BodyPersistedState {
  return {
    today: getMockBodySnapshot(),
    history: getMockBodyHistory(),
  }
}

export const useBodyStore = create<BodyState>()(
  persist(
    (set) => ({
      ...createBodyPersistedState(),
      saveCheckin: (input) =>
        set((state) => {
          const nextWeight = input.weightKg ?? state.today.weightKg

          return {
            today: {
              ...state.today,
              ...input,
              weightKg: nextWeight,
            },
            history:
              input.weightKg === undefined
                ? state.history
                : [...state.history.slice(-7), input.weightKg],
          }
        }),
      resetDemoData: () =>
        set({
          ...createBodyPersistedState(),
        }),
    }),
    {
      name: 'lifequest-body',
      version: 3,
      migrate: (persistedState) =>
        mergePersistedState(createBodyPersistedState(), persistedState) as BodyPersistedState,
      partialize: (state) => ({
        today: state.today,
        history: state.history,
      }),
    },
  ),
)
