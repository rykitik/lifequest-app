import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { resetLifeQuestDemoData } from '@/services/lifequestReset'
import { normalizeApiError } from '@/services/httpClientContract'
import {
  applyWaitingServiceWorker,
  checkForPwaUpdate,
  clearLifeQuestRuntimeData,
  getPwaStatusSnapshot,
} from '@/services/lifequestRuntime'
import { mockUser } from '@/services/mockData'
import * as settingsApi from '@/services/settingsApi'
import { mergePersistedState } from '@/shared/lib/persist'
import type { SettingsProfile } from '@/shared/types'
import { useAuthStore } from '@/stores/useAuthStore'
import { useSyncStore } from '@/stores/useSyncStore'

type AccountSettingsSyncStatus = 'idle' | 'loading' | 'saving' | 'error'

interface SettingsAccountActionResult {
  success: boolean
  message: string
}

interface SettingsState extends SettingsProfile {
  lastBackupExportAt: string | null
  accountSyncStatus: AccountSettingsSyncStatus
  accountSyncError: string | null
  accountSyncedAt: string | null
  accountSyncVersion: number | null
  accountSyncUserId: string | null
  appVersion: string
  isInstalledAsApp: boolean
  hasServiceWorkerSupport: boolean
  hasActiveServiceWorker: boolean
  hasWaitingServiceWorker: boolean
  updateProfile: (profile: Partial<SettingsProfile>) => void
  fetchAccountSettingsProfile: () => Promise<SettingsAccountActionResult>
  pushAccountSettingsProfile: () => Promise<SettingsAccountActionResult>
  resetDemoData: () => void
  clearAllLocalData: () => Promise<void>
  checkPwaStatus: (options?: { checkForUpdates?: boolean }) => Promise<void>
  applyPwaUpdate: () => Promise<void>
  recordBackupExport: (exportedAt: string) => void
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
    accountSyncStatus: 'idle' as AccountSettingsSyncStatus,
    accountSyncError: null as string | null,
    appVersion: __APP_VERSION__,
    isInstalledAsApp: false,
    hasServiceWorkerSupport: false,
    hasActiveServiceWorker: false,
    hasWaitingServiceWorker: false,
  }
}

function isAuthenticatedAccountMode() {
  const authState = useAuthStore.getState()
  return authState.mode === 'account' && authState.isAuthenticated && Boolean(authState.user)
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...createSettingsPersistedState(),
      ...createSettingsRuntimeState(),
      updateProfile: ({ userId, userName, userRole, preferredTone }) =>
        set((state) => {
          const nextUserId = userId ?? state.userId
          const nextUserName = userName !== undefined ? userName.trim() : state.userName
          const nextUserRole = userRole !== undefined ? userRole.trim() : state.userRole
          const nextPreferredTone = preferredTone ?? state.preferredTone

          if (
            state.userId === nextUserId &&
            state.userName === nextUserName &&
            state.userRole === nextUserRole &&
            state.preferredTone === nextPreferredTone
          ) {
            return state
          }

          const profileChanged =
            state.userName !== nextUserName ||
            state.userRole !== nextUserRole ||
            state.preferredTone !== nextPreferredTone

          return {
            userId: nextUserId,
            userName: nextUserName,
            userRole: nextUserRole,
            preferredTone: nextPreferredTone,
            accountSyncStatus: state.accountSyncStatus === 'error' ? 'idle' : state.accountSyncStatus,
            accountSyncError: null,
            accountSyncedAt: profileChanged ? null : state.accountSyncedAt,
            accountSyncVersion: profileChanged ? null : state.accountSyncVersion,
            accountSyncUserId: profileChanged ? null : state.accountSyncUserId,
          }
        }),
      fetchAccountSettingsProfile: async () => {
        if (!isAuthenticatedAccountMode()) {
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
            userId: response.profile.userId,
            userName: response.profile.userName,
            userRole: response.profile.userRole,
            preferredTone: response.profile.preferredTone,
            accountSyncStatus: 'idle',
            accountSyncError: null,
            accountSyncedAt: response.profile.updatedAt,
            accountSyncVersion: response.profile.syncVersion,
            accountSyncUserId: response.profile.userId,
          }))

          return {
            success: true,
            message: 'Настройки профиля загружены с сервера.',
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
        if (!isAuthenticatedAccountMode()) {
          return {
            success: false,
            message: 'Сохранение настроек в аккаунт доступно только после входа в аккаунт.',
          }
        }

        const deviceId =
          useSyncStore.getState().deviceId ?? useSyncStore.getState().initializeDeviceId()
        const currentState = get()

        set((state) => ({
          ...state,
          accountSyncStatus: 'saving',
          accountSyncError: null,
        }))

        try {
          const response = await settingsApi.updateSettingsProfile({
            userName: currentState.userName,
            userRole: currentState.userRole,
            preferredTone: currentState.preferredTone,
            deviceId,
          })

          set((state) => ({
            ...state,
            userId: response.profile.userId,
            userName: response.profile.userName,
            userRole: response.profile.userRole,
            preferredTone: response.profile.preferredTone,
            accountSyncStatus: 'idle',
            accountSyncError: null,
            accountSyncedAt: response.profile.updatedAt,
            accountSyncVersion: response.profile.syncVersion,
            accountSyncUserId: response.profile.userId,
          }))

          return {
            success: true,
            message: 'Настройки профиля сохранены в аккаунт.',
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
      recordBackupExport: (exportedAt) =>
        set((state) => {
          if (state.lastBackupExportAt === exportedAt) {
            return state
          }

          return {
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
