import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { cloneData, getMockTodayRoute, mockModes } from '@/services/mockData'
import { generateRouteFromQuests, getRouteCandidatesForSlot } from '@/services/routeBuilder'
import { mergePersistedState } from '@/shared/lib/persist'
import type { ModeKey, QuestItem, TodayRoute, TodayRouteKey } from '@/shared/types'

interface TodayState {
  currentMode: ModeKey
  modes: typeof mockModes
  route: TodayRoute
  setMode: (mode: ModeKey) => void
  generateRoute: () => void
  generateRouteFromAvailableQuests: (quests: QuestItem[]) => void
  setRouteQuest: (item: TodayRouteKey, quest: TodayRoute[TodayRouteKey]) => void
  clearRouteItem: (item: TodayRouteKey) => void
  removeQuestFromRoute: (questId: string) => void
  completeRouteItem: (item: TodayRouteKey) => void
  syncRouteQuest: (quest: NonNullable<TodayRoute[TodayRouteKey]>) => void
  resetDemoData: () => void
}

type TodayPersistedState = Pick<TodayState, 'currentMode' | 'route'>

const routeKeys: TodayRouteKey[] = ['mainQuest', 'quickWin', 'recoveryQuest']

function createTodayPersistedState(): TodayPersistedState {
  return {
    currentMode: 'stable',
    route: getMockTodayRoute(),
  }
}

function cloneQuestOrNull(quest: TodayRoute[TodayRouteKey]) {
  return quest ? cloneData(quest) : null
}

function isSameQuest(left: TodayRoute[TodayRouteKey], right: TodayRoute[TodayRouteKey]) {
  return left?.id === right?.id && left?.status === right?.status && left?.progress === right?.progress
}

function isSameRoute(left: TodayRoute, right: TodayRoute) {
  return routeKeys.every((key) => isSameQuest(left[key], right[key]))
}

export const useTodayStore = create<TodayState>()(
  persist(
    (set) => ({
      ...createTodayPersistedState(),
      modes: mockModes,
      setMode: (mode) =>
        set({
          currentMode: mode,
        }),
      generateRoute: () =>
        set((state) => {
          const fallbackRoute = getMockTodayRoute()
          const nextRoute = {
            mainQuest: state.route.mainQuest ?? fallbackRoute.mainQuest,
            quickWin: state.route.quickWin ?? fallbackRoute.quickWin,
            recoveryQuest: state.route.recoveryQuest ?? fallbackRoute.recoveryQuest,
          }

          if (isSameRoute(state.route, nextRoute)) {
            return state
          }

          return {
            route: nextRoute,
          }
        }),
      generateRouteFromAvailableQuests: (quests) =>
        set((state) => {
          const availableQuests = quests.filter((quest) => quest.status !== 'complete')

          if (!availableQuests.length) {
            return state
          }

          const hasExistingRoute = routeKeys.some((key) => state.route[key])

          if (!hasExistingRoute) {
            const generatedRoute = generateRouteFromQuests(availableQuests, state.currentMode)

            return {
              route: {
                mainQuest: cloneQuestOrNull(generatedRoute.mainQuest),
                quickWin: cloneQuestOrNull(generatedRoute.quickWin),
                recoveryQuest: cloneQuestOrNull(generatedRoute.recoveryQuest),
              },
            }
          }

          const occupiedIds = new Set(
            routeKeys
              .map((key) => state.route[key]?.id)
              .filter((value): value is string => Boolean(value)),
          )
          const nextRoute: TodayRoute = {
            mainQuest: state.route.mainQuest,
            quickWin: state.route.quickWin,
            recoveryQuest: state.route.recoveryQuest,
          }

          routeKeys.forEach((key) => {
            if (nextRoute[key]) {
              return
            }

            const candidate = getRouteCandidatesForSlot(
              availableQuests,
              key,
              state.currentMode,
              Array.from(occupiedIds),
            )[0]

            if (!candidate) {
              return
            }

            occupiedIds.add(candidate.id)
            nextRoute[key] = cloneData(candidate)
          })

          if (isSameRoute(state.route, nextRoute)) {
            return state
          }

          return {
            route: nextRoute,
          }
        }),
      setRouteQuest: (item, quest) =>
        set((state) => {
          if (state.route[item]?.id === quest?.id) {
            return state
          }

          const nextRoute: TodayRoute = {
            mainQuest: state.route.mainQuest,
            quickWin: state.route.quickWin,
            recoveryQuest: state.route.recoveryQuest,
          }

          if (!quest) {
            nextRoute[item] = null

            return { route: nextRoute }
          }

          routeKeys.forEach((key) => {
            if (nextRoute[key]?.id === quest.id) {
              nextRoute[key] = null
            }
          })

          nextRoute[item] = cloneData(quest)

          return {
            route: nextRoute,
          }
        }),
      clearRouteItem: (item) =>
        set((state) => {
          if (!state.route[item]) {
            return state
          }

          return {
            route: {
              ...state.route,
              [item]: null,
            },
          }
        }),
      removeQuestFromRoute: (questId) =>
        set((state) => {
          let hasChanges = false
          const nextRoute = routeKeys.reduce<TodayRoute>((accumulator, key) => {
            if (state.route[key]?.id === questId) {
              hasChanges = true

              return {
                ...accumulator,
                [key]: null,
              }
            }

            return {
              ...accumulator,
              [key]: state.route[key],
            }
          }, state.route)

          return hasChanges ? { route: nextRoute } : state
        }),
      syncRouteQuest: (quest) =>
        set((state) => {
          let hasChanges = false
          const nextRoute = routeKeys.reduce<TodayRoute>((accumulator, key) => {
            if (state.route[key]?.id === quest.id) {
              hasChanges = true

              return {
                ...accumulator,
                [key]: cloneData(quest),
              }
            }

            return {
              ...accumulator,
              [key]: state.route[key],
            }
          }, state.route)

          return hasChanges ? { route: nextRoute } : state
        }),
      completeRouteItem: (item) =>
        set((state) => {
          const currentQuest = state.route[item]

          if (!currentQuest || currentQuest.status === 'complete') {
            return state
          }

          return {
            route: {
              ...state.route,
              [item]: {
                ...currentQuest,
                status: 'complete',
                progress: 100,
              },
            },
          }
        }),
      resetDemoData: () =>
        set({
          ...createTodayPersistedState(),
        }),
    }),
    {
      name: 'lifequest-today',
      version: 4,
      migrate: (persistedState) =>
        mergePersistedState(createTodayPersistedState(), persistedState) as TodayPersistedState,
      partialize: (state) => ({
        currentMode: state.currentMode,
        route: state.route,
      }),
    },
  ),
)
