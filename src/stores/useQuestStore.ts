import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  createQuestSteps,
  getMockQuestActive,
  getMockQuestInbox,
  getMockQuestParked,
} from '@/services/mockData'
import type { QuestClassification, QuestItem } from '@/shared/types'

interface QuestState {
  inbox: QuestItem[]
  active: QuestItem[]
  parked: QuestItem[]
  addQuest: (title: string) => void
  classifyQuest: (id: string, classification: QuestClassification) => void
  unpackQuest: (id: string) => void
  completeQuest: (id: string) => void
}

type QuestBucket = 'inbox' | 'active' | 'parked'

function locateQuest(state: Pick<QuestState, QuestBucket>, id: string) {
  const buckets: QuestBucket[] = ['inbox', 'active', 'parked']

  for (const bucket of buckets) {
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

export const useQuestStore = create<QuestState>()(
  persist(
    (set) => ({
      inbox: getMockQuestInbox(),
      active: getMockQuestActive(),
      parked: getMockQuestParked(),
      addQuest: (title) =>
        set((state) => {
          const trimmed = title.trim()

          if (!trimmed) {
            return state
          }

          const newQuest: QuestItem = {
            id: crypto.randomUUID(),
            title: trimmed,
            subtitle: 'Быстро захвачено. Классифицируй позже, когда поверхность станет тише.',
            minutes: 10,
            xp: 12,
            sector: 'focus',
            progress: 0,
            status: 'ready',
          }

          return {
            inbox: [newQuest, ...state.inbox],
          }
        }),
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

          const updatedQuest: QuestItem = {
            ...located.quest,
            classification,
            status: classification === 'later' ? 'parked' : 'active',
          }

          if (classification === 'later') {
            return {
              ...filtered,
              parked: [updatedQuest, ...filtered.parked],
            }
          }

          return {
            ...filtered,
            active: [updatedQuest, ...filtered.active],
          }
        }),
      unpackQuest: (id) =>
        set((state) => ({
          inbox: replaceQuest(state.inbox, id, (quest) => ({
            ...quest,
            steps: quest.steps ?? createQuestSteps(quest.title),
          })),
          active: replaceQuest(state.active, id, (quest) => ({
            ...quest,
            steps: quest.steps ?? createQuestSteps(quest.title),
          })),
          parked: replaceQuest(state.parked, id, (quest) => ({
            ...quest,
            steps: quest.steps ?? createQuestSteps(quest.title),
          })),
        })),
      completeQuest: (id) =>
        set((state) => ({
          inbox: replaceQuest(state.inbox, id, (quest) => ({
            ...quest,
            status: 'complete',
            progress: 100,
          })),
          active: replaceQuest(state.active, id, (quest) => ({
            ...quest,
            status: 'complete',
            progress: 100,
          })),
          parked: replaceQuest(state.parked, id, (quest) => ({
            ...quest,
            status: 'complete',
            progress: 100,
          })),
        })),
    }),
    {
      name: 'lifequest-quests',
      version: 2,
      partialize: (state) => ({
        inbox: state.inbox,
        active: state.active,
        parked: state.parked,
      }),
    },
  ),
)
