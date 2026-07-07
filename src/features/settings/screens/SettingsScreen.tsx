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
import { exportLifeQuestBackup, importLifeQuestBackup } from '@/services/lifequestBackup'
import { GlassCard } from '@/shared/components/GlassCard'
import { PrimaryButton } from '@/shared/components/PrimaryButton'
import { ScreenHeader } from '@/shared/components/ScreenHeader'
import { useAuthStore } from '@/stores/useAuthStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useSyncStore } from '@/stores/useSyncStore'
import type { PreferredTone, SettingsProfile } from '@/shared/types'
import type { SyncStatus } from '@/shared/types'

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

  const normalizedName = normalizeProfileValue(draftName)
  const normalizedRole = normalizeProfileValue(draftRole)
  const isDirty =
    normalizedName !== initialProfile.userName ||
    normalizedRole !== initialProfile.userRole ||
    draftTone !== initialProfile.preferredTone

  return (
    <div className="mt-4 space-y-4">
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-white">Имя пользователя</span>
        <input
          value={draftName}
          onChange={(event) => setDraftName(event.target.value)}
          className="w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-muted focus:border-primary/50 focus:bg-white/10"
          placeholder="Как система должна к тебе обращаться"
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-white">Роль</span>
        <input
          value={draftRole}
          onChange={(event) => setDraftRole(event.target.value)}
          className="w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-muted focus:border-primary/50 focus:bg-white/10"
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

      <PrimaryButton
        fullWidth
        disabled={!isDirty}
        icon={<ShieldCheck className="h-4 w-4" />}
        onClick={() =>
          onSave({
            userName: normalizedName,
            userRole: normalizedRole,
            preferredTone: draftTone,
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
  const lastBackupExportAt = useSettingsStore((state) => state.lastBackupExportAt)
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
  const fetchAccountSettingsProfile = useSettingsStore((state) => state.fetchAccountSettingsProfile)
  const pushAccountSettingsProfile = useSettingsStore((state) => state.pushAccountSettingsProfile)
  const recordBackupExport = useSettingsStore((state) => state.recordBackupExport)
  const resetDemoData = useSettingsStore((state) => state.resetDemoData)
  const clearAllLocalData = useSettingsStore((state) => state.clearAllLocalData)
  const checkPwaStatus = useSettingsStore((state) => state.checkPwaStatus)
  const applyPwaUpdate = useSettingsStore((state) => state.applyPwaUpdate)
  const authMode = useAuthStore((state) => state.mode)
  const authStatus = useAuthStore((state) => state.status)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const authUser = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
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
  const [backupStatus, setBackupStatus] = useState<{
    tone: 'success' | 'error'
    message: string
  } | null>(null)

  const profileFormKey = useMemo(
    () => `${userName}|${userRole}|${preferredTone}`,
    [preferredTone, userName, userRole],
  )
  const profileDefaults = useMemo<SettingsProfile>(
    () => ({
      userName,
      userRole,
      preferredTone,
      userId: authUser?.userId,
    }),
    [authUser?.userId, preferredTone, userName, userRole],
  )
  const lastBackupLabel = useMemo(() => formatBackupDate(lastBackupExportAt), [lastBackupExportAt])
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

  const handleExportBackup = () => {
    setBackupStatus(null)
    setIsExportingBackup(true)

    try {
      const result = exportLifeQuestBackup()

      recordBackupExport(result.backup.exportedAt)
      setBackupStatus({
        tone: 'success',
        message: `Backup сохранён: ${result.fileName}`,
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
      const exportDateLabel = formatBackupDate(preview.backup.exportedAt)
      const shouldImport = window.confirm(
        `Импортировать backup от ${exportDateLabel}? Это заменит текущие локальные данные LifeQuest на этом устройстве.`,
      )

      if (!shouldImport) {
        return
      }

      const result = await importLifeQuestBackup(file)

      setBackupStatus({
        tone: 'success',
        message: `Backup импортирован. Восстановлено ключей: ${result.importedKeys.length}. Перезапускаем приложение…`,
      })

      window.setTimeout(() => {
        window.location.replace('/today')
      }, 450)
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
        <p className="text-xs uppercase tracking-[0.24em] text-primary/80">Профиль</p>
        <ProfileSettingsForm
          key={profileFormKey}
          initialProfile={profileDefaults}
          onSave={updateProfile}
        />

        <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Профиль в аккаунте</p>
          <p className="mt-2 text-sm font-medium text-white">{accountSettingsStatusLabel}</p>
          <p className="mt-2 text-sm leading-6 text-slate-200">
            {isAuthenticated
              ? 'Этот блок синхронизирует только userName, userRole и preferredTone. Остальные данные LifeQuest пока остаются только локальными.'
              : 'Сейчас профиль сохраняется только локально. Чтобы синхронизировать имя, роль и тон с аккаунтом, сначала войди в аккаунт.'}
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
              : 'Сейчас LifeQuest по-прежнему полностью доступен локально на этом устройстве. Backup остаётся рекомендуемым способом сохранить данные до появления синхронизации.'}
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
          ) : (
            <PrimaryButton
              tone="secondary"
              fullWidth
              icon={<UserRound className="h-4 w-4" />}
              onClick={() => navigate('/auth')}
            >
              Войти / создать аккаунт
            </PrimaryButton>
          )}
        </div>
      </GlassCard>

      <GlassCard className="mb-5 border border-warning/20 bg-warning/5">
        <p className="text-xs uppercase tracking-[0.24em] text-warning/80">Локальные данные</p>
        <p className="mt-3 text-sm leading-6 text-slate-200">
          Всё хранится локально на этом устройстве. Можно вернуть demo-состояние, импортировать backup или полностью очистить локальный контур и загрузить приложение заново.
        </p>
        <p className="mt-3 text-sm leading-6 text-slate-200">
          Backup нужен, пока приложение работает local-first без аккаунта и backend. Сохрани файл, чтобы не потерять прогресс.
        </p>

        <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Последний экспорт</p>
          <p className="mt-2 text-sm font-medium text-white">{lastBackupLabel}</p>
        </div>

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

        <div className="mt-4 grid gap-3">
          <PrimaryButton
            tone="secondary"
            fullWidth
            disabled={isExportingBackup || isImportingBackup}
            icon={<Download className="h-4 w-4" />}
            onClick={handleExportBackup}
          >
            {isExportingBackup ? 'Готовим backup…' : 'Экспортировать backup'}
          </PrimaryButton>
          <PrimaryButton
            tone="secondary"
            fullWidth
            disabled={isImportingBackup || isExportingBackup}
            icon={<Upload className="h-4 w-4" />}
            onClick={handleImportClick}
          >
            {isImportingBackup ? 'Импортируем backup…' : 'Импортировать backup'}
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
