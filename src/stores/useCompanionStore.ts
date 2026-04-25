import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { companionMessages } from '@/services/mockData'
import type { CompanionContext, CompanionProfile, CompanionState } from '@/shared/types'

interface CompanionStateStore extends CompanionProfile {
  setActiveMessage: (message: string) => void
  updateMoodFromContext: (context: CompanionContext) => void
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
    (set) => ({
      mood: 'idle',
      evolutionLevel: 7,
      activeMessage: companionMessages.idle,
      stabilityScore: 72,
      setActiveMessage: (message) =>
        set({
          activeMessage: message,
        }),
      updateMoodFromContext: (context) => {
        const mood = resolveMood(context)

        set({
          mood,
          evolutionLevel: context.level,
          stabilityScore: context.stability,
          activeMessage: companionMessages[mood],
        })
      },
    }),
    {
      name: 'lifequest-companion',
      version: 2,
      partialize: (state) => ({
        mood: state.mood,
        evolutionLevel: state.evolutionLevel,
        activeMessage: state.activeMessage,
        stabilityScore: state.stabilityScore,
      }),
    },
  ),
)
