import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getMockPromptCards } from '@/services/mockData'
import { buildPrompt } from '@/services/promptBuilder'
import type { PromptCard, PromptContext } from '@/shared/types'

interface PromptCenterState {
  isOpen: boolean
  cards: PromptCard[]
  selectedCard: PromptCard | null
  generatedPrompt: string
  userRequest: string
  preferredResponseFormat: string
  hasCopied: boolean
  setSelectedCard: (cardId: string) => void
  setUserRequest: (value: string) => void
  setResponseFormat: (value: string) => void
  generatePrompt: (context: PromptContext) => void
  copyPrompt: () => Promise<boolean>
  openChatGPT: () => void
  openPromptCenter: () => void
  closePromptCenter: () => void
}

const cards = getMockPromptCards()

export const usePromptCenterStore = create<PromptCenterState>()(
  persist(
    (set, get) => ({
      isOpen: false,
      cards,
      selectedCard: cards[0] ?? null,
      generatedPrompt: '',
      userRequest: cards[0]?.promptHint ?? '',
      preferredResponseFormat:
        cards[0]?.preferredFormat ?? 'Короткий маршрут, где лучший следующий шаг идёт первым',
      hasCopied: false,
      setSelectedCard: (cardId) => {
        const nextCard = get().cards.find((card) => card.id === cardId)

        if (!nextCard) {
          return
        }

        set({
          selectedCard: nextCard,
          userRequest: nextCard.promptHint,
          preferredResponseFormat: nextCard.preferredFormat,
          hasCopied: false,
        })
      },
      setUserRequest: (value) =>
        set({
          userRequest: value,
          hasCopied: false,
        }),
      setResponseFormat: (value) =>
        set({
          preferredResponseFormat: value,
          hasCopied: false,
        }),
      generatePrompt: (context) => {
        const selectedCard = get().selectedCard

        if (!selectedCard) {
          return
        }

        set({
          generatedPrompt: buildPrompt(selectedCard, {
            ...context,
            userRequest: get().userRequest,
            preferredResponseFormat: get().preferredResponseFormat,
          }),
          hasCopied: false,
        })
      },
      copyPrompt: async () => {
        const prompt = get().generatedPrompt

        if (!prompt) {
          return false
        }

        await navigator.clipboard.writeText(prompt)

        set({
          hasCopied: true,
        })

        return true
      },
      openChatGPT: () => {
        window.open('https://chatgpt.com', '_blank', 'noopener,noreferrer')
      },
      openPromptCenter: () =>
        set({
          isOpen: true,
        }),
      closePromptCenter: () =>
        set({
          isOpen: false,
        }),
    }),
    {
      name: 'lifequest-prompt-center',
      version: 2,
      partialize: (state) => ({
        selectedCard: state.selectedCard,
        generatedPrompt: state.generatedPrompt,
        userRequest: state.userRequest,
        preferredResponseFormat: state.preferredResponseFormat,
        hasCopied: state.hasCopied,
      }),
    },
  ),
)
