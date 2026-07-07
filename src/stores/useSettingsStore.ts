import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import * as settingsApi from '@/services/settingsApi'
import { resetLifeQuestDemoData } from '@/services/lifequestReset'
import {
  applyWaitingServiceWorker,
  checkForPwaUpdate,
  clearLifeQuestRuntimeData,
  getPwaStatusSnapshot,
} from '@/services/lifequestRuntime'
import { mockUser } from '@/services/mockData'
import { normalizeApiError } from '@/services/httpClientContract'
import { mergePersistedState } from '@/shared/lib/persist'
import type { AccountSettingsProfile, SettingsProfile } from '@/shared/types'
import { useAuthStore } from '@/stores/useAuthStore'
import { useSyncStore } from '@/stores/useSyncStore'

type SettingsAccountSyncStatus = 'idle' | 'loading' | 'saving' | 'error'

interface SettingsSyncActionResult {
  success: boolean
  message: string
}

interface SettingsState extends SettingsProfile {
  lastBackupExportAt: string | null
  appVersion: string
  isInstalledAsApp: boolean
  hasServiceWorkerSupport: boolean
  hasActiveServiceWorker: boolean
  hasWaitingServiceWorker: boolean
  accountSyncStatus: SettingsAccountSyncStatus
  accountSyncError: string | null
  accountSyncedAt: string | null
  accountSyncVersion: number | null
  accountSyncUserId: string | null
  updateProfile: (profile: Partial<SettingsProfile>) => void
  resetDemoData: () => void
  clearAllLocalData: () => Promise<void>
  checkPwaStatus: (options?: { checkForUpdates?: boolean }) => Promise<void>
  applyPwaUpdate: () => Promise<void>
  recordBackupExport: (exportedAt: string) => void
  fetchAccountSettingsProfile: () => Promise<SettingsSyncActionResult>
  pushAccountSettingsProfile: () => Promise<SettingsSyncActionResult>
  resetAccountSyncState: () => void
}

type SettingsPersistedState = Pick<
  SettingsState,
  | 'userId'
  | 'userName'
  | 'userRole'
  | 'preferredTone'
  | 'lastBackupExportAt'
  | 'accountSyncedAt'
  | 'accountSyncVersion'
  | 'accountSyncUserId'
>

function createSettingsPersistedState(): SettingsPersistedState {
  return {
    userId: mockUser.userId,
    userName: mockUser.name,
    userRole: 'Оператор системы',
    preferredTone: 'calm',
    lastBackupExportAt: null,
    accountSyncedAt: null,
    accountSyncVersion: null,
    accountSyncUserId: null,
  }
}

function createSettingsRuntimeState() {
  return {
    appVersion: __APP_VERSION__,
    isInstalledAsApp: false,
    hasServiceWorkerSupport: false,
    hasActiveServiceWorker: false,
    hasWaitingServiceWorker: false,
    accountSyncStatus: 'idle' as SettingsAccountSyncStatus,
    accountSyncError: null as string | null,
  }
}

function normalizeTextInput(value: string | undefined) {
  return value?.trim() ?? ''
}

function buildLocalProfileUpdate(
  state: SettingsState,
  profile: Partial<SettingsProfile>,
): Pick<
  SettingsState,
  | 'userId'
  | 'userName'
  | 'userRole'
  | 'preferredTone'
  | 'accountSyncedAt'
  | 'accountSyncVersion'
  | 'accountSyncUserId'
  | 'accountSyncStatus'
  | 'accountSyncError'
> | null {
  const nextUserId = profile.userId === undefined ? state.userId : profile.userId
  const nextUserName = profile.userName === undefined ? state.userName : normalizeTextInput(profile.userName)
  const nextUserRole = profile.userRole === undefined ? state.userRole : normalizeTextInput(profile.userRole)
  const nextPreferredTone = profile.preferredTone ?? state.preferredTone

  if (
    state.userId === nextUserId &&
    state.userName === nextUserName &&
    state.userRole === nextUserRole &&
    state.preferredTone === nextPreferredTone
  ) {
    return null
  }

  return {
    userId: nextUserId,
    userName: nextUserName,
    userRole: nextUserRole,
    preferredTone: nextPreferredTone,
    accountSyncedAt: null,
    accountSyncVersion: null,
    accountSyncUserId: null,
    accountSyncStatus: 'idle',
    accountSyncError: null,
  }
}

function applyAccountProfileToState(profile: AccountSettingsProfile) {
  return {
    userId: profile.userId,
    userName: profile.userName,
    userRole: profile.userRole,
    preferredTone: profile.preferredTone,
    accountSyncStatus: 'idle' as SettingsAccountSyncStatus,
    accountSyncError: null,
    accountSyncedAt: profile.updatedAt,
    accountSyncVersion: profile.syncVersion,
    accountSyncUserId: profile.userId,
  }
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...createSettingsPersistedState(),
      ...createSettingsRuntimeState(),
      updateProfile: (profile) =>
        set((state) => {
          const nextState = buildLocalProfileUpdate(state, profile)
          return nextState ? { ...state, ...nextState } : state
        }),
      recordBackupExport: (exportedAt) =>
        set((state) => {
          if (state.lastBackupExportAt === exportedAt) {
            return state
          }

          return {
            ...state,
            lastBackupExportAt: exportedAt,
          }
        }),
      resetDemoData: () => {
        resetLifeQuestDemoData(() =>
          set((state) => ({
            ...state,
            ...createSettingsPersistedState(),
            accountSyncStatus: 'idle',
            accountSyncError: null,
          })),
        )
      },
      clearAllLocalData: async () => {
        await clearLifeQuestRuntimeData({
          clearAllLocalStorage: true,
          clearSessionStorage: true,
          clearCaches: true,
          unregisterServiceWorkers: true,
        })
        window.location.replace('/today')
      },
      checkPwaStatus: async (options) => {
        const snapshot = options?.checkForUpdates
          ? await checkForPwaUpdate()
          : await getPwaStatusSnapshot()

        set((state) => {
          if (
            state.isInstalledAsApp === snapshot.isInstalled &&
            state.hasServiceWorkerSupport === snapshot.hasServiceWorkerSupport &&
            state.hasActiveServiceWorker === snapshot.hasActiveServiceWorker &&
            state.hasWaitingServiceWorker === snapshot.hasWaitingServiceWorker
          ) {
            return state
          }

          return {
            ...state,
            isInstalledAsApp: snapshot.isInstalled,
            hasServiceWorkerSupport: snapshot.hasServiceWorkerSupport,
            hasActiveServiceWorker: snapshot.hasActiveServiceWorker,
            hasWaitingServiceWorker: snapshot.hasWaitingServiceWorker,
          }
        })
      },
      applyPwaUpdate: async () => {
        const hasTriggeredUpdate = await applyWaitingServiceWorker()

        if (hasTriggeredUpdate) {
          return
        }

        await get().checkPwaStatus({ checkForUpdates: true })
      },
      fetchAccountSettingsProfile: async () => {
        const authState = useAuthStore.getState()

        if (authState.mode !== 'account' || !authState.isAuthenticated) {
          return {
            success: false,
            message: 'Загрузка настроек с сервера доступна только после входа в аккаунт.',
          }
        }

        set((state) => ({
          ...state,
          accountSyncStatus: 'loading',
          accountSyncError: null,
        }))

        try {
          const response = await settingsApi.getSettingsProfile()

          set((state) => ({
            ...state,
            ...applyAccountProfileToState(response.profile),
          }))

          return {
            success: true,
            message: 'Настройки загружены с сервера и применены локально.',
          }
        } catch (error) {
          const normalizedError = normalizeApiError(error)

          set((state) => ({
            ...state,
            accountSyncStatus: 'error',
            accountSyncError: normalizedError.message,
          }))

          return {
            success: false,
            message: normalizedError.message,
          }
        }
      },
      pushAccountSettingsProfile: async () => {
        const authState = useAuthStore.getState()

        if (authState.mode !== 'account' || !authState.isAuthenticated) {
          return {
            success: false,
            message: 'Сохранение настроек в аккаунт доступно только после входа в аккаунт.',
          }
        }

        const syncStore = useSyncStore.getState()
        const deviceId = syncStore.deviceId ?? syncStore.initializeDeviceId()
        const { userName, userRole, preferredTone } = get()

        set((state) => ({
          ...state,
          accountSyncStatus: 'saving',
          accountSyncError: null,
        }))

        try {
          const response = await settingsApi.updateSettingsProfile({
            userName,
            userRole,
            preferredTone,
            deviceId,
          })

          set((state) => ({
            ...state,
            ...applyAccountProfileToState(response.profile),
          }))

          return {
            success: true,
            message: 'Настройки сохранены в аккаунт.',
          }
        } catch (error) {
          const normalizedError = normalizeApiError(error)

          set((state) => ({
            ...state,
            accountSyncStatus: 'error',
            accountSyncError: normalizedError.message,
          }))

          return {
            success: false,
            message: normalizedError.message,
          }
        }
      },
      resetAccountSyncState: () =>
        set((state) => {
          if (
            state.accountSyncStatus === 'idle' &&
            state.accountSyncError === null &&
            state.accountSyncedAt === null &&
            state.accountSyncVersion === null &&
            state.accountSyncUserId === null
          ) {
            return state
          }

          return {
            ...state,
            accountSyncStatus: 'idle',
            accountSyncError: null,
            accountSyncedAt: null,
            accountSyncVersion: null,
            accountSyncUserId: null,
          }
        }),
    }),
    {
      name: 'lifequest-settings',
      version: 4,
      migrate: (persistedState) =>
        mergePersistedState(
          createSettingsPersistedState(),
          persistedState,
        ) as SettingsPersistedState,
      partialize: (state) => ({
        userId: state.userId,
        userName: state.userName,
        userRole: state.userRole,
        preferredTone: state.preferredTone,
        lastBackupExportAt: state.lastBackupExportAt,
        accountSyncedAt: state.accountSyncedAt,
        accountSyncVersion: state.accountSyncVersion,
        accountSyncUserId: state.accountSyncUserId,
      }),
    },
  ),
)
