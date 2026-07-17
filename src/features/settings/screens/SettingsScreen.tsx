import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import {
  Download,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Upload,
  UserRound,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  backupFeedbackMessages,
  exportLifeQuestBackup,
  getBackupReminderStatus,
  getLifeQuestLocalDataSummary,
  importLifeQuestBackup,
} from '@/services/lifequestBackup'
import { applyLifeQuestReward, rewardFeedbackMessages } from '@/services/gameplay'
import { isAuthEnabled } from '@/services/runtimeConfig'
import { GlassCard } from '@/shared/components/GlassCard'
import { PrimaryButton } from '@/shared/components/PrimaryButton'
import { ScreenHeader } from '@/shared/components/ScreenHeader'
import { useAuthStore } from '@/stores/useAuthStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useSyncStore } from '@/stores/useSyncStore'
import type { PreferredTone, SettingsProfile } from '@/shared/types'
import type { SyncStatus } from '@/shared/types'
import type { LifeQuestBackupPreview } from '@/services/lifequestBackup'

type BodyGoal = NonNullable<SettingsProfile['bodyGoal']>
type BodySex = NonNullable<SettingsProfile['sex']>
type TargetPace = NonNullable<SettingsProfile['targetPace']>
type ActivityLevel = NonNullable<SettingsProfile['activityLevel']>

const toneOptions: Array<{
  key: PreferredTone
  label: string
  description: string
}> = [
  {
    key: 'calm',
    label: 'Спокойный',
    description: 'Мягко снижает нагрузку и удерживает устойчивый темп.',
  },
  {
    key: 'direct',
    label: 'Прямой',
    description: 'Коротко, конкретно и без лишних оборотов.',
  },
  {
    key: 'supportive',
    label: 'Поддерживающий',
    description: 'Больше опоры и валидации без давления и токсичной мотивации.',
  },
]

const sexOptions: Array<{ key: BodySex; label: string }> = [
  { key: 'not_specified', label: 'Не указывать' },
  { key: 'male', label: 'Мужской' },
  { key: 'female', label: 'Женский' },
]

const bodyGoalOptions: Array<{ key: BodyGoal; label: string }> = [
  { key: 'not_set', label: 'Не выбрана' },
  { key: 'weight_loss', label: 'Снижение веса' },
  { key: 'maintain', label: 'Поддержание' },
  { key: 'energy', label: 'Энергия' },
  { key: 'health', label: 'Здоровье' },
]

const targetPaceOptions: Array<{ key: TargetPace; label: string }> = [
  { key: 'calm', label: 'Спокойно' },
  { key: 'moderate', label: 'Умеренно' },
  { key: 'active', label: 'Активно' },
]

const activityLevelOptions: Array<{ key: ActivityLevel; label: string }> = [
  { key: 'low', label: 'Низкая' },
  { key: 'medium', label: 'Средняя' },
  { key: 'high', label: 'Высокая' },
]

const settingsInputClass =
  'w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-muted focus:border-primary/50 focus:bg-white/10'

interface ProfileSettingsFormProps {
  initialProfile: SettingsProfile
  onSave: (profile: Partial<SettingsProfile>) => void
}

function getInstallStatusLabel(isInstalledAsApp: boolean) {
  return isInstalledAsApp ? 'Установлено как приложение' : 'Открыто в браузере'
}

function getServiceWorkerStatusLabel(
  hasServiceWorkerSupport: boolean,
  hasActiveServiceWorker: boolean,
) {
  if (!hasServiceWorkerSupport) {
    return 'Service Worker недоступен'
  }

  return hasActiveServiceWorker ? 'Service Worker активен' : 'Service Worker недоступен'
}

function normalizeProfileValue(value: string) {
  return value.trim()
}

function parseOptionalNumber(value: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    return undefined
  }

  const parsed = Number(trimmed.replace(',', '.'))

  return Number.isFinite(parsed) ? parsed : undefined
}

function formatBackupDate(value: string | null) {
  if (!value) {
    return 'Ещё не было'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Дата неизвестна'
  }

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function formatSyncDate(value: string | null) {
  if (!value) {
    return 'Синхронизация ещё не выполнялась'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Дата синхронизации неизвестна'
  }

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function formatAccountSettingsSyncDate(value: string | null) {
  if (!value) {
    return 'Настройки ещё не синхронизировались с аккаунтом'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Дата синхронизации настроек неизвестна'
  }

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function getSyncStatusLabel(status: SyncStatus) {
  switch (status) {
    case 'offline':
      return 'Офлайн'
    case 'error':
      return 'Ошибка синхронизации'
    case 'conflict':
      return 'Требуется разбор конфликтов'
    case 'bootstrapping':
      return 'Готовим синхронизацию'
    case 'syncing':
      return 'Очередь ждёт запуска'
    case 'idle':
      return 'Готов к синхронизации'
    case 'local_only':
    default:
      return 'Синхронизация недоступна без аккаунта'
  }
}

function shortenDeviceId(deviceId: string | null) {
  if (!deviceId) {
    return '—'
  }

  return deviceId.slice(-8)
}

function getAccountSettingsStatusLabel(
  status: 'idle' | 'loading' | 'saving' | 'error',
  hasSyncedProfile: boolean,
) {
  switch (status) {
    case 'loading':
      return 'Загружаем настройки с сервера'
    case 'saving':
      return 'Сохраняем настройки в аккаунт'
    case 'error':
      return 'Ошибка синхронизации настроек'
    case 'idle':
    default:
      return hasSyncedProfile ? 'Сохранено в аккаунт' : 'Настройки не синхронизированы'
  }
}

function ProfileSettingsForm({ initialProfile, onSave }: ProfileSettingsFormProps) {
  const [draftName, setDraftName] = useState(initialProfile.userName)
  const [draftRole, setDraftRole] = useState(initialProfile.userRole)
  const [draftTone, setDraftTone] = useState<PreferredTone>(initialProfile.preferredTone)
  const [draftHeightCm, setDraftHeightCm] = useState(String(initialProfile.heightCm ?? ''))
  const [draftBirthYear, setDraftBirthYear] = useState(String(initialProfile.birthYear ?? ''))
  const [draftSex, setDraftSex] = useState<BodySex>(initialProfile.sex ?? 'not_specified')
  const [draftBodyGoal, setDraftBodyGoal] = useState<BodyGoal>(initialProfile.bodyGoal ?? 'not_set')
  const [draftTargetWeightKg, setDraftTargetWeightKg] = useState(String(initialProfile.targetWeightKg ?? ''))
  const [draftTargetPace, setDraftTargetPace] = useState<TargetPace>(initialProfile.targetPace ?? 'calm')
  const [draftActivityLevel, setDraftActivityLevel] = useState<ActivityLevel>(initialProfile.activityLevel ?? 'medium')
  const [draftUsualSleepTime, setDraftUsualSleepTime] = useState(initialProfile.usualSleepTime ?? '')
  const [draftUsualWakeTime, setDraftUsualWakeTime] = useState(initialProfile.usualWakeTime ?? '')
  const [draftBodyLimitations, setDraftBodyLimitations] = useState(initialProfile.bodyLimitations ?? '')

  const normalizedName = normalizeProfileValue(draftName)
  const normalizedRole = normalizeProfileValue(draftRole)
  const normalizedHeightCm = parseOptionalNumber(draftHeightCm)
  const normalizedBirthYear = parseOptionalNumber(draftBirthYear)
  const normalizedTargetWeightKg = parseOptionalNumber(draftTargetWeightKg)
  const normalizedSleepTime = normalizeProfileValue(draftUsualSleepTime)
  const normalizedWakeTime = normalizeProfileValue(draftUsualWakeTime)
  const normalizedBodyLimitations = normalizeProfileValue(draftBodyLimitations)
  const isDirty =
    normalizedName !== initialProfile.userName ||
    normalizedRole !== initialProfile.userRole ||
    draftTone !== initialProfile.preferredTone ||
    normalizedHeightCm !== initialProfile.heightCm ||
    normalizedBirthYear !== initialProfile.birthYear ||
    draftSex !== (initialProfile.sex ?? 'not_specified') ||
    draftBodyGoal !== (initialProfile.bodyGoal ?? 'not_set') ||
    normalizedTargetWeightKg !== initialProfile.targetWeightKg ||
    draftTargetPace !== (initialProfile.targetPace ?? 'calm') ||
    draftActivityLevel !== (initialProfile.activityLevel ?? 'medium') ||
    normalizedSleepTime !== (initialProfile.usualSleepTime ?? '') ||
    normalizedWakeTime !== (initialProfile.usualWakeTime ?? '') ||
    normalizedBodyLimitations !== (initialProfile.bodyLimitations ?? '')

  return (
    <div className="mt-4 space-y-4">
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-white">Имя пользователя</span>
        <input
          value={draftName}
          onChange={(event) => setDraftName(event.target.value)}
          className={settingsInputClass}
          placeholder="Как система должна к тебе обращаться"
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-white">Роль</span>
        <input
          value={draftRole}
          onChange={(event) => setDraftRole(event.target.value)}
          className={settingsInputClass}
          placeholder="Например: Оператор системы"
        />
      </label>

      <div>
        <span className="mb-2 block text-sm font-medium text-white">Предпочтительный тон</span>
        <div className="space-y-2">
          {toneOptions.map((toneOption) => {
            const active = draftTone === toneOption.key

            return (
              <button
                key={toneOption.key}
                type="button"
                onClick={() => setDraftTone(toneOption.key)}
                className={`w-full rounded-3xl border p-4 text-left transition ${
                  active
                    ? 'border-primary/35 bg-primary/12'
                    : 'border-white/10 bg-white/5 hover:border-primary/20 hover:bg-white/8'
                }`}
              >
                <p className="font-medium text-white">{toneOption.label}</p>
                <p className="mt-1 text-sm leading-6 text-muted">{toneOption.description}</p>
              </button>
            )
          })}
        </div>
      </div>

      <details className="rounded-3xl border border-cyan/15 bg-cyan/5 p-4" open>
        <summary className="cursor-pointer text-sm font-medium text-white">Профиль тела и энергии</summary>
        <p className="mt-2 text-sm leading-6 text-slate-200">
          Эти поля помогают Ядру точнее понимать цель, темп и ограничения. Заполняй только то, что уже понятно.
        </p>
        <div className="mt-4 grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-white">Рост, см</span>
              <input
                className={settingsInputClass}
                inputMode="decimal"
                min="80"
                type="number"
                value={draftHeightCm}
                onChange={(event) => setDraftHeightCm(event.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-white">Год рождения</span>
              <input
                className={settingsInputClass}
                inputMode="numeric"
                min="1900"
                type="number"
                value={draftBirthYear}
                onChange={(event) => setDraftBirthYear(event.target.value)}
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-white">Пол</span>
            <select className={settingsInputClass} value={draftSex} onChange={(event) => setDraftSex(event.target.value as BodySex)}>
              {sexOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-white">Цель тела</span>
            <select className={settingsInputClass} value={draftBodyGoal} onChange={(event) => setDraftBodyGoal(event.target.value as BodyGoal)}>
              {bodyGoalOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-white">Целевой вес</span>
              <input
                className={settingsInputClass}
                inputMode="decimal"
                min="20"
                step="0.1"
                type="number"
                value={draftTargetWeightKg}
                onChange={(event) => setDraftTargetWeightKg(event.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-white">Темп</span>
              <select className={settingsInputClass} value={draftTargetPace} onChange={(event) => setDraftTargetPace(event.target.value as TargetPace)}>
                {targetPaceOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-white">Активность</span>
            <select className={settingsInputClass} value={draftActivityLevel} onChange={(event) => setDraftActivityLevel(event.target.value as ActivityLevel)}>
              {activityLevelOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-white">Обычно ложусь</span>
              <input className={settingsInputClass} type="time" value={draftUsualSleepTime} onChange={(event) => setDraftUsualSleepTime(event.target.value)} />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-white">Обычно встаю</span>
              <input className={settingsInputClass} type="time" value={draftUsualWakeTime} onChange={(event) => setDraftUsualWakeTime(event.target.value)} />
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-white">Ограничения/заметки по телу</span>
            <textarea
              className={`${settingsInputClass} min-h-24`}
              value={draftBodyLimitations}
              onChange={(event) => setDraftBodyLimitations(event.target.value)}
              placeholder="Например: берегу колени, не планировать прыжковые тренировки."
            />
          </label>
        </div>
      </details>

      <PrimaryButton
        fullWidth
        disabled={!isDirty}
        icon={<ShieldCheck className="h-4 w-4" />}
        onClick={() =>
          onSave({
            userName: normalizedName,
            userRole: normalizedRole,
            preferredTone: draftTone,
            heightCm: normalizedHeightCm,
            birthYear: normalizedBirthYear,
            sex: draftSex,
            bodyGoal: draftBodyGoal,
            targetWeightKg: normalizedTargetWeightKg,
            targetPace: draftTargetPace,
            activityLevel: draftActivityLevel,
            usualSleepTime: normalizedSleepTime || undefined,
            usualWakeTime: normalizedWakeTime || undefined,
            bodyLimitations: normalizedBodyLimitations || undefined,
          })
        }
      >
        Сохранить профиль
      </PrimaryButton>
    </div>
  )
}

export function SettingsScreen() {
  const navigate = useNavigate()
  const userName = useSettingsStore((state) => state.userName)
  const userRole = useSettingsStore((state) => state.userRole)
  const preferredTone = useSettingsStore((state) => state.preferredTone)
  const heightCm = useSettingsStore((state) => state.heightCm)
  const birthYear = useSettingsStore((state) => state.birthYear)
  const sex = useSettingsStore((state) => state.sex)
  const bodyGoal = useSettingsStore((state) => state.bodyGoal)
  const targetWeightKg = useSettingsStore((state) => state.targetWeightKg)
  const targetPace = useSettingsStore((state) => state.targetPace)
  const activityLevel = useSettingsStore((state) => state.activityLevel)
  const usualSleepTime = useSettingsStore((state) => state.usualSleepTime)
  const usualWakeTime = useSettingsStore((state) => state.usualWakeTime)
  const bodyLimitations = useSettingsStore((state) => state.bodyLimitations)
  const lastBackupExportAt = useSettingsStore((state) => state.lastBackupExportAt)
  const lastBackupAt = useSettingsStore((state) => state.lastBackupAt)
  const lastBackupReason = useSettingsStore((state) => state.lastBackupReason)
  const backupReminderSnoozedUntil = useSettingsStore((state) => state.backupReminderSnoozedUntil)
  const accountSyncStatus = useSettingsStore((state) => state.accountSyncStatus)
  const accountSyncError = useSettingsStore((state) => state.accountSyncError)
  const accountSyncedAt = useSettingsStore((state) => state.accountSyncedAt)
  const accountSyncVersion = useSettingsStore((state) => state.accountSyncVersion)
  const accountSyncUserId = useSettingsStore((state) => state.accountSyncUserId)
  const appVersion = useSettingsStore((state) => state.appVersion)
  const isInstalledAsApp = useSettingsStore((state) => state.isInstalledAsApp)
  const hasServiceWorkerSupport = useSettingsStore((state) => state.hasServiceWorkerSupport)
  const hasActiveServiceWorker = useSettingsStore((state) => state.hasActiveServiceWorker)
  const hasWaitingServiceWorker = useSettingsStore((state) => state.hasWaitingServiceWorker)
  const updateProfile = useSettingsStore((state) => state.updateProfile)
  const resetOnboarding = useSettingsStore((state) => state.resetOnboarding)
  const fetchAccountSettingsProfile = useSettingsStore((state) => state.fetchAccountSettingsProfile)
  const pushAccountSettingsProfile = useSettingsStore((state) => state.pushAccountSettingsProfile)
  const recordBackupExport = useSettingsStore((state) => state.recordBackupExport)
  const resetDemoData = useSettingsStore((state) => state.resetDemoData)
  const clearAllLocalData = useSettingsStore((state) => state.clearAllLocalData)
  const checkPwaStatus = useSettingsStore((state) => state.checkPwaStatus)
  const applyPwaUpdate = useSettingsStore((state) => state.applyPwaUpdate)
  const snoozeBackupReminder = useSettingsStore((state) => state.snoozeBackupReminder)
  const authMode = useAuthStore((state) => state.mode)
  const authStatus = useAuthStore((state) => state.status)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const authUser = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const authRuntimeEnabled = isAuthEnabled()
  const syncStatus = useSyncStore((state) => state.status)
  const syncDeviceId = useSyncStore((state) => state.deviceId)
  const syncLastSyncAt = useSyncStore((state) => state.lastSyncAt)
  const syncQueueLength = useSyncStore((state) => state.queue.length)
  const syncLastError = useSyncStore((state) => state.lastError)
  const bootstrapAccountSync = useSyncStore((state) => state.bootstrapAccountSync)

  const importInputRef = useRef<HTMLInputElement | null>(null)
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false)
  const [isApplyingUpdate, setIsApplyingUpdate] = useState(false)
  const [isExportingBackup, setIsExportingBackup] = useState(false)
  const [isImportingBackup, setIsImportingBackup] = useState(false)
  const [syncFeedback, setSyncFeedback] = useState<{
    tone: 'success' | 'error'
    message: string
  } | null>(null)
  const [accountSettingsFeedback, setAccountSettingsFeedback] = useState<{
    tone: 'success' | 'error'
    message: string
  } | null>(null)
  const [profileFeedback, setProfileFeedback] = useState('')
  const [backupStatus, setBackupStatus] = useState<{
    tone: 'success' | 'error'
    message: string
  } | null>(null)
  const [backupImportPreview, setBackupImportPreview] = useState<LifeQuestBackupPreview | null>(null)
  const [pendingBackupImportFile, setPendingBackupImportFile] = useState<File | null>(null)
  const [backupImportApplied, setBackupImportApplied] = useState(false)

  const profileFormKey = useMemo(
    () =>
      [
        userName,
        userRole,
        preferredTone,
        heightCm,
        birthYear,
        sex,
        bodyGoal,
        targetWeightKg,
        targetPace,
        activityLevel,
        usualSleepTime,
        usualWakeTime,
        bodyLimitations,
      ].join('|'),
    [
      activityLevel,
      birthYear,
      bodyGoal,
      bodyLimitations,
      heightCm,
      preferredTone,
      sex,
      targetPace,
      targetWeightKg,
      usualSleepTime,
      usualWakeTime,
      userName,
      userRole,
    ],
  )
  const profileDefaults = useMemo<SettingsProfile>(
    () => ({
      userName,
      userRole,
      preferredTone,
      heightCm,
      birthYear,
      sex,
      bodyGoal,
      targetWeightKg,
      targetPace,
      activityLevel,
      usualSleepTime,
      usualWakeTime,
      bodyLimitations,
      userId: authUser?.userId,
    }),
    [
      activityLevel,
      authUser?.userId,
      birthYear,
      bodyGoal,
      bodyLimitations,
      heightCm,
      preferredTone,
      sex,
      targetPace,
      targetWeightKg,
      usualSleepTime,
      usualWakeTime,
      userName,
      userRole,
    ],
  )
  const localDataSummary = useMemo(() => getLifeQuestLocalDataSummary(), [])
  const backupReminderStatus = useMemo(
    () =>
      getBackupReminderStatus({
        lastBackupAt,
        lastBackupExportAt,
        lastBackupReason,
        backupReminderSnoozedUntil,
        localDataKeysCount: localDataSummary.keysCount,
        hasValuableLocalData: localDataSummary.hasValuableLocalData,
      }),
    [
      backupReminderSnoozedUntil,
      lastBackupAt,
      lastBackupExportAt,
      lastBackupReason,
      localDataSummary.hasValuableLocalData,
      localDataSummary.keysCount,
    ],
  )
  const lastBackupLabel = useMemo(
    () => formatBackupDate(lastBackupAt ?? lastBackupExportAt),
    [lastBackupAt, lastBackupExportAt],
  )
  const accountStatusLabel = useMemo(
    () => (authMode === 'account' && isAuthenticated ? 'Аккаунт подключён' : 'Локальный режим'),
    [authMode, isAuthenticated],
  )
  const syncStatusLabel = useMemo(
    () =>
      authMode === 'account' && isAuthenticated
        ? getSyncStatusLabel(syncStatus)
        : 'Синхронизация недоступна без аккаунта',
    [authMode, isAuthenticated, syncStatus],
  )
  const syncLastSyncLabel = useMemo(() => formatSyncDate(syncLastSyncAt), [syncLastSyncAt])
  const accountSyncMetaMatchesUser = useMemo(
    () => Boolean(authUser?.userId) && authUser?.userId === accountSyncUserId,
    [accountSyncUserId, authUser?.userId],
  )
  const accountSettingsSyncedAtLabel = useMemo(
    () => formatAccountSettingsSyncDate(accountSyncMetaMatchesUser ? accountSyncedAt : null),
    [accountSyncMetaMatchesUser, accountSyncedAt],
  )
  const accountSettingsSyncVersionLabel = useMemo(
    () =>
      accountSyncMetaMatchesUser && accountSyncVersion != null
        ? String(accountSyncVersion)
        : '—',
    [accountSyncMetaMatchesUser, accountSyncVersion],
  )
  const hasSyncedAccountProfile = useMemo(
    () => accountSyncMetaMatchesUser && Boolean(accountSyncedAt) && accountSyncVersion != null,
    [accountSyncMetaMatchesUser, accountSyncedAt, accountSyncVersion],
  )
  const accountSettingsStatusLabel = useMemo(
    () => getAccountSettingsStatusLabel(accountSyncStatus, hasSyncedAccountProfile),
    [accountSyncStatus, hasSyncedAccountProfile],
  )
  const shortDeviceId = useMemo(() => shortenDeviceId(syncDeviceId), [syncDeviceId])
  const isLoggingOut = authStatus === 'logging_out'
  const isCheckingSyncBootstrap = syncStatus === 'bootstrapping'
  const isFetchingAccountSettings = accountSyncStatus === 'loading'
  const isSavingAccountSettings = accountSyncStatus === 'saving'

  useEffect(() => {
    void checkPwaStatus()

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void checkPwaStatus()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [checkPwaStatus])

  const handleResetDemoData = () => {
    const shouldReset = window.confirm(
      'Сбросить demo-данные и вернуть LifeQuest к исходному локальному состоянию?',
    )

    if (!shouldReset) {
      return
    }

    resetDemoData()
  }

  const handleClearAllLocalData = async () => {
    const shouldClear = window.confirm(
      'Очистить все локальные данные на этом устройстве? Это удалит маршруты, прогресс, настройки и локальный кэш приложения.',
    )

    if (!shouldClear) {
      return
    }

    await clearAllLocalData()
  }

  const handleRestartOnboarding = () => {
    resetOnboarding()
    navigate('/onboarding')
  }

  const handleExportBackup = () => {
    setBackupStatus(null)
    setIsExportingBackup(true)

    try {
      const result = exportLifeQuestBackup()

      applyLifeQuestReward(
        {
          xp: 2,
          recoveryXp: 1,
          consistencyXp: 1,
          sector: 'stability',
          sourceId: `backup:${result.backup.exportedAt}`,
        },
        backupFeedbackMessages.protected,
        rewardFeedbackMessages.backupCreated,
      )
      recordBackupExport(result.backup.exportedAt)
      setBackupImportPreview(null)
      setPendingBackupImportFile(null)
      setBackupImportApplied(false)
      setBackupStatus({
        tone: 'success',
        message: `Резервная копия создана: ${result.fileName}`,
      })
    } catch {
      setBackupStatus({
        tone: 'error',
        message: 'Не удалось экспортировать backup. Попробуй ещё раз.',
      })
    } finally {
      setIsExportingBackup(false)
    }
  }

  const handleImportClick = () => {
    setBackupStatus(null)
    setBackupImportPreview(null)
    setPendingBackupImportFile(null)
    setBackupImportApplied(false)
    importInputRef.current?.click()
  }

  const handleImportFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    setBackupStatus(null)
    setIsImportingBackup(true)

    try {
      const preview = await importLifeQuestBackup(file, { apply: false })
      setPendingBackupImportFile(file)
      setBackupImportPreview(preview.preview)
      setBackupImportApplied(false)
      setBackupStatus({
        tone: 'success',
        message: 'Backup распознан. Проверь разделы перед импортом.',
      })
    } catch (error) {
      setBackupStatus({
        tone: 'error',
        message:
          error instanceof Error ? error.message : 'Не удалось импортировать backup.',
      })
    } finally {
      setIsImportingBackup(false)
    }
  }

  const handleConfirmBackupImport = async () => {
    if (!pendingBackupImportFile) {
      return
    }

    setIsImportingBackup(true)
    setBackupStatus(null)

    try {
      const result = await importLifeQuestBackup(pendingBackupImportFile)

      setBackupImportApplied(true)
      setBackupImportPreview(result.preview)
      setBackupStatus({
        tone: 'success',
        message: `Backup импортирован. Восстановлено разделов: ${result.preview.sections.length}. Перезагрузи приложение, чтобы применить состояние полностью.`,
      })
    } catch (error) {
      setBackupStatus({
        tone: 'error',
        message:
          error instanceof Error ? error.message : 'Не удалось импортировать backup.',
      })
    } finally {
      setIsImportingBackup(false)
    }
  }

  const handleCancelBackupImport = () => {
    setBackupImportPreview(null)
    setPendingBackupImportFile(null)
    setBackupImportApplied(false)
    setBackupStatus(null)
  }

  const handleReloadAfterImport = () => {
    window.location.replace('/today')
  }

  const handleCheckUpdate = async () => {
    setIsCheckingUpdate(true)

    try {
      await checkPwaStatus({ checkForUpdates: true })
    } finally {
      setIsCheckingUpdate(false)
    }
  }

  const handleApplyUpdate = async () => {
    setIsApplyingUpdate(true)

    try {
      await applyPwaUpdate()
    } finally {
      setIsApplyingUpdate(false)
    }
  }

  const handleCheckSyncBootstrap = async () => {
    setSyncFeedback(null)

    const result = await bootstrapAccountSync()

    setSyncFeedback({
      tone: result.success ? 'success' : 'error',
      message: result.success
        ? 'Сервер доступен. На этом этапе проверяется только связь с аккаунтом, без синхронизации данных.'
        : result.message,
    })
  }

  const handleFetchAccountSettings = async () => {
    setAccountSettingsFeedback(null)

    const result = await fetchAccountSettingsProfile()

    setAccountSettingsFeedback({
      tone: result.success ? 'success' : 'error',
      message: result.message,
    })
  }

  const handlePushAccountSettings = async () => {
    setAccountSettingsFeedback(null)

    const result = await pushAccountSettingsProfile()

    setAccountSettingsFeedback({
      tone: result.success ? 'success' : 'error',
      message: result.message,
    })
  }

  const handleLogout = async () => {
    await logout()
    setSyncFeedback(null)
    setAccountSettingsFeedback(null)
    setBackupStatus({
      tone: 'success',
      message: 'Аккаунт отключён. Локальные данные на устройстве сохранены.',
    })
  }

  return (
    <section className="pb-6">
      <ScreenHeader
        title="Настройки"
        subtitle="Управляй локальными данными, профилем, режимом приложения и будущей готовностью к аккаунтам без лишнего шума."
      />

      <GlassCard tone="strong" className="mb-5">
        <p className="text-xs uppercase tracking-[0.24em] text-primary/80">Профиль LifeQuest</p>
        <p className="mt-3 text-sm leading-6 text-slate-200">
          Эти данные помогают Ядру точнее понимать тело, энергию и цели. Всё хранится локально.
        </p>
        <ProfileSettingsForm
          key={profileFormKey}
          initialProfile={profileDefaults}
          onSave={(profile) => {
            updateProfile(profile)
            setProfileFeedback('Профиль обновлён')
            window.setTimeout(() => setProfileFeedback(''), 1800)
          }}
        />
        {profileFeedback ? (
          <p className="mt-3 rounded-full border border-success/25 bg-success/10 px-4 py-2 text-sm text-success">
            {profileFeedback}
          </p>
        ) : null}

        <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Первичная настройка</p>
          <p className="mt-2 text-sm leading-6 text-slate-200">
            Можно заново пройти короткий маршрут: профиль, старт тела, старт денег и первый шаг на сегодня.
          </p>
          <div className="mt-4">
            <PrimaryButton
              fullWidth
              tone="secondary"
              icon={<Sparkles className="h-4 w-4" />}
              onClick={handleRestartOnboarding}
            >
              Пройти первичную настройку заново
            </PrimaryButton>
          </div>
        </div>

        <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Профиль в аккаунте</p>
          <p className="mt-2 text-sm font-medium text-white">{accountSettingsStatusLabel}</p>
          <p className="mt-2 text-sm leading-6 text-slate-200">
            {isAuthenticated
              ? 'Этот блок синхронизирует только userName, userRole и preferredTone. Остальные данные LifeQuest пока остаются только локальными.'
              : authRuntimeEnabled
                ? 'Сейчас профиль сохраняется только локально. Чтобы синхронизировать имя, роль и тон с аккаунтом, сначала войди в аккаунт.'
                : 'Сейчас профиль сохраняется только локально. Аккаунты и синхронизация выключены в этой production-сборке.'}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">Последняя sync</p>
              <p className="mt-2 text-sm font-medium text-white">{accountSettingsSyncedAtLabel}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">Sync version</p>
              <p className="mt-2 text-sm font-medium text-white">{accountSettingsSyncVersionLabel}</p>
            </div>
          </div>

          {accountSettingsFeedback ? (
            <div
              className={`mt-4 rounded-3xl border p-4 text-sm leading-6 ${
                accountSettingsFeedback.tone === 'success'
                  ? 'border-success/20 bg-success/10 text-slate-100'
                  : 'border-danger/20 bg-danger/10 text-slate-100'
              }`}
            >
              {accountSettingsFeedback.message}
            </div>
          ) : null}

          {accountSyncStatus === 'error' && accountSyncError && !accountSettingsFeedback ? (
            <div className="mt-4 rounded-3xl border border-danger/20 bg-danger/10 p-4 text-sm leading-6 text-slate-100">
              {accountSyncError}
            </div>
          ) : null}

          {isAuthenticated ? (
            <div className="mt-4 grid gap-3">
              <PrimaryButton
                tone="secondary"
                fullWidth
                disabled={isFetchingAccountSettings || isSavingAccountSettings}
                icon={<Download className="h-4 w-4" />}
                onClick={() => {
                  void handleFetchAccountSettings()
                }}
              >
                {isFetchingAccountSettings ? 'Загружаем настройки…' : 'Загрузить настройки с сервера'}
              </PrimaryButton>
              <PrimaryButton
                fullWidth
                disabled={isFetchingAccountSettings || isSavingAccountSettings}
                icon={<Upload className="h-4 w-4" />}
                onClick={() => {
                  void handlePushAccountSettings()
                }}
              >
                {isSavingAccountSettings ? 'Сохраняем настройки…' : 'Сохранить настройки в аккаунт'}
              </PrimaryButton>
            </div>
          ) : null}
        </div>
      </GlassCard>

      <GlassCard className="mb-5 border border-cyan/20 bg-cyan/5">
        <p className="text-xs uppercase tracking-[0.24em] text-cyan/80">Аккаунт и синхронизация</p>

        <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Статус</p>
          <p className="mt-2 text-sm font-medium text-white">{accountStatusLabel}</p>
          <p className="mt-2 text-sm leading-6 text-slate-200">
            {isAuthenticated
              ? 'Сессия активна. Сама синхронизация будет добавлена позже, поэтому данные всё ещё хранятся локально на этом устройстве.'
              : authRuntimeEnabled
                ? 'Сейчас LifeQuest по-прежнему полностью доступен локально на этом устройстве. Backup остаётся рекомендуемым способом сохранить данные до появления синхронизации.'
                : 'Аккаунты выключены в этой сборке. LifeQuest полностью доступен локально, а backup остаётся главным способом сохранить данные.'}
          </p>
        </div>

        {isAuthenticated && authUser ? (
          <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">Подключённый аккаунт</p>
            <p className="mt-2 text-sm font-medium text-white">
              {authUser.name || userName || 'Пользователь'}
            </p>
            <p className="mt-2 text-sm text-slate-200">{authUser.email}</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Локальные данные пока не мигрируют в аккаунт автоматически. Миграция и полноценная синхронизация будут добавлены отдельным этапом.
            </p>
          </div>
        ) : (
          <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">Локальный профиль</p>
            <p className="mt-2 text-sm text-white">
              {userName ? `Локальный профиль: ${userName}` : 'Локальный профиль готов'}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Можно продолжать пользоваться приложением без аккаунта и при необходимости сохранить прогресс через backup.
            </p>
          </div>
        )}

        <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Готовность синхронизации</p>
          <p className="mt-2 text-sm font-medium text-white">{syncStatusLabel}</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            {isAuthenticated
              ? 'Сама синхронизация будет добавлена позже. Сейчас данные всё ещё хранятся локально, а этот блок показывает только готовность режима аккаунта.'
              : 'Синхронизация пока недоступна без аккаунта. До её появления надёжнее всего сохранять состояние через backup.'}
          </p>
          {isAuthenticated ? (
            <p className="mt-2 text-sm leading-6 text-slate-200">
              На этом этапе проверяется только связь с сервером. Данные пока не синхронизируются.
            </p>
          ) : null}

          {isAuthenticated ? (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted">ID устройства</p>
                <p className="mt-2 text-sm font-medium text-white">{shortDeviceId}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted">Очередь изменений</p>
                <p className="mt-2 text-sm font-medium text-white">{syncQueueLength}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-4 col-span-2">
                <p className="text-xs uppercase tracking-[0.18em] text-muted">Последняя синхронизация</p>
                <p className="mt-2 text-sm font-medium text-white">{syncLastSyncLabel}</p>
              </div>
            </div>
          ) : null}

          {isAuthenticated ? (
            <div className="mt-4">
              <PrimaryButton
                tone="secondary"
                fullWidth
                disabled={isCheckingSyncBootstrap}
                icon={<RefreshCw className="h-4 w-4" />}
                onClick={() => {
                  void handleCheckSyncBootstrap()
                }}
              >
                {isCheckingSyncBootstrap ? 'Проверяем синхронизацию…' : 'Проверить синхронизацию'}
              </PrimaryButton>
            </div>
          ) : null}

          {isAuthenticated && syncFeedback ? (
            <div
              className={`mt-4 rounded-3xl border p-4 text-sm leading-6 ${
                syncFeedback.tone === 'success'
                  ? 'border-success/20 bg-success/10 text-slate-100'
                  : 'border-danger/20 bg-danger/10 text-slate-100'
              }`}
            >
              {syncFeedback.message}
            </div>
          ) : null}

          {isAuthenticated && syncStatus === 'error' && syncLastError && !syncFeedback ? (
            <div className="mt-4 rounded-3xl border border-danger/20 bg-danger/10 p-4 text-sm leading-6 text-slate-100">
              {syncLastError}
            </div>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3">
          {isAuthenticated ? (
            <PrimaryButton
              tone="ghost"
              fullWidth
              disabled={isLoggingOut}
              icon={<LogOut className="h-4 w-4" />}
              onClick={() => {
                void handleLogout()
              }}
            >
              {isLoggingOut ? 'Отключаем аккаунт…' : 'Выйти'}
            </PrimaryButton>
          ) : authRuntimeEnabled ? (
            <PrimaryButton
              tone="secondary"
              fullWidth
              icon={<UserRound className="h-4 w-4" />}
              onClick={() => navigate('/auth')}
            >
              Войти / создать аккаунт
            </PrimaryButton>
          ) : (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-muted">
              Вход появится позже. Сейчас приложение работает локально без сервера.
            </div>
          )}
        </div>
      </GlassCard>

      <GlassCard className="mb-5 border border-warning/20 bg-warning/5">
        <p className="text-xs uppercase tracking-[0.24em] text-warning/80">Резервная копия</p>
        <p className="mt-3 text-sm leading-6 text-slate-200">
          Данные живут на этом устройстве. Экспорт создаёт один JSON-файл для восстановления в PWA или будущей APK-сборке.
        </p>
        <p className="mt-3 text-sm leading-6 text-slate-200">
          {backupFeedbackMessages.settingsNote}
        </p>

        <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Последний backup</p>
          <p className="mt-2 text-sm font-medium text-white">{lastBackupLabel}</p>
        </div>

        {backupReminderStatus.active ? (
          <div className="mt-4 rounded-3xl border border-cyan/20 bg-cyan/10 p-4">
            <p className="text-sm font-medium text-white">Рекомендуется обновить резервную копию</p>
            <p className="mt-2 text-sm leading-6 text-slate-200">{backupReminderStatus.message}</p>
            <button
              type="button"
              className="mt-3 text-sm font-medium text-cyan transition hover:text-white"
              onClick={() => snoozeBackupReminder()}
            >
              Напомнить позже
            </button>
          </div>
        ) : null}

        {backupStatus ? (
          <div
            className={`mt-4 rounded-3xl border p-4 text-sm leading-6 ${
              backupStatus.tone === 'success'
                ? 'border-success/20 bg-success/10 text-slate-100'
                : 'border-danger/20 bg-danger/10 text-slate-100'
            }`}
          >
            {backupStatus.message}
          </div>
        ) : null}

        {backupImportPreview ? (
          <div className="mt-4 rounded-3xl border border-primary/20 bg-primary/10 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-primary/80">
              Найдена резервная копия LifeQuest
            </p>
            <div className="mt-3 space-y-2 text-sm leading-6 text-slate-200">
              <p>
                Дата: <span className="font-medium text-white">{backupImportPreview.exportedAtLabel}</span>
              </p>
              <p>
                Версия: <span className="font-medium text-white">v{backupImportPreview.backup.backupVersion}</span>
              </p>
              <p>
                Разделы:{' '}
                <span className="font-medium text-white">
                  {backupImportPreview.sections.join(', ')}
                </span>
              </p>
              <p>Импорт заменит текущие локальные данные на этом устройстве.</p>
            </div>
            <div className="mt-4 grid gap-3">
              {backupImportApplied ? (
                <PrimaryButton fullWidth icon={<RefreshCw className="h-4 w-4" />} onClick={handleReloadAfterImport}>
                  Перезагрузить приложение
                </PrimaryButton>
              ) : (
                <PrimaryButton
                  fullWidth
                  disabled={isImportingBackup}
                  icon={<Upload className="h-4 w-4" />}
                  onClick={() => {
                    void handleConfirmBackupImport()
                  }}
                >
                  {isImportingBackup ? 'Импортируем backup…' : 'Импортировать'}
                </PrimaryButton>
              )}
              <PrimaryButton
                tone="secondary"
                fullWidth
                disabled={isImportingBackup}
                onClick={handleCancelBackupImport}
              >
                Отмена
              </PrimaryButton>
            </div>
          </div>
        ) : null}

        <div className="mt-4 grid gap-3">
          <PrimaryButton
            tone="secondary"
            fullWidth
            disabled={isExportingBackup || isImportingBackup}
            icon={<Download className="h-4 w-4" />}
            onClick={handleExportBackup}
          >
            {isExportingBackup ? 'Готовим backup…' : 'Скачать backup'}
          </PrimaryButton>
          <PrimaryButton
            tone="secondary"
            fullWidth
            disabled={isImportingBackup || isExportingBackup}
            icon={<Upload className="h-4 w-4" />}
            onClick={handleImportClick}
          >
            {isImportingBackup ? 'Проверяем backup…' : 'Импортировать backup'}
          </PrimaryButton>
          <PrimaryButton
            tone="secondary"
            fullWidth
            disabled={isImportingBackup || isExportingBackup}
            icon={<RefreshCw className="h-4 w-4" />}
            onClick={handleResetDemoData}
          >
            Сбросить demo-данные
          </PrimaryButton>
          <PrimaryButton
            tone="warning"
            fullWidth
            disabled={isImportingBackup || isExportingBackup}
            onClick={() => {
              void handleClearAllLocalData()
            }}
          >
            Очистить все локальные данные
          </PrimaryButton>
        </div>

        <input
          ref={importInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(event) => {
            void handleImportFileChange(event)
          }}
        />
      </GlassCard>

      <GlassCard className="mb-5">
        <p className="text-xs uppercase tracking-[0.24em] text-cyan/80">PWA</p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">Режим запуска</p>
            <p className="mt-2 text-sm font-medium text-white">
              {getInstallStatusLabel(isInstalledAsApp)}
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">Service Worker</p>
            <p className="mt-2 text-sm font-medium text-white">
              {getServiceWorkerStatusLabel(hasServiceWorkerSupport, hasActiveServiceWorker)}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm leading-6 text-slate-200">
            {hasWaitingServiceWorker
              ? 'Обновление уже готово. Можно применить его прямо сейчас.'
              : 'Нажми «Проверить обновление», чтобы запросить свежую версию service worker и статических файлов.'}
          </p>
        </div>

        <div className="mt-4 grid gap-3">
          <PrimaryButton
            tone="secondary"
            fullWidth
            disabled={isCheckingUpdate}
            icon={<Sparkles className="h-4 w-4" />}
            onClick={() => {
              void handleCheckUpdate()
            }}
          >
            {isCheckingUpdate ? 'Проверяем обновление…' : 'Проверить обновление'}
          </PrimaryButton>

          {hasWaitingServiceWorker ? (
            <PrimaryButton
              fullWidth
              disabled={isApplyingUpdate}
              onClick={() => {
                void handleApplyUpdate()
              }}
            >
              {isApplyingUpdate ? 'Обновляем приложение…' : 'Обновить приложение'}
            </PrimaryButton>
          ) : null}
        </div>
      </GlassCard>

      <GlassCard>
        <p className="text-xs uppercase tracking-[0.24em] text-muted">О приложении</p>
        <div className="mt-4 space-y-3 text-sm leading-6 text-slate-200">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">Версия</p>
            <p className="mt-2 text-white">{appVersion}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">Режим</p>
            <p className="mt-2 text-white">local-first MVP</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">AI</p>
            <p className="mt-2 text-white">
              ChatGPT используется внешне через Центр промптов, API не подключён.
            </p>
          </div>
        </div>
      </GlassCard>
    </section>
  )
}
