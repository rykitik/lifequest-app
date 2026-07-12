import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getMockPromptCards } from '@/services/mockData'
import { buildPrompt } from '@/services/promptBuilder'
import { parsePromptResponse } from '@/services/promptResponseParser'
import { mergePersistedState } from '@/shared/lib/persist'
import type { LifeQuestPromptResponse, PromptCard } from '@/shared/types'
import { useCompanionStore } from '@/stores/useCompanionStore'
import { useQuestStore } from '@/stores/useQuestStore'

interface PromptCenterState {
  isOpen: boolean
  cards: PromptCard[]
  selectedCardId: string | null
  generatedPrompt: string
  userRequest: string
  preferredResponseFormat: string
  hasCopied: boolean
  showCopyFallback: boolean
  importedResponseText: string
  parsedResponse: LifeQuestPromptResponse | null
  parseError: string | null
  applyMessage: string | null
  lastAppliedResponseAt: string | null
  selectedSuggestedActionIndexes: number[]
  shouldApplyCoreMessage: boolean
  setSelectedCard: (cardId: string) => void
  setUserRequest: (value: string) => void
  setResponseFormat: (value: string) => void
  generatePrompt: () => void
  copyPrompt: () => Promise<boolean>
  openChatGPT: () => void
  setImportedResponseText: (text: string) => void
  parseImportedResponse: () => void
  clearImportedResponse: () => void
  applyParsedResponse: () => void
  toggleSuggestedAction: (index: number) => void
  setSuggestedActionSelected: (index: number, value: boolean) => void
  toggleApplyCoreMessage: () => void
  setApplyCoreMessage: (value: boolean) => void
  selectAllSuggestedActions: () => void
  clearSuggestedActionSelection: () => void
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
      importedResponseText: '',
      parsedResponse: null,
      parseError: null,
      applyMessage: null,
      lastAppliedResponseAt: null,
      selectedSuggestedActionIndexes: [],
      shouldApplyCoreMessage: false,
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
          parsedResponse: null,
          parseError: null,
          applyMessage: null,
          selectedSuggestedActionIndexes: [],
          shouldApplyCoreMessage: false,
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
      generatePrompt: () => {
        const selectedCard =
          get().cards.find((card) => card.id === get().selectedCardId) ?? get().cards[0]

        if (!selectedCard) {
          return
        }

        set({
          generatedPrompt: buildPrompt(selectedCard, {
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
      setImportedResponseText: (text) =>
        set({
          importedResponseText: text,
          parsedResponse: null,
          parseError: null,
          applyMessage: null,
          selectedSuggestedActionIndexes: [],
          shouldApplyCoreMessage: false,
        }),
      parseImportedResponse: () => {
        const result = parsePromptResponse(get().importedResponseText)

        if (!result.ok) {
          set({
            parsedResponse: null,
            parseError: result.reason,
            applyMessage: null,
            selectedSuggestedActionIndexes: [],
            shouldApplyCoreMessage: false,
          })

          return
        }

        set({
          parsedResponse: result.data,
          parseError: null,
          applyMessage: 'Рекомендации готовы',
          selectedSuggestedActionIndexes: result.data.suggestedActions.map((_, index) => index),
          shouldApplyCoreMessage: Boolean(result.data.coreMessage),
        })
      },
      clearImportedResponse: () =>
        set({
          importedResponseText: '',
          parsedResponse: null,
          parseError: null,
          applyMessage: null,
          selectedSuggestedActionIndexes: [],
          shouldApplyCoreMessage: false,
        }),
      applyParsedResponse: () => {
        const parsedResponse = get().parsedResponse

        if (!parsedResponse) {
          set({
            applyMessage: 'Сначала разбери ответ ChatGPT.',
          })

          return
        }

        let appliedCount = 0
        let addedTaskCount = 0
        let coreMessageUpdated = false
        const selectedIndexes = new Set(get().selectedSuggestedActionIndexes)
        const selectedActions = parsedResponse.suggestedActions.filter((_, index) =>
          selectedIndexes.has(index),
        )

        selectedActions.forEach((action) => {
          useQuestStore.getState().addQuest(action.title)
          appliedCount += 1
          addedTaskCount += 1
        })

        if (get().shouldApplyCoreMessage && parsedResponse.coreMessage) {
          useCompanionStore.getState().setActiveMessage(parsedResponse.coreMessage)
          appliedCount += 1
          coreMessageUpdated = true
        }

        if (appliedCount === 0) {
          set({
            applyMessage: 'Ничего не применено. Нечего применять. Выбери хотя бы один пункт.',
          })

          return
        }

        set({
          lastAppliedResponseAt: new Date().toISOString(),
          applyMessage: [
            addedTaskCount === parsedResponse.suggestedActions.length &&
            coreMessageUpdated === Boolean(parsedResponse.coreMessage)
              ? 'Рекомендации применены'
              : 'Рекомендации применены частично',
            addedTaskCount ? `Добавлено задач: ${addedTaskCount}` : null,
            coreMessageUpdated ? 'Сообщение Ядра обновлено' : null,
          ]
            .filter(Boolean)
            .join('. '),
        })
      },
      toggleSuggestedAction: (index) =>
        set((state) => {
          const selected = state.selectedSuggestedActionIndexes.includes(index)

          return {
            selectedSuggestedActionIndexes: selected
              ? state.selectedSuggestedActionIndexes.filter((item) => item !== index)
              : [...state.selectedSuggestedActionIndexes, index].sort((left, right) => left - right),
            applyMessage: null,
          }
        }),
      setSuggestedActionSelected: (index, value) =>
        set((state) => {
          const selected = state.selectedSuggestedActionIndexes.includes(index)

          if (selected === value) {
            return state
          }

          return {
            selectedSuggestedActionIndexes: value
              ? [...state.selectedSuggestedActionIndexes, index].sort((left, right) => left - right)
              : state.selectedSuggestedActionIndexes.filter((item) => item !== index),
            applyMessage: null,
          }
        }),
      toggleApplyCoreMessage: () =>
        set((state) => ({
          shouldApplyCoreMessage: !state.shouldApplyCoreMessage,
          applyMessage: null,
        })),
      setApplyCoreMessage: (value) =>
        set({
          shouldApplyCoreMessage: value,
          applyMessage: null,
        }),
      selectAllSuggestedActions: () =>
        set((state) => ({
          selectedSuggestedActionIndexes:
            state.parsedResponse?.suggestedActions.map((_, index) => index) ?? [],
          applyMessage: null,
        })),
      clearSuggestedActionSelection: () =>
        set({
          selectedSuggestedActionIndexes: [],
          applyMessage: null,
        }),
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
          importedResponseText: '',
          parsedResponse: null,
          parseError: null,
          applyMessage: null,
          lastAppliedResponseAt: null,
          selectedSuggestedActionIndexes: [],
          shouldApplyCoreMessage: false,
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
