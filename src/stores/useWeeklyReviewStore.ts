import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getLocalDateKey } from '@/shared/lib/date'
import type {
  LifeQuestSuggestedAction,
  PromptImportDifficulty,
  PromptImportDomain,
  WeeklyReviewDataQuality,
  WeeklyReviewSummary,
} from '@/shared/types'
import type { PersistStorage } from 'zustand/middleware'

const WEEKLY_REVIEW_LIMIT = 12
const WEEKLY_REVIEW_STORAGE_KEY = 'lifequest-weekly-reviews'

interface WeeklyReviewSummaryInput {
  periodStart?: string
  periodEnd?: string
  weekStart?: string
  weekEnd?: string
  dataQuality?: unknown
  summary?: string
  coreMessage?: string
  bodyFocus?: string
  moneyFocus?: string
  risk?: string
  suggestedActionsCount?: unknown
  appliedActionsCount?: unknown
  rawTextNote?: string
  suggestedActions?: unknown
}

type WeeklyReviewSaveResult =
  | {
      ok: true
      summary: WeeklyReviewSummary
      duplicate: false
    }
  | {
      ok: false
      summary: WeeklyReviewSummary
      duplicate: true
      reason: string
    }

interface WeeklyReviewState {
  summaries: WeeklyReviewSummary[]
  lastMessage: string | null
  saveWeeklyReviewSummary: (input: WeeklyReviewSummaryInput) => WeeklyReviewSaveResult
  deleteWeeklyReviewSummary: (id: string) => boolean
  clearWeeklyReviewMessage: () => void
  resetWeeklyReviews: () => void
}

type WeeklyReviewPersistedState = Pick<WeeklyReviewState, 'summaries'>

const domains: PromptImportDomain[] = ['today', 'plan', 'body', 'money', 'rescue', 'core']
const difficulties: PromptImportDifficulty[] = ['easy', 'medium', 'hard']

function readText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function readSafeText(value: unknown, maxLength = 700) {
  return readText(value)
    .replace(/\b\d{12,}\b/g, '[номер скрыт]')
    .replace(/\brawDescription\b/gi, '')
    .replace(/\bPDF\b/gi, '')
    .replace(/\bstatement text\b/gi, '')
    .replace(/\s+/g, ' ')
    .slice(0, maxLength)
    .trim()
}

function readDataQuality(value: unknown): WeeklyReviewDataQuality | undefined {
  return value === 'low' || value === 'medium' || value === 'good' ? value : undefined
}

function readCount(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.round(value))
    : fallback
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function normalizeSuggestedActions(value: unknown): LifeQuestSuggestedAction[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => {
      if (!isRecord(item)) {
        return null
      }

      const title = readText(item.title)
      const domain = item.domain
      const difficulty = item.difficulty
      const xp = item.xp

      if (
        !title ||
        !domains.includes(domain as PromptImportDomain) ||
        !difficulties.includes(difficulty as PromptImportDifficulty) ||
        typeof xp !== 'number' ||
        !Number.isFinite(xp)
      ) {
        return null
      }

      return {
        title,
        domain: domain as PromptImportDomain,
        difficulty: difficulty as PromptImportDifficulty,
        xp: Math.max(0, Math.round(xp)),
      }
    })
    .filter((item): item is LifeQuestSuggestedAction => Boolean(item))
}

function createSummaryFingerprint(summary: WeeklyReviewSummary) {
  return JSON.stringify({
    periodStart: summary.periodStart,
    periodEnd: summary.periodEnd,
    weekStart: summary.weekStart,
    weekEnd: summary.weekEnd,
    source: summary.source,
  })
}

function createWeeklyReviewSummary(input: WeeklyReviewSummaryInput): WeeklyReviewSummary {
  const fallbackDate = getLocalDateKey()
  const suggestedActions = normalizeSuggestedActions(input.suggestedActions)
  const periodStart = readSafeText(input.periodStart) || readSafeText(input.weekStart) || fallbackDate
  const periodEnd =
    readSafeText(input.periodEnd) || readSafeText(input.weekEnd) || readSafeText(input.periodStart) || fallbackDate
  const summary = readSafeText(input.summary) || readSafeText(input.coreMessage) || 'Недельный итог сохранён.'
  const coreMessage = readSafeText(input.coreMessage)
  const bodyFocus = readSafeText(input.bodyFocus)
  const moneyFocus = readSafeText(input.moneyFocus)
  const risk = readSafeText(input.risk)
  const dataQuality = readDataQuality(input.dataQuality)

  let reviewSummary: WeeklyReviewSummary = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    periodStart,
    periodEnd,
    weekStart: readSafeText(input.weekStart) || periodStart,
    weekEnd: readSafeText(input.weekEnd) || periodEnd,
    summary,
    coreMessage,
    bodyFocus,
    moneyFocus,
    risk,
    suggestedActionsCount: readCount(input.suggestedActionsCount, suggestedActions.length),
    appliedActionsCount: readCount(input.appliedActionsCount, suggestedActions.length),
    suggestedActions,
    source: 'weekly_review',
  }

  if (dataQuality) {
    reviewSummary = { ...reviewSummary, dataQuality }
  }

  const rawTextNote = readSafeText(input.rawTextNote, 240)

  return rawTextNote ? { ...reviewSummary, rawTextNote } : reviewSummary
}

function normalizePersistedSummary(value: unknown): WeeklyReviewSummary | null {
  if (!isRecord(value)) {
    return null
  }

  const source = value.source

  if (source !== 'weekly_review') {
    return null
  }

  const id = readText(value.id)
  const createdAt = readText(value.createdAt)
  const periodStart = readText(value.periodStart)
  const periodEnd = readText(value.periodEnd)

  if (!id || !createdAt || Number.isNaN(new Date(createdAt).getTime()) || !periodStart || !periodEnd) {
    return null
  }

  const suggestedActions = normalizeSuggestedActions(value.suggestedActions)
  const coreMessage = readSafeText(value.coreMessage)
  const bodyFocus = readSafeText(value.bodyFocus)
  const moneyFocus = readSafeText(value.moneyFocus)
  const risk = readSafeText(value.risk)
  const summary = readSafeText(value.summary) || coreMessage || bodyFocus || 'Недельный итог сохранён.'
  const rawTextNote = readSafeText(value.rawTextNote, 240)
  const dataQuality = readDataQuality(value.dataQuality)

  let summaryRecord: WeeklyReviewSummary = {
    id,
    createdAt,
    periodStart,
    periodEnd,
    weekStart: readSafeText(value.weekStart) || periodStart,
    weekEnd: readSafeText(value.weekEnd) || periodEnd,
    summary,
    coreMessage,
    bodyFocus,
    moneyFocus,
    risk,
    suggestedActionsCount: readCount(value.suggestedActionsCount, suggestedActions.length),
    appliedActionsCount: readCount(value.appliedActionsCount, suggestedActions.length),
    suggestedActions,
    source: 'weekly_review',
  }

  if (dataQuality) {
    summaryRecord = { ...summaryRecord, dataQuality }
  }

  return rawTextNote ? { ...summaryRecord, rawTextNote } : summaryRecord
}

function normalizeSummaries(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map(normalizePersistedSummary)
    .filter((summary): summary is WeeklyReviewSummary => Boolean(summary))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, WEEKLY_REVIEW_LIMIT)
}

function createPersistedState(): WeeklyReviewPersistedState {
  return {
    summaries: [],
  }
}

const safeWeeklyReviewStorage: PersistStorage<WeeklyReviewPersistedState> = {
  getItem: (name) => {
    try {
      const rawValue = globalThis.localStorage?.getItem(name)

      return rawValue ? JSON.parse(rawValue) : null
    } catch {
      return null
    }
  },
  setItem: (name, value) => {
    try {
      globalThis.localStorage?.setItem(name, JSON.stringify(value))
    } catch {
      // localStorage can be unavailable or full; the UI should keep running.
    }
  },
  removeItem: (name) => {
    try {
      globalThis.localStorage?.removeItem(name)
    } catch {
      // Nothing to recover here.
    }
  },
}

export { WEEKLY_REVIEW_LIMIT, WEEKLY_REVIEW_STORAGE_KEY, createSummaryFingerprint }

export const useWeeklyReviewStore = create<WeeklyReviewState>()(
  persist(
    (set, get) => ({
      summaries: [],
      lastMessage: null,
      saveWeeklyReviewSummary: (input) => {
        const summary = createWeeklyReviewSummary(input)
        const fingerprint = createSummaryFingerprint(summary)
        const duplicate = get().summaries.some(
          (item) => createSummaryFingerprint(item) === fingerprint,
        )

        if (duplicate) {
          set({
            lastMessage: 'Этот недельный итог уже сохранён.',
          })

          return {
            ok: false,
            summary,
            duplicate: true,
            reason: 'duplicate',
          }
        }

        set((state) => ({
          summaries: [summary, ...state.summaries]
            .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
            .slice(0, WEEKLY_REVIEW_LIMIT),
          lastMessage: 'Недельный итог сохранён.',
        }))

        return {
          ok: true,
          summary,
          duplicate: false,
        }
      },
      deleteWeeklyReviewSummary: (id) => {
        const exists = get().summaries.some((summary) => summary.id === id)

        if (!exists) {
          return false
        }

        set((state) => ({
          summaries: state.summaries.filter((summary) => summary.id !== id),
          lastMessage: 'Недельный итог удалён.',
        }))

        return true
      },
      clearWeeklyReviewMessage: () =>
        set({
          lastMessage: null,
        }),
      resetWeeklyReviews: () =>
        set({
          ...createPersistedState(),
          lastMessage: null,
        }),
    }),
    {
      name: WEEKLY_REVIEW_STORAGE_KEY,
      version: 1,
      storage: safeWeeklyReviewStorage,
      migrate: (persistedState) => ({
        summaries: normalizeSummaries(
          isRecord(persistedState) ? persistedState.summaries : undefined,
        ),
      }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        summaries: normalizeSummaries(
          isRecord(persistedState) ? persistedState.summaries : undefined,
        ),
      }),
      partialize: (state) => ({
        summaries: state.summaries,
      }),
    },
  ),
)
