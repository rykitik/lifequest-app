import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getMockTodayRoute, mockModes } from '@/services/mockData'
import type { ModeKey, TodayRoute, TodayRouteKey } from '@/shared/types'

interface TodayState {
  currentMode: ModeKey
  modes: typeof mockModes
  route: TodayRoute
  setMode: (mode: ModeKey) => void
  generateRoute: () => void
  completeRouteItem: (item: TodayRouteKey) => void
}

export const useTodayStore = create<TodayState>()(
  persist(
    (set, get) => ({
      currentMode: 'stable',
      modes: mockModes,
      route: getMockTodayRoute(),
      setMode: (mode) => {
        set({ currentMode: mode })
        get().generateRoute()
      },
      generateRoute: () =>
        set((state) => {
          const route = getMockTodayRoute()

          if (state.currentMode === 'low') {
            route.mainQuest.progress = 40
            route.recoveryQuest.title = 'Сохранить базу через 2 минуты восстановления'
            route.recoveryQuest.subtitle = 'Вода, дыхание, потом возвращайся только если стало легче.'
          }

          if (state.currentMode === 'high') {
            route.mainQuest.xp += 8
            route.quickWin.title = 'Закрыть одну админ-петлю, пока фокус чистый'
          }

          if (state.currentMode === 'drifted') {
            route.quickWin.title = 'Закрыть один отвлекающий таб и вернуть рабочую поверхность'
            route.recoveryQuest.xp += 5
          }

          return { route }
        }),
      completeRouteItem: (item) =>
        set((state) => ({
          route: {
            ...state.route,
            [item]: {
              ...state.route[item],
              status: 'complete',
              progress: 100,
            },
          },
        })),
    }),
    {
      name: 'lifequest-today',
      version: 2,
      partialize: (state) => ({
        currentMode: state.currentMode,
        route: state.route,
      }),
    },
  ),
)
