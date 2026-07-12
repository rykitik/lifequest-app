import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getMockPromptCards } from '@/services/mockData'
import { buildWeeklyReviewContext } from '@/services/contextBuilder'
import { buildPrompt } from '@/services/promptBuilder'
import { parsePromptResponse } from '@/services/promptResponseParser'
import { getLocalDateKey } from '@/shared/lib/date'
import { mergePersistedState } from '@/shared/lib/persist'
import type { LifeQuestPromptResponse, LifeQuestSuggestedAction, PromptCard } from '@/shared/types'
import { useCompanionStore } from '@/stores/useCompanionStore'
import { useQuestStore } from '@/stores/useQuestStore'
import { useWeeklyReviewStore } from '@/stores/useWeeklyReviewStore'

interface PendingWeeklyReviewSummary {
  summary: string
  periodStart: string
  periodEnd: string
  coreMessage: string
  bodyFocus: string
  risk: string
  suggestedActions: LifeQuestSuggestedAction[]
}

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
  pendingWeeklyReviewSummary: PendingWeeklyReviewSummary | null
  weeklyReviewSaveMessage: string | null
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
  savePendingWeeklyReviewSummary: () => void
  dismissPendingWeeklyReviewSummary: () => void
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

function isWeeklyReviewCard(cardId: string | null) {
  return cardId === 'weekly-review'
}

function getWeeklyReviewPeriod() {
  const context = buildWeeklyReviewContext()
  const dates = context.body.dailyLogs
    .map((log) => log.date)
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right))
  const fallbackDate = getLocalDateKey()

  return {
    periodStart: dates[0] ?? fallbackDate,
    periodEnd: dates.at(-1) ?? fallbackDate,
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
      pendingWeeklyReviewSummary: null,
      weeklyReviewSaveMessage: null,
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
          pendingWeeklyReviewSummary: null,
          weeklyReviewSaveMessage: null,
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
            pendingWeeklyReviewSummary: null,
            weeklyReviewSaveMessage: null,
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
            pendingWeeklyReviewSummary: null,
            weeklyReviewSaveMessage: null,
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
          pendingWeeklyReviewSummary: null,
          weeklyReviewSaveMessage: null,
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
          pendingWeeklyReviewSummary: null,
          weeklyReviewSaveMessage: null,
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
            pendingWeeklyReviewSummary: null,
            weeklyReviewSaveMessage: null,
          })

          return
        }

        set({
          parsedResponse: result.data,
          parseError: null,
          applyMessage: 'Рекомендации готовы',
          selectedSuggestedActionIndexes: result.data.suggestedActions.map((_, index) => index),
          shouldApplyCoreMessage: Boolean(result.data.coreMessage),
          pendingWeeklyReviewSummary: null,
          weeklyReviewSaveMessage: null,
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
          pendingWeeklyReviewSummary: null,
          weeklyReviewSaveMessage: null,
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

        const applyMessage = [
          addedTaskCount === parsedResponse.suggestedActions.length &&
          coreMessageUpdated === Boolean(parsedResponse.coreMessage)
            ? 'Рекомендации применены'
            : 'Рекомендации применены частично',
          addedTaskCount ? `Добавлено задач: ${addedTaskCount}` : null,
          coreMessageUpdated ? 'Сообщение Ядра обновлено' : null,
        ]
          .filter(Boolean)
          .join('. ')
        const shouldOfferWeeklyReviewSave = isWeeklyReviewCard(get().selectedCardId)
        const weeklyReviewPeriod = shouldOfferWeeklyReviewSave ? getWeeklyReviewPeriod() : null

        set({
          lastAppliedResponseAt: new Date().toISOString(),
          applyMessage,
          pendingWeeklyReviewSummary: shouldOfferWeeklyReviewSave && weeklyReviewPeriod
            ? {
                summary: parsedResponse.summary,
                periodStart: weeklyReviewPeriod.periodStart,
                periodEnd: weeklyReviewPeriod.periodEnd,
                coreMessage: parsedResponse.coreMessage,
                bodyFocus: parsedResponse.bodyFocus,
                risk: parsedResponse.risk,
                suggestedActions: selectedActions,
              }
            : null,
          weeklyReviewSaveMessage: null,
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
      savePendingWeeklyReviewSummary: () => {
        const pending = get().pendingWeeklyReviewSummary

        if (!pending) {
          set({
            weeklyReviewSaveMessage: 'Нет недельного итога для сохранения.',
          })

          return
        }

        const result = useWeeklyReviewStore.getState().saveWeeklyReviewSummary({
          periodStart: pending.periodStart,
          periodEnd: pending.periodEnd,
          coreMessage: pending.coreMessage,
          bodyFocus: pending.bodyFocus,
          risk: pending.risk,
          suggestedActions: pending.suggestedActions,
        })

        set({
          pendingWeeklyReviewSummary: result.ok ? null : pending,
          weeklyReviewSaveMessage: result.ok
            ? 'Недельный итог сохранён.'
            : 'Этот недельный итог уже сохранён.',
        })
      },
      dismissPendingWeeklyReviewSummary: () =>
        set({
          pendingWeeklyReviewSummary: null,
          weeklyReviewSaveMessage: 'Итог не сохранён.',
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
            pendingWeeklyReviewSummary: null,
            weeklyReviewSaveMessage: null,
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
          pendingWeeklyReviewSummary: null,
          weeklyReviewSaveMessage: null,
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
