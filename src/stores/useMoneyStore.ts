import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getMockMoneyActions, getMockMoneySnapshot } from '@/services/mockData'
import type { MoneyAction, MoneySnapshot } from '@/shared/types'

interface MoneyState {
  snapshot: MoneySnapshot
  dailyMoneyQuests: MoneyAction[]
  saveSnapshot: (input: Partial<MoneySnapshot>) => void
  completeMoneyQuest: (id: string) => void
}

export const useMoneyStore = create<MoneyState>()(
  persist(
    (set) => ({
      snapshot: getMockMoneySnapshot(),
      dailyMoneyQuests: getMockMoneyActions(),
      saveSnapshot: (input) =>
        set((state) => ({
          snapshot: {
            ...state.snapshot,
            ...input,
          },
        })),
      completeMoneyQuest: (id) =>
        set((state) => ({
          dailyMoneyQuests: state.dailyMoneyQuests.map((quest) =>
            quest.id === id
              ? {
                  ...quest,
                  completed: true,
                }
              : quest,
          ),
        })),
    }),
    {
      name: 'lifequest-money',
      version: 2,
      partialize: (state) => ({
        snapshot: state.snapshot,
        dailyMoneyQuests: state.dailyMoneyQuests,
      }),
    },
  ),
)
