import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  createQuestSteps,
  getMockQuestActive,
  getMockQuestInbox,
  getMockQuestParked,
} from '@/services/mockData'
import { mergePersistedState } from '@/shared/lib/persist'
import type { QuestClassification, QuestItem } from '@/shared/types'
import { useTodayStore } from '@/stores/useTodayStore'

interface QuestState {
  inbox: QuestItem[]
  active: QuestItem[]
  parked: QuestItem[]
  addQuest: (title: string) => void
  updateQuestTitle: (id: string, title: string) => void
  deleteQuest: (id: string) => void
  classifyQuest: (id: string, classification: QuestClassification) => void
  unpackQuest: (id: string) => void
  toggleQuestStep: (questId: string, stepId: string) => QuestItem | null
  completeQuest: (id: string) => void
  resetDemoData: () => void
}

type QuestBucket = 'inbox' | 'active' | 'parked'
type QuestPersistedState = Pick<QuestState, 'inbox' | 'active' | 'parked'>

const questBuckets: QuestBucket[] = ['inbox', 'active', 'parked']

function createQuestPersistedState(): QuestPersistedState {
  return {
    inbox: getMockQuestInbox(),
    active: getMockQuestActive(),
    parked: getMockQuestParked(),
  }
}

function locateQuest(state: Pick<QuestState, QuestBucket>, id: string) {
  for (const bucket of questBuckets) {
    const quest = state[bucket].find((item) => item.id === id)

    if (quest) {
      return { bucket, quest }
    }
  }

  return null
}

function replaceQuest(items: QuestItem[], id: string, updater: (quest: QuestItem) => QuestItem) {
  return items.map((quest) => (quest.id === id ? updater(quest) : quest))
}

function updateQuestCollections(
  state: Pick<QuestState, QuestBucket>,
  id: string,
  updater: (quest: QuestItem, bucket: QuestBucket) => QuestItem,
) {
  let updatedQuest: QuestItem | null = null

  const nextState = questBuckets.reduce<Pick<QuestState, QuestBucket>>(
    (accumulator, bucket) => ({
      ...accumulator,
      [bucket]: replaceQuest(state[bucket], id, (quest) => {
        const nextQuest = updater(quest, bucket)

        if (nextQuest !== quest) {
          updatedQuest = nextQuest
        }

        return nextQuest
      }),
    }),
    {
      inbox: state.inbox,
      active: state.active,
      parked: state.parked,
    },
  )

  return { nextState, updatedQuest }
}

function syncTodayRouteQuest(quest: QuestItem) {
  useTodayStore.getState().syncRouteQuest(quest)
}

function resolveSectorFromClassification(quest: QuestItem, classification: QuestClassification) {
  switch (classification) {
    case 'focus':
    case 'quick_win':
      return 'focus'
    case 'body':
      return 'body'
    case 'money':
      return 'money'
    case 'stability':
      return 'stability'
    case 'later':
    default:
      return quest.sector
  }
}

export const useQuestStore = create<QuestState>()(
  persist(
    (set) => ({
      ...createQuestPersistedState(),
      addQuest: (title) =>
        set((state) => {
          const trimmed = title.trim()

          if (!trimmed) {
            return state
          }

          const newQuest: QuestItem = {
            id: crypto.randomUUID(),
            title: trimmed,
            subtitle: 'Быстро захвачено. Уточни тип позже, когда шум станет тише.',
            minutes: 10,
            xp: 12,
            sector: 'focus',
            progress: 0,
            status: 'ready',
            classification: 'focus',
          }

          return {
            inbox: [newQuest, ...state.inbox],
          }
        }),
      updateQuestTitle: (id, title) =>
        set((state) => {
          const trimmed = title.trim()

          if (!trimmed) {
            return state
          }

          const { nextState, updatedQuest } = updateQuestCollections(state, id, (quest) =>
            quest.title === trimmed
              ? quest
              : {
                  ...quest,
                  title: trimmed,
                },
          )

          if (updatedQuest) {
            syncTodayRouteQuest(updatedQuest)
          }

          return updatedQuest ? nextState : state
        }),
      deleteQuest: (id) => {
        const located = locateQuest(useQuestStore.getState(), id)

        if (!located) {
          return
        }

        useTodayStore.getState().removeQuestFromRoute(id)

        set((state) => ({
          inbox: state.inbox.filter((quest) => quest.id !== id),
          active: state.active.filter((quest) => quest.id !== id),
          parked: state.parked.filter((quest) => quest.id !== id),
        }))
      },
      classifyQuest: (id, classification) =>
        set((state) => {
          const located = locateQuest(state, id)

          if (!located) {
            return state
          }

          const filtered = {
            inbox: state.inbox.filter((quest) => quest.id !== id),
            active: state.active.filter((quest) => quest.id !== id),
            parked: state.parked.filter((quest) => quest.id !== id),
          }
          const destinationBucket: QuestBucket = classification === 'later' ? 'parked' : 'active'
          const nextStatus =
            located.quest.status === 'complete'
              ? 'complete'
              : classification === 'later'
                ? 'parked'
                : 'active'
          const nextSector = resolveSectorFromClassification(located.quest, classification)

          if (
            located.quest.classification === classification &&
            located.quest.status === nextStatus &&
            located.quest.sector === nextSector
          ) {
            return state
          }

          const updatedQuest: QuestItem = {
            ...located.quest,
            classification,
            sector: nextSector,
            status: nextStatus,
          }

          syncTodayRouteQuest(updatedQuest)

          return {
            ...filtered,
            [destinationBucket]: [updatedQuest, ...filtered[destinationBucket]],
          }
        }),
      unpackQuest: (id) => {
        let updatedQuest: QuestItem | null = null

        set((state) => {
          const { nextState, updatedQuest: nextQuest } = updateQuestCollections(state, id, (quest) =>
            quest.steps?.length
              ? quest
              : {
                  ...quest,
                  steps: createQuestSteps(quest.title),
                },
          )

          updatedQuest = nextQuest

          return updatedQuest ? nextState : state
        })

        if (updatedQuest) {
          syncTodayRouteQuest(updatedQuest)
        }
      },
      toggleQuestStep: (questId, stepId) => {
        let updatedQuest: QuestItem | null = null

        set((state) => {
          const { nextState, updatedQuest: nextQuest } = updateQuestCollections(
            state,
            questId,
            (quest, bucket) => {
              if (!quest.steps?.length || quest.status === 'complete') {
                return quest
              }

              const steps = quest.steps.map((step) =>
                step.id === stepId
                  ? {
                      ...step,
                      done: !step.done,
                    }
                  : step,
              )
              const doneSteps = steps.filter((step) => step.done).length
              const allDone = doneSteps === steps.length

              return {
                ...quest,
                steps,
                progress: allDone ? 100 : Math.round((doneSteps / steps.length) * 100),
                status: allDone ? 'complete' : bucket === 'parked' ? 'parked' : 'active',
              }
            },
          )

          updatedQuest = nextQuest

          return nextState
        })

        if (updatedQuest) {
          syncTodayRouteQuest(updatedQuest)
        }

        return updatedQuest
      },
      completeQuest: (id) =>
        set((state) => {
          let updatedQuest: QuestItem | null = null

          const { nextState } = updateQuestCollections(state, id, (quest) => {
            if (quest.status === 'complete') {
              return quest
            }

            const nextQuest: QuestItem = {
              ...quest,
              status: 'complete',
              progress: 100,
              steps: quest.steps?.map((step) => ({
                ...step,
                done: true,
              })),
            }

            updatedQuest = nextQuest

            return nextQuest
          })

          if (updatedQuest) {
            syncTodayRouteQuest(updatedQuest)
          }

          return updatedQuest ? nextState : state
        }),
      resetDemoData: () =>
        set({
          ...createQuestPersistedState(),
        }),
    }),
    {
      name: 'lifequest-quests',
      version: 4,
      migrate: (persistedState) =>
        mergePersistedState(createQuestPersistedState(), persistedState) as QuestPersistedState,
      partialize: (state) => ({
        inbox: state.inbox,
        active: state.active,
        parked: state.parked,
      }),
    },
  ),
)
