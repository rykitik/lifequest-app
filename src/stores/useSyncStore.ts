import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getOrCreateDeviceId } from '@/services/deviceIdentity'
import { normalizeApiError } from '@/services/httpClientContract'
import * as syncApi from '@/services/syncApi'
import { mergePersistedState } from '@/shared/lib/persist'
import type { SyncConflict } from '@/shared/types/sync'
import type { SyncQueueItem, SyncRetryPolicy, SyncStatus } from '@/shared/types/syncState'
import { useAuthStore } from '@/stores/useAuthStore'

interface SyncActionResult {
  success: boolean
  message: string
}

interface SyncState {
  status: SyncStatus
  queue: SyncQueueItem[]
  latestSyncCursor: string | null
  lastSyncAt: string | null
  lastError: string | null
  conflicts: SyncConflict[]
  retryPolicy: SyncRetryPolicy
  networkOnline: boolean
  deviceId: string | null
  bootstrapLocalSync: () => void
  setNetworkOnline: (value: boolean) => void
  enqueueChange: (item: SyncQueueItem) => void
  markItemSyncing: (id: string) => void
  markItemResolved: (id: string) => void
  markItemFailed: (id: string, error: string) => void
  clearResolvedItems: () => void
  setStatus: (status: SyncStatus) => void
  setLastError: (error: string | null) => void
  setConflicts: (conflicts: SyncConflict[]) => void
  clearConflicts: () => void
  prepareAccountSyncReadiness: () => void
  bootstrapAccountSync: () => Promise<SyncActionResult>
  resetSyncState: () => void
  initializeDeviceId: () => string
}

type SyncPersistedState = Pick<
  SyncState,
  | 'status'
  | 'queue'
  | 'latestSyncCursor'
  | 'lastSyncAt'
  | 'lastError'
  | 'conflicts'
  | 'retryPolicy'
  | 'deviceId'
>

function createDefaultRetryPolicy(): SyncRetryPolicy {
  return {
    initialDelayMs: 2000,
    multiplier: 2,
    maxDelayMs: 60000,
    maxAttempts: 5,
    retryableErrors: ['network', 'timeout', '5xx'],
    nonRetryableErrors: ['401', '403', '400', 'schema_mismatch'],
  }
}

function createPersistedSyncState(): SyncPersistedState {
  return {
    status: 'local_only',
    queue: [],
    latestSyncCursor: null,
    lastSyncAt: null,
    lastError: null,
    conflicts: [],
    retryPolicy: createDefaultRetryPolicy(),
    deviceId: null,
  }
}

function createRuntimeSyncState() {
  return {
    networkOnline: typeof navigator === 'undefined' ? true : navigator.onLine,
  }
}

function getRuntimeNetworkOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine
}

function normalizePersistedStatus(status: SyncStatus) {
  if (status === 'bootstrapping' || status === 'syncing') {
    return 'idle' as const
  }

  return status
}

function getNextOnlineStatus(state: Pick<SyncState, 'status' | 'queue' | 'conflicts' | 'lastError'>) {
  if (state.status === 'local_only') {
    return 'local_only' as const
  }

  if (state.conflicts.length) {
    return 'conflict' as const
  }

  if (state.lastError) {
    return 'error' as const
  }

  return 'idle' as const
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set, get) => ({
      ...createPersistedSyncState(),
      ...createRuntimeSyncState(),
      bootstrapLocalSync: () => {
        const deviceId = get().initializeDeviceId()
        const nextNetworkOnline = getRuntimeNetworkOnline()

        set((state) => {
          if (
            state.status === 'local_only' &&
            state.networkOnline === nextNetworkOnline &&
            state.deviceId === deviceId
          ) {
            return state
          }

          return {
            status: 'local_only',
            networkOnline: nextNetworkOnline,
            deviceId,
          }
        })
      },
      setNetworkOnline: (value) =>
        set((state) => {
          const nextStatus = value
            ? getNextOnlineStatus(state)
            : state.status === 'local_only'
              ? 'local_only'
              : 'offline'

          if (state.networkOnline === value && state.status === nextStatus) {
            return state
          }

          return {
            networkOnline: value,
            status: nextStatus,
          }
        }),
      enqueueChange: (item) =>
        set((state) => {
          const hasDuplicate = state.queue.some(
            (queueItem) =>
              queueItem.id === item.id || queueItem.idempotencyKey === item.idempotencyKey,
          )

          if (hasDuplicate) {
            return state
          }

          return {
            queue: [...state.queue, item],
            status:
              state.status === 'local_only'
                ? 'local_only'
                : state.networkOnline
                  ? 'idle'
                  : 'offline',
          }
        }),
      markItemSyncing: (id) =>
        set((state) => {
          let changed = false

          const queue = state.queue.map<SyncQueueItem>((item) => {
            if (item.id !== id) {
              return item
            }

            changed = true

            return {
              ...item,
              status: 'syncing',
              attempts: item.attempts + 1,
              lastAttemptAt: new Date().toISOString(),
            }
          })

          if (!changed) {
            return state
          }

          return {
            queue,
            status: state.status === 'local_only' ? 'local_only' : 'syncing',
          }
        }),
      markItemResolved: (id) =>
        set((state) => {
          let changed = false

          const queue = state.queue.map<SyncQueueItem>((item) => {
            if (item.id !== id || item.status === 'resolved') {
              return item
            }

            changed = true
            return {
              ...item,
              status: 'resolved',
            }
          })

          if (!changed) {
            return state
          }

          return {
            queue,
            lastSyncAt: new Date().toISOString(),
            lastError: null,
            status: getNextOnlineStatus({
              status: state.status,
              queue,
              conflicts: state.conflicts,
              lastError: null,
            }),
          }
        }),
      markItemFailed: (id, error) =>
        set((state) => {
          let changed = false

          const queue = state.queue.map<SyncQueueItem>((item) => {
            if (item.id !== id || item.status === 'failed') {
              return item
            }

            changed = true
            return {
              ...item,
              status: 'failed',
            }
          })

          if (!changed && state.lastError === error) {
            return state
          }

          return {
            queue,
            lastError: error,
            status:
              state.networkOnline && state.status !== 'local_only'
                ? 'error'
                : state.status === 'local_only'
                  ? 'local_only'
                  : 'offline',
          }
        }),
      clearResolvedItems: () =>
        set((state) => {
          const queue = state.queue.filter((item) => item.status !== 'resolved')

          if (queue.length === state.queue.length) {
            return state
          }

          return { queue }
        }),
      setStatus: (status) =>
        set((state) => (state.status === status ? state : { status })),
      setLastError: (error) =>
        set((state) => (state.lastError === error ? state : { lastError: error })),
      setConflicts: (conflicts) =>
        set((state) => {
          const hasSameConflicts =
            state.conflicts.length === conflicts.length &&
            state.conflicts.every(
              (conflict, index) =>
                conflict.collection === conflicts[index]?.collection &&
                conflict.entityId === conflicts[index]?.entityId &&
                conflict.policy === conflicts[index]?.policy &&
                conflict.resolvedWith === conflicts[index]?.resolvedWith &&
                conflict.reason === conflicts[index]?.reason,
            )

          if (hasSameConflicts) {
            return state
          }

          return {
            conflicts,
            status: conflicts.length ? 'conflict' : state.status,
          }
        }),
      clearConflicts: () =>
        set((state) => {
          if (!state.conflicts.length) {
            return state
          }

          return {
            conflicts: [],
            status: getNextOnlineStatus({
              status: state.status,
              queue: state.queue,
              conflicts: [],
              lastError: state.lastError,
            }),
          }
        }),
      prepareAccountSyncReadiness: () => {
        const deviceId = get().initializeDeviceId()
        const networkOnline = getRuntimeNetworkOnline()
        const nextStatus = networkOnline ? 'idle' : 'offline'

        set((state) => {
          if (
            state.status === nextStatus &&
            state.networkOnline === networkOnline &&
            state.deviceId === deviceId &&
            state.lastError === null &&
            state.conflicts.length === 0
          ) {
            return state
          }

          return {
            status: nextStatus,
            networkOnline,
            deviceId,
            lastError: null,
            conflicts: [],
          }
        })
      },
      bootstrapAccountSync: async () => {
        const authState = useAuthStore.getState()

        if (authState.mode !== 'account' || !authState.isAuthenticated) {
          get().bootstrapLocalSync()

          return {
            success: false,
            message: 'Синхронизация доступна только после входа в аккаунт.',
          }
        }

        const runtimeNetworkOnline = getRuntimeNetworkOnline()

        if (!runtimeNetworkOnline) {
          get().setNetworkOnline(false)

          return {
            success: false,
            message: 'Нет сети. Проверка синхронизации недоступна офлайн.',
          }
        }

        const currentState = get()

        if (currentState.status === 'bootstrapping' || currentState.status === 'syncing') {
          return {
            success: false,
            message: 'Проверка синхронизации уже выполняется.',
          }
        }

        const deviceId = get().initializeDeviceId()

        set((state) => ({
          ...state,
          status: 'bootstrapping',
          networkOnline: true,
          deviceId,
          lastError: null,
        }))

        try {
          const response = await syncApi.bootstrapSync()

          set((state) => ({
            ...state,
            status: response.conflicts.length ? 'conflict' : 'idle',
            networkOnline: true,
            latestSyncCursor: response.latestSyncCursor ?? state.latestSyncCursor,
            lastSyncAt: response.serverTime,
            lastError: null,
            conflicts: response.conflicts,
            deviceId,
          }))

          return {
            success: true,
            message: 'Сервер доступен. Проверка синхронизации завершена.',
          }
        } catch (error) {
          const normalizedError = normalizeApiError(error)
          const networkOnline = getRuntimeNetworkOnline()

          set((state) => ({
            ...state,
            networkOnline,
            status: networkOnline ? 'error' : 'offline',
            lastError: normalizedError.message,
          }))

          return {
            success: false,
            message: normalizedError.message,
          }
        }
      },
      resetSyncState: () =>
        set((state) => ({
          ...createPersistedSyncState(),
          deviceId: state.deviceId,
          networkOnline: state.networkOnline,
        })),
      initializeDeviceId: () => {
        const deviceId = getOrCreateDeviceId()

        set((state) => (state.deviceId === deviceId ? state : { deviceId }))

        return deviceId
      },
    }),
    {
      name: 'lifequest-sync',
      version: 1,
      migrate: (persistedState) =>
        mergePersistedState(createPersistedSyncState(), persistedState) as SyncPersistedState,
      partialize: (state) => ({
        status: normalizePersistedStatus(state.status),
        queue: state.queue,
        latestSyncCursor: state.latestSyncCursor,
        lastSyncAt: state.lastSyncAt,
        lastError: state.lastError,
        conflicts: state.conflicts,
        retryPolicy: state.retryPolicy,
        deviceId: state.deviceId,
      }),
    },
  ),
)
