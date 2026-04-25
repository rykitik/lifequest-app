import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getMockMoneyActions, getMockMoneySnapshot } from '@/services/mockData'
import { mergePersistedState } from '@/shared/lib/persist'
import type { MoneyAction, MoneySnapshot } from '@/shared/types'

interface MoneyState {
  snapshot: MoneySnapshot
  dailyMoneyQuests: MoneyAction[]
  saveSnapshot: (input: Partial<MoneySnapshot>) => void
  completeMoneyQuest: (id: string) => void
  resetDemoData: () => void
}

type MoneyPersistedState = Pick<MoneyState, 'snapshot' | 'dailyMoneyQuests'>

function createMoneyPersistedState(): MoneyPersistedState {
  return {
    snapshot: getMockMoneySnapshot(),
    dailyMoneyQuests: getMockMoneyActions(),
  }
}

export const useMoneyStore = create<MoneyState>()(
  persist(
    (set) => ({
      ...createMoneyPersistedState(),
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
      resetDemoData: () =>
        set({
          ...createMoneyPersistedState(),
        }),
    }),
    {
      name: 'lifequest-money',
      version: 3,
      migrate: (persistedState) =>
        mergePersistedState(createMoneyPersistedState(), persistedState) as MoneyPersistedState,
      partialize: (state) => ({
        snapshot: state.snapshot,
        dailyMoneyQuests: state.dailyMoneyQuests,
      }),
    },
  ),
)
