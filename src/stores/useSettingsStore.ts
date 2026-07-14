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
  | 'heightCm'
  | 'birthYear'
  | 'sex'
  | 'bodyGoal'
  | 'targetWeightKg'
  | 'targetPace'
  | 'activityLevel'
  | 'usualSleepTime'
  | 'usualWakeTime'
  | 'bodyLimitations'
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
    heightCm: undefined,
    birthYear: undefined,
    sex: 'not_specified',
    bodyGoal: 'not_set',
    targetWeightKg: undefined,
    targetPace: 'calm',
    activityLevel: 'medium',
    usualSleepTime: undefined,
    usualWakeTime: undefined,
    bodyLimitations: undefined,
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

function normalizeOptionalTextInput(value: string | undefined) {
  const trimmed = value?.trim() ?? ''

  return trimmed.length ? trimmed : undefined
}

function normalizeOptionalNumber(value: number | undefined, options: { min: number; max: number }) {
  if (value === undefined) {
    return undefined
  }

  if (!Number.isFinite(value) || value < options.min || value > options.max) {
    return undefined
  }

  return Number(value.toFixed(1))
}

function buildLocalProfileUpdate(
  state: SettingsState,
  profile: Partial<SettingsProfile>,
): Partial<SettingsState> | null {
  const nextUserId = profile.userId === undefined ? state.userId : profile.userId
  const nextUserName = profile.userName === undefined ? state.userName : normalizeTextInput(profile.userName)
  const nextUserRole = profile.userRole === undefined ? state.userRole : normalizeTextInput(profile.userRole)
  const nextPreferredTone = profile.preferredTone ?? state.preferredTone
  const nextHeightCm =
    profile.heightCm === undefined
      ? state.heightCm
      : normalizeOptionalNumber(profile.heightCm, { min: 80, max: 260 })
  const nextBirthYear =
    profile.birthYear === undefined
      ? state.birthYear
      : normalizeOptionalNumber(Math.round(profile.birthYear), { min: 1900, max: new Date().getFullYear() })
  const nextSex = profile.sex ?? state.sex
  const nextBodyGoal = profile.bodyGoal ?? state.bodyGoal
  const nextTargetWeightKg =
    profile.targetWeightKg === undefined
      ? state.targetWeightKg
      : normalizeOptionalNumber(profile.targetWeightKg, { min: 20, max: 300 })
  const nextTargetPace = profile.targetPace ?? state.targetPace
  const nextActivityLevel = profile.activityLevel ?? state.activityLevel
  const nextUsualSleepTime =
    profile.usualSleepTime === undefined
      ? state.usualSleepTime
      : normalizeOptionalTextInput(profile.usualSleepTime)
  const nextUsualWakeTime =
    profile.usualWakeTime === undefined
      ? state.usualWakeTime
      : normalizeOptionalTextInput(profile.usualWakeTime)
  const nextBodyLimitations =
    profile.bodyLimitations === undefined
      ? state.bodyLimitations
      : normalizeOptionalTextInput(profile.bodyLimitations)

  if (
    state.userId === nextUserId &&
    state.userName === nextUserName &&
    state.userRole === nextUserRole &&
    state.preferredTone === nextPreferredTone &&
    state.heightCm === nextHeightCm &&
    state.birthYear === nextBirthYear &&
    state.sex === nextSex &&
    state.bodyGoal === nextBodyGoal &&
    state.targetWeightKg === nextTargetWeightKg &&
    state.targetPace === nextTargetPace &&
    state.activityLevel === nextActivityLevel &&
    state.usualSleepTime === nextUsualSleepTime &&
    state.usualWakeTime === nextUsualWakeTime &&
    state.bodyLimitations === nextBodyLimitations
  ) {
    return null
  }

  const accountSyncedFieldsChanged =
    state.userId !== nextUserId ||
    state.userName !== nextUserName ||
    state.userRole !== nextUserRole ||
    state.preferredTone !== nextPreferredTone

  return {
    userId: nextUserId,
    userName: nextUserName,
    userRole: nextUserRole,
    preferredTone: nextPreferredTone,
    heightCm: nextHeightCm,
    birthYear: nextBirthYear,
    sex: nextSex,
    bodyGoal: nextBodyGoal,
    targetWeightKg: nextTargetWeightKg,
    targetPace: nextTargetPace,
    activityLevel: nextActivityLevel,
    usualSleepTime: nextUsualSleepTime,
    usualWakeTime: nextUsualWakeTime,
    bodyLimitations: nextBodyLimitations,
    accountSyncedAt: accountSyncedFieldsChanged ? null : state.accountSyncedAt,
    accountSyncVersion: accountSyncedFieldsChanged ? null : state.accountSyncVersion,
    accountSyncUserId: accountSyncedFieldsChanged ? null : state.accountSyncUserId,
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
      version: 5,
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
        heightCm: state.heightCm,
        birthYear: state.birthYear,
        sex: state.sex,
        bodyGoal: state.bodyGoal,
        targetWeightKg: state.targetWeightKg,
        targetPace: state.targetPace,
        activityLevel: state.activityLevel,
        usualSleepTime: state.usualSleepTime,
        usualWakeTime: state.usualWakeTime,
        bodyLimitations: state.bodyLimitations,
        lastBackupExportAt: state.lastBackupExportAt,
        accountSyncedAt: state.accountSyncedAt,
        accountSyncVersion: state.accountSyncVersion,
        accountSyncUserId: state.accountSyncUserId,
      }),
    },
  ),
)
