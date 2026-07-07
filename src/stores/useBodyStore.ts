import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getMockBodyDailyLogs, getMockBodyHistory, getMockBodySnapshot } from '@/services/mockData'
import { getLocalDateKey } from '@/shared/lib/date'
import { mergePersistedState } from '@/shared/lib/persist'
import type {
  BodyDailyLog,
  BodyMovementType,
  BodyNutritionStatus,
  BodySnapshot,
} from '@/shared/types'

interface BodyCheckinInput {
  weightKg?: number
  waterLiters?: number
  steps?: number
  workout?: string
  workoutDone?: boolean
  foodDiscipline?: number
  nutritionStatus?: BodyNutritionStatus
  movementType?: BodyMovementType
}

interface BodyState {
  today: BodySnapshot
  history: number[]
  dailyLogs: BodyDailyLog[]
  saveCheckin: (input: BodyCheckinInput) => void
  ensureTodayBodySnapshot: (dateKey?: string) => void
  resetDemoData: () => void
}

type BodyPersistedState = Pick<BodyState, 'today' | 'history' | 'dailyLogs'>

function createDailyLogFromSnapshot(snapshot: BodySnapshot): BodyDailyLog {
  return {
    date: snapshot.date,
    weightKg: snapshot.weightKg,
    waterLiters: snapshot.waterLiters,
    steps: snapshot.steps,
    workoutDone: snapshot.workoutDone,
    workout: snapshot.workout,
    nutritionStatus: snapshot.nutritionStatus,
    movementType: snapshot.movementType,
  }
}

function upsertDailyLog(logs: BodyDailyLog[], log: BodyDailyLog) {
  const existingIndex = logs.findIndex((item) => item.date === log.date)

  if (existingIndex === -1) {
    return [...logs, log]
  }

  return logs.map((item, index) => (index === existingIndex ? log : item))
}

function createBodyPersistedState(): BodyPersistedState {
  return {
    today: getMockBodySnapshot(),
    history: getMockBodyHistory(),
    dailyLogs: getMockBodyDailyLogs(),
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
      ensureTodayBodySnapshot: (dateKey = getLocalDateKey()) =>
        set((state) => {
          if (state.today.date === dateKey) {
            return state
          }

          const previousLog = createDailyLogFromSnapshot(state.today)

          return {
            today: {
              ...state.today,
              date: dateKey,
              waterLiters: 0,
              steps: 0,
              workout: 'Не выбрано',
              workoutDone: false,
              foodDiscipline: 0,
              nutritionStatus: 'Не выбрано',
              movementType: 'Не выбрано',
            },
            dailyLogs: upsertDailyLog(state.dailyLogs, previousLog),
          }
        }),
      resetDemoData: () =>
        set({
          ...createBodyPersistedState(),
        }),
    }),
    {
      name: 'lifequest-body',
      version: 5,
      migrate: (persistedState) =>
        mergePersistedState(createBodyPersistedState(), persistedState) as BodyPersistedState,
      partialize: (state) => ({
        today: state.today,
        history: state.history,
        dailyLogs: state.dailyLogs,
      }),
    },
  ),
)
