import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getLocalDateKey } from '@/shared/lib/date'
import type {
  LifeQuestSuggestedAction,
  PromptImportDifficulty,
  PromptImportDomain,
  WeeklyReviewSummary,
} from '@/shared/types'
import type { PersistStorage } from 'zustand/middleware'

const WEEKLY_REVIEW_LIMIT = 8
const WEEKLY_REVIEW_STORAGE_KEY = 'lifequest-weekly-reviews'

interface WeeklyReviewSummaryInput {
  periodStart?: string
  periodEnd?: string
  coreMessage?: string
  bodyFocus?: string
  risk?: string
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

function readCanonicalText(value: string) {
  return value.trim().replace(/\s+/g, ' ')
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
    coreMessage: readCanonicalText(summary.coreMessage),
    bodyFocus: readCanonicalText(summary.bodyFocus),
    risk: readCanonicalText(summary.risk),
    suggestedActions: summary.suggestedActions.map((action) => ({
      title: readCanonicalText(action.title),
      domain: action.domain,
      difficulty: action.difficulty,
      xp: action.xp,
    })).sort((left, right) =>
      `${left.title}|${left.domain}|${left.difficulty}|${left.xp}`.localeCompare(
        `${right.title}|${right.domain}|${right.difficulty}|${right.xp}`,
      ),
    ),
    source: summary.source,
  })
}

function createWeeklyReviewSummary(input: WeeklyReviewSummaryInput): WeeklyReviewSummary {
  const fallbackDate = getLocalDateKey()

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    periodStart: readText(input.periodStart) || fallbackDate,
    periodEnd: readText(input.periodEnd) || readText(input.periodStart) || fallbackDate,
    coreMessage: readText(input.coreMessage),
    bodyFocus: readText(input.bodyFocus),
    risk: readText(input.risk),
    suggestedActions: normalizeSuggestedActions(input.suggestedActions),
    source: 'weekly_review',
  }
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

  return {
    id,
    createdAt,
    periodStart,
    periodEnd,
    coreMessage: readText(value.coreMessage),
    bodyFocus: readText(value.bodyFocus),
    risk: readText(value.risk),
    suggestedActions: normalizeSuggestedActions(value.suggestedActions),
    source: 'weekly_review',
  }
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
