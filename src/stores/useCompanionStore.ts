import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { companionMessages } from '@/services/mockData'
import { mergePersistedState } from '@/shared/lib/persist'
import type { CompanionContext, CompanionProfile, CompanionState } from '@/shared/types'

interface CompanionReaction {
  id: number
  message: string
}

interface CompanionStateStore extends CompanionProfile {
  reaction: CompanionReaction | null
  setActiveMessage: (message: string) => void
  triggerProgressReaction: (message: string) => void
  updateMoodFromContext: (context: CompanionContext) => void
  resetDemoData: () => void
}

type CompanionPersistedState = CompanionProfile

function createCompanionPersistedState(): CompanionPersistedState {
  return {
    mood: 'idle',
    evolutionLevel: 7,
    activeMessage: companionMessages.idle,
    stabilityScore: 72,
  }
}

function resolveMood(context: CompanionContext): CompanionState {
  if (context.level >= 10 && context.mode === 'high') {
    return 'evolving'
  }

  if (context.isRecovering) {
    return 'recovering'
  }

  if (context.mode === 'high') {
    return 'focused'
  }

  if (context.mode === 'low') {
    return 'low_energy'
  }

  if (context.mode === 'drifted') {
    return 'overloaded'
  }

  return 'idle'
}

export const useCompanionStore = create<CompanionStateStore>()(
  persist(
    (set, get) => ({
      ...createCompanionPersistedState(),
      reaction: null,
      setActiveMessage: (message) =>
        set({
          activeMessage: message,
        }),
      triggerProgressReaction: (message) =>
        set((state) => ({
          reaction: {
            id: (state.reaction?.id ?? 0) + 1,
            message,
          },
        })),
      updateMoodFromContext: (context) => {
        const mood = resolveMood(context)
        const currentState = get()

        set({
          mood,
          evolutionLevel: context.level,
          stabilityScore: context.stability,
          activeMessage:
            currentState.mood === mood ? currentState.activeMessage : companionMessages[mood],
        })
      },
      resetDemoData: () =>
        set({
          ...createCompanionPersistedState(),
          reaction: null,
        }),
    }),
    {
      name: 'lifequest-companion',
      version: 3,
      migrate: (persistedState) =>
        mergePersistedState(
          createCompanionPersistedState(),
          persistedState,
        ) as CompanionPersistedState,
      partialize: (state) => ({
        mood: state.mood,
        evolutionLevel: state.evolutionLevel,
        activeMessage: state.activeMessage,
        stabilityScore: state.stabilityScore,
      }),
    },
  ),
)
