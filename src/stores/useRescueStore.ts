import { create } from 'zustand'
import { buildRescueSuggestion, cloneData, mockRescueProblems } from '@/services/mockData'
import type { RescueProblem, RescueSuggestion } from '@/shared/types'

interface RescueState {
  isOpen: boolean
  currentProblem: RescueProblem | null
  suggestion: RescueSuggestion | null
  accepted: boolean
  completed: boolean
  setProblem: (problemId: string) => void
  generateSuggestion: () => void
  acceptSuggestion: () => void
  completeSuggestion: () => void
  openRescue: () => void
  closeRescue: () => void
  resetRescueState: () => void
}

function createRescueState() {
  return {
    isOpen: false,
    currentProblem: mockRescueProblems[0] ? cloneData(mockRescueProblems[0]) : null,
    suggestion: mockRescueProblems[0] ? buildRescueSuggestion(mockRescueProblems[0]) : null,
    accepted: false,
    completed: false,
  }
}

export const useRescueStore = create<RescueState>()((set, get) => ({
  ...createRescueState(),
  setProblem: (problemId) => {
    const nextProblem = mockRescueProblems.find((problem) => problem.id === problemId)

    if (!nextProblem) {
      return
    }

    set({
      currentProblem: cloneData(nextProblem),
      accepted: false,
      completed: false,
    })

    get().generateSuggestion()
  },
  generateSuggestion: () =>
    set((state) => ({
      suggestion: state.currentProblem ? buildRescueSuggestion(state.currentProblem) : null,
    })),
  acceptSuggestion: () =>
    set({
      accepted: true,
    }),
  completeSuggestion: () =>
    set({
      completed: true,
      isOpen: false,
    }),
  openRescue: () =>
    set({
      isOpen: true,
      accepted: false,
      completed: false,
    }),
  closeRescue: () =>
    set({
      isOpen: false,
    }),
  resetRescueState: () =>
    set({
      ...createRescueState(),
    }),
}))
