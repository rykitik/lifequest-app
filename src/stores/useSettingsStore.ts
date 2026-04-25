import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { resetLifeQuestDemoData } from '@/services/lifequestReset'
import {
  applyWaitingServiceWorker,
  checkForPwaUpdate,
  clearLifeQuestRuntimeData,
  getPwaStatusSnapshot,
} from '@/services/lifequestRuntime'
import { mockUser } from '@/services/mockData'
import { mergePersistedState } from '@/shared/lib/persist'
import type { PreferredTone } from '@/shared/types'

interface SettingsState {
  userName: string
  userRole: string
  preferredTone: PreferredTone
  lastBackupExportAt: string | null
  appVersion: string
  isInstalledAsApp: boolean
  hasServiceWorkerSupport: boolean
  hasActiveServiceWorker: boolean
  hasWaitingServiceWorker: boolean
  updateProfile: (profile: {
    userName?: string
    userRole?: string
    preferredTone?: PreferredTone
  }) => void
  resetDemoData: () => void
  clearAllLocalData: () => Promise<void>
  checkPwaStatus: (options?: { checkForUpdates?: boolean }) => Promise<void>
  applyPwaUpdate: () => Promise<void>
  recordBackupExport: (exportedAt: string) => void
}

type SettingsPersistedState = Pick<
  SettingsState,
  'userName' | 'userRole' | 'preferredTone' | 'lastBackupExportAt'
>

function createSettingsPersistedState(): SettingsPersistedState {
  return {
    userName: mockUser.name,
    userRole: 'Оператор системы',
    preferredTone: 'calm',
    lastBackupExportAt: null,
  }
}

function createSettingsRuntimeState() {
  return {
    appVersion: __APP_VERSION__,
    isInstalledAsApp: false,
    hasServiceWorkerSupport: false,
    hasActiveServiceWorker: false,
    hasWaitingServiceWorker: false,
  }
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...createSettingsPersistedState(),
      ...createSettingsRuntimeState(),
      updateProfile: ({ userName, userRole, preferredTone }) =>
        set((state) => {
          const nextUserName = userName?.trim() || state.userName
          const nextUserRole = userRole?.trim() || state.userRole
          const nextPreferredTone = preferredTone ?? state.preferredTone

          if (
            state.userName === nextUserName &&
            state.userRole === nextUserRole &&
            state.preferredTone === nextPreferredTone
          ) {
            return state
          }

          return {
            userName: nextUserName,
            userRole: nextUserRole,
            preferredTone: nextPreferredTone,
          }
        }),
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
      version: 2,
      migrate: (persistedState) =>
        mergePersistedState(
          createSettingsPersistedState(),
          persistedState,
        ) as SettingsPersistedState,
      partialize: (state) => ({
        userName: state.userName,
        userRole: state.userRole,
        preferredTone: state.preferredTone,
        lastBackupExportAt: state.lastBackupExportAt,
      }),
    },
  ),
)
