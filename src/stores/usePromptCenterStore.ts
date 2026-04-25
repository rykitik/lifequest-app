import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getMockPromptCards } from '@/services/mockData'
import { buildPrompt } from '@/services/promptBuilder'
import { mergePersistedState } from '@/shared/lib/persist'
import type { PromptCard, PromptContext } from '@/shared/types'

interface PromptCenterState {
  isOpen: boolean
  cards: PromptCard[]
  selectedCardId: string | null
  generatedPrompt: string
  userRequest: string
  preferredResponseFormat: string
  hasCopied: boolean
  showCopyFallback: boolean
  setSelectedCard: (cardId: string) => void
  setUserRequest: (value: string) => void
  setResponseFormat: (value: string) => void
  generatePrompt: (context: PromptContext) => void
  copyPrompt: () => Promise<boolean>
  openChatGPT: () => void
  openPromptCenter: () => void
  closePromptCenter: () => void
  resetDemoData: () => void
}

const cards = getMockPromptCards()

type PromptCenterPersistedState = Pick<
  PromptCenterState,
  'selectedCardId' | 'userRequest' | 'preferredResponseFormat'
>

function getDefaultPromptCard() {
  return cards[0] ?? null
}

function createPromptCenterPersistedState(): PromptCenterPersistedState {
  const defaultCard = getDefaultPromptCard()

  return {
    selectedCardId: defaultCard?.id ?? null,
    userRequest: defaultCard?.promptHint ?? '',
    preferredResponseFormat:
      defaultCard?.preferredFormat ?? 'Короткий маршрут, где лучший следующий шаг идёт первым',
  }
}

export const usePromptCenterStore = create<PromptCenterState>()(
  persist(
    (set, get) => ({
      isOpen: false,
      cards,
      ...createPromptCenterPersistedState(),
      generatedPrompt: '',
      hasCopied: false,
      showCopyFallback: false,
      setSelectedCard: (cardId) => {
        const nextCard = get().cards.find((card) => card.id === cardId)

        if (!nextCard || get().selectedCardId === nextCard.id) {
          return
        }

        set({
          selectedCardId: nextCard.id,
          userRequest: nextCard.promptHint,
          preferredResponseFormat: nextCard.preferredFormat,
          generatedPrompt: '',
          hasCopied: false,
          showCopyFallback: false,
        })
      },
      setUserRequest: (value) =>
        set((state) => {
          if (
            state.userRequest === value &&
            !state.generatedPrompt &&
            !state.hasCopied &&
            !state.showCopyFallback
          ) {
            return state
          }

          return {
            userRequest: value,
            generatedPrompt: '',
            hasCopied: false,
            showCopyFallback: false,
          }
        }),
      setResponseFormat: (value) =>
        set((state) => {
          if (
            state.preferredResponseFormat === value &&
            !state.generatedPrompt &&
            !state.hasCopied &&
            !state.showCopyFallback
          ) {
            return state
          }

          return {
            preferredResponseFormat: value,
            generatedPrompt: '',
            hasCopied: false,
            showCopyFallback: false,
          }
        }),
      generatePrompt: (context) => {
        const selectedCard =
          get().cards.find((card) => card.id === get().selectedCardId) ?? get().cards[0]

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
          showCopyFallback: false,
        })
      },
      copyPrompt: async () => {
        const prompt = get().generatedPrompt

        if (!prompt) {
          return false
        }

        if (!navigator.clipboard?.writeText) {
          set({
            hasCopied: false,
            showCopyFallback: true,
          })

          return false
        }

        try {
          await navigator.clipboard.writeText(prompt)
        } catch {
          set({
            hasCopied: false,
            showCopyFallback: true,
          })

          return false
        }

        set({
          hasCopied: true,
          showCopyFallback: false,
        })

        return true
      },
      openChatGPT: () => {
        window.open('https://chatgpt.com', '_blank', 'noopener,noreferrer')
      },
      openPromptCenter: () =>
        set((state) => (state.isOpen ? state : { isOpen: true })),
      closePromptCenter: () =>
        set((state) => {
          if (!state.isOpen && !state.hasCopied && !state.showCopyFallback) {
            return state
          }

          return {
            isOpen: false,
            hasCopied: false,
            showCopyFallback: false,
          }
        }),
      resetDemoData: () =>
        set({
          ...createPromptCenterPersistedState(),
          generatedPrompt: '',
          hasCopied: false,
          showCopyFallback: false,
        }),
    }),
    {
      name: 'lifequest-prompt-center',
      version: 3,
      migrate: (persistedState) => {
        const defaults = createPromptCenterPersistedState()

        if (!persistedState || typeof persistedState !== 'object') {
          return defaults
        }

        const record = persistedState as Record<string, unknown>
        const legacySelectedCard =
          record.selectedCard && typeof record.selectedCard === 'object'
            ? (record.selectedCard as { id?: string }).id
            : undefined

        return mergePersistedState(defaults, {
          ...record,
          selectedCardId:
            typeof record.selectedCardId === 'string' ? record.selectedCardId : legacySelectedCard,
        }) as PromptCenterPersistedState
      },
      partialize: (state) => ({
        selectedCardId: state.selectedCardId,
        userRequest: state.userRequest,
        preferredResponseFormat: state.preferredResponseFormat,
      }),
    },
  ),
)
