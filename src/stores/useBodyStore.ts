import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getMockBodyHistory, getMockBodySnapshot } from '@/services/mockData'
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
}

export const useBodyStore = create<BodyState>()(
  persist(
    (set) => ({
      today: getMockBodySnapshot(),
      history: getMockBodyHistory(),
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
    }),
    {
      name: 'lifequest-body',
      version: 2,
      partialize: (state) => ({
        today: state.today,
        history: state.history,
      }),
    },
  ),
)
