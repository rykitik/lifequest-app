import { useEffect, useMemo, useState } from 'react'
import { RotateCcw, ShieldCheck, Sparkles } from 'lucide-react'
import { GlassCard } from '@/shared/components/GlassCard'
import { PrimaryButton } from '@/shared/components/PrimaryButton'
import { ScreenHeader } from '@/shared/components/ScreenHeader'
import { useSettingsStore } from '@/stores/useSettingsStore'
import type { PreferredTone } from '@/shared/types'

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
    description: 'Больше валидации и опоры без давления и токсичной мотивации.',
  },
]

interface ProfileSettingsFormProps {
  initialName: string
  initialRole: string
  initialTone: PreferredTone
  onSave: (profile: {
    userName: string
    userRole: string
    preferredTone: PreferredTone
  }) => void
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

function ProfileSettingsForm({
  initialName,
  initialRole,
  initialTone,
  onSave,
}: ProfileSettingsFormProps) {
  const [draftName, setDraftName] = useState(initialName)
  const [draftRole, setDraftRole] = useState(initialRole)
  const [draftTone, setDraftTone] = useState<PreferredTone>(initialTone)

  const normalizedName = normalizeProfileValue(draftName)
  const normalizedRole = normalizeProfileValue(draftRole)
  const isDirty =
    normalizedName !== initialName || normalizedRole !== initialRole || draftTone !== initialTone

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
  const userName = useSettingsStore((state) => state.userName)
  const userRole = useSettingsStore((state) => state.userRole)
  const preferredTone = useSettingsStore((state) => state.preferredTone)
  const appVersion = useSettingsStore((state) => state.appVersion)
  const isInstalledAsApp = useSettingsStore((state) => state.isInstalledAsApp)
  const hasServiceWorkerSupport = useSettingsStore((state) => state.hasServiceWorkerSupport)
  const hasActiveServiceWorker = useSettingsStore((state) => state.hasActiveServiceWorker)
  const hasWaitingServiceWorker = useSettingsStore((state) => state.hasWaitingServiceWorker)
  const updateProfile = useSettingsStore((state) => state.updateProfile)
  const resetDemoData = useSettingsStore((state) => state.resetDemoData)
  const clearAllLocalData = useSettingsStore((state) => state.clearAllLocalData)
  const checkPwaStatus = useSettingsStore((state) => state.checkPwaStatus)
  const applyPwaUpdate = useSettingsStore((state) => state.applyPwaUpdate)

  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false)
  const [isApplyingUpdate, setIsApplyingUpdate] = useState(false)

  const profileFormKey = useMemo(
    () => `${userName}|${userRole}|${preferredTone}`,
    [preferredTone, userName, userRole],
  )

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
      'Очистить все локальные данные на этом устройстве? Это удалит сохранённые маршруты, прогресс, настройки и перезагрузит приложение.',
    )

    if (!shouldClear) {
      return
    }

    await clearAllLocalData()
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

  return (
    <section className="pb-6">
      <ScreenHeader
        title="Настройки"
        subtitle="Управляй локальными данными, тоном системы и состоянием PWA без лишнего шума."
      />

      <GlassCard tone="strong" className="mb-5">
        <p className="text-xs uppercase tracking-[0.24em] text-primary/80">Профиль</p>
        <ProfileSettingsForm
          key={profileFormKey}
          initialName={userName}
          initialRole={userRole}
          initialTone={preferredTone}
          onSave={updateProfile}
        />
      </GlassCard>

      <GlassCard className="mb-5 border border-warning/20 bg-warning/5">
        <p className="text-xs uppercase tracking-[0.24em] text-warning/80">Локальные данные</p>
        <p className="mt-3 text-sm leading-6 text-slate-200">
          Всё хранится локально на этом устройстве. Можно вернуть demo-состояние или полностью
          очистить локальный контур и загрузить приложение заново.
        </p>

        <div className="mt-4 grid gap-3">
          <PrimaryButton
            tone="secondary"
            fullWidth
            icon={<RotateCcw className="h-4 w-4" />}
            onClick={handleResetDemoData}
          >
            Сбросить demo-данные
          </PrimaryButton>
          <PrimaryButton tone="warning" fullWidth onClick={() => void handleClearAllLocalData()}>
            Очистить все локальные данные
          </PrimaryButton>
        </div>
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
            onClick={() => void handleCheckUpdate()}
          >
            {isCheckingUpdate ? 'Проверяем обновление…' : 'Проверить обновление'}
          </PrimaryButton>

          {hasWaitingServiceWorker ? (
            <PrimaryButton
              fullWidth
              disabled={isApplyingUpdate}
              onClick={() => void handleApplyUpdate()}
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
