import { useMemo, useState, type FormEvent } from 'react'
import { ArrowRight, LockKeyhole, LogOut, ShieldCheck, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { GlassCard } from '@/shared/components/GlassCard'
import { PrimaryButton } from '@/shared/components/PrimaryButton'
import { ScreenHeader } from '@/shared/components/ScreenHeader'
import { getAuthDisabledMessage, isAuthEnabled } from '@/services/runtimeConfig'
import { useAuthStore } from '@/stores/useAuthStore'
import { useSettingsStore } from '@/stores/useSettingsStore'

type AuthTab = 'login' | 'register'

const tabLabels: Record<AuthTab, string> = {
  login: 'Войти',
  register: 'Зарегистрироваться',
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim().toLowerCase())
}

export function AuthScreen() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<AuthTab>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const userName = useSettingsStore((state) => state.userName)
  const mode = useAuthStore((state) => state.mode)
  const status = useAuthStore((state) => state.status)
  const user = useAuthStore((state) => state.user)
  const lastError = useAuthStore((state) => state.lastError)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isBootstrapping = useAuthStore((state) => state.isBootstrapping)
  const login = useAuthStore((state) => state.login)
  const register = useAuthStore((state) => state.register)
  const logout = useAuthStore((state) => state.logout)
  const switchToLocalMode = useAuthStore((state) => state.switchToLocalMode)
  const clearAuthError = useAuthStore((state) => state.clearAuthError)

  const isSubmitting =
    isBootstrapping || status === 'authenticating' || status === 'refreshing' || status === 'logging_out'
  const errorMessage = formError || lastError
  const isAccountConnected = mode === 'account' && isAuthenticated && Boolean(user)
  const authRuntimeEnabled = isAuthEnabled()
  const primaryButtonLabel = activeTab === 'login' ? 'Войти' : 'Зарегистрироваться'
  const helperTitle = useMemo(
    () =>
      activeTab === 'login'
        ? 'Вход не отключает локальный режим'
        : 'Аккаунт можно добавить без потери текущего прогресса',
    [activeTab],
  )

  const handleTabChange = (nextTab: AuthTab) => {
    if (activeTab === nextTab) {
      return
    }

    setActiveTab(nextTab)
    setFormError(null)
    clearAuthError()
  }

  const handleContinueLocally = () => {
    switchToLocalMode()
    navigate('/today')
  }

  const handleFieldChange = (setter: (value: string) => void, value: string) => {
    setter(value)

    if (formError) {
      setFormError(null)
    }

    if (lastError) {
      clearAuthError()
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const normalizedEmail = email.trim().toLowerCase()
    const normalizedPassword = password.trim()
    const normalizedName = name.trim()

    if (!isValidEmail(normalizedEmail)) {
      setFormError('Укажи корректный email.')
      return
    }

    if (normalizedPassword.length < 8) {
      setFormError('Пароль должен быть не короче 8 символов.')
      return
    }

    if (activeTab === 'register' && !normalizedName) {
      setFormError('Для регистрации добавь имя.')
      return
    }

    setFormError(null)
    clearAuthError()

    const result =
      activeTab === 'login'
        ? await login({
            email: normalizedEmail,
            password: normalizedPassword,
          })
        : await register({
            email: normalizedEmail,
            password: normalizedPassword,
            name: normalizedName,
          })

    if (!result.success) {
      setFormError(result.message)
      return
    }

    navigate('/today')
  }

  const handleLogout = async () => {
    await logout()
    navigate('/today')
  }

  if (!authRuntimeEnabled) {
    return (
      <section className="pb-6">
        <ScreenHeader
          title="Аккаунт позже"
          subtitle="LifeQuest сейчас работает локально на этом устройстве. Вход и синхронизация будут включены отдельным этапом."
        />

        <GlassCard tone="strong" className="mb-5">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.24em] text-primary/80">Локальный режим</p>
              <h2 className="mt-2 font-display text-xl font-semibold text-white">
                {getAuthDisabledMessage()}
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted">
                Сегодня, Тело, Деньги, Центр промптов, недельные итоги и backup доступны без сервера. Сохраняй прогресс через backup в Настройках.
              </p>
            </div>
          </div>
        </GlassCard>

        <div className="grid gap-3">
          <PrimaryButton fullWidth icon={<ArrowRight className="h-4 w-4" />} onClick={() => navigate('/today')}>
            Продолжить локально
          </PrimaryButton>
          <PrimaryButton tone="secondary" fullWidth onClick={() => navigate('/settings')}>
            Открыть Настройки
          </PrimaryButton>
        </div>
      </section>
    )
  }

  if (isAccountConnected && user) {
    return (
      <section className="pb-6">
        <ScreenHeader
          title="Аккаунт подключён"
          subtitle="Локальные данные остаются на этом устройстве. Синхронизация и перенос в аккаунт появятся позже."
        />

        <GlassCard tone="strong" className="mb-5">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.24em] text-primary/80">Текущая сессия</p>
              <h2 className="mt-2 font-display text-xl font-semibold text-white">
                {user.name || userName || 'Пользователь'}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-200">{user.email}</p>
              <p className="mt-3 text-sm leading-6 text-muted">
                Локальные данные пока не синхронизируются с аккаунтом. Миграция локальных данных в аккаунт будет добавлена отдельным этапом.
              </p>
            </div>
          </div>
        </GlassCard>

        <div className="grid gap-3">
          <PrimaryButton fullWidth icon={<ArrowRight className="h-4 w-4" />} onClick={() => navigate('/today')}>
            Перейти в Сегодня
          </PrimaryButton>
          <PrimaryButton tone="secondary" fullWidth onClick={() => navigate('/settings')}>
            Открыть Настройки
          </PrimaryButton>
          <PrimaryButton
            tone="ghost"
            fullWidth
            disabled={isSubmitting}
            icon={<LogOut className="h-4 w-4" />}
            onClick={() => {
              void handleLogout()
            }}
          >
            Выйти
          </PrimaryButton>
        </div>
      </section>
    )
  }

  return (
    <section className="pb-6">
      <ScreenHeader
        title="Аккаунт LifeQuest"
        subtitle="Можно войти или создать аккаунт, но приложение по-прежнему остаётся полностью доступным локально на этом устройстве."
      />

      <GlassCard tone="strong" className="mb-5">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-primary/80">Локально сейчас, аккаунт позже</p>
            <h2 className="mt-2 font-display text-xl font-semibold text-white">{helperTitle}</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              Локальные данные пока не синхронизируются с аккаунтом. Миграция локальных данных в аккаунт появится позже, поэтому backup в Настройках всё ещё остаётся рекомендуемым способом сохранить прогресс.
            </p>
          </div>
        </div>
      </GlassCard>

      <div className="mb-4 grid grid-cols-2 gap-3">
        {(Object.keys(tabLabels) as AuthTab[]).map((tabKey) => {
          const isActive = tabKey === activeTab

          return (
            <button
              key={tabKey}
              type="button"
              onClick={() => handleTabChange(tabKey)}
              className={`rounded-3xl border px-4 py-3 text-sm font-medium transition ${
                isActive
                  ? 'border-primary/35 bg-primary/12 text-white'
                  : 'border-white/10 bg-white/5 text-muted hover:border-primary/20 hover:text-white'
              }`}
            >
              {tabLabels[tabKey]}
            </button>
          )
        })}
      </div>

      <GlassCard className="mb-5">
        <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          {activeTab === 'register' ? (
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-white">Имя</span>
              <input
                value={name}
                onChange={(event) => handleFieldChange(setName, event.target.value)}
                className="w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-muted focus:border-primary/50 focus:bg-white/10"
                placeholder="Как система будет к тебе обращаться"
                autoComplete="name"
              />
            </label>
          ) : null}

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-white">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => handleFieldChange(setEmail, event.target.value)}
              className="w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-muted focus:border-primary/50 focus:bg-white/10"
              placeholder="user@example.com"
              autoComplete="email"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-white">Пароль</span>
            <input
              type="password"
              value={password}
              onChange={(event) => handleFieldChange(setPassword, event.target.value)}
              className="w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-muted focus:border-primary/50 focus:bg-white/10"
              placeholder="Не короче 8 символов"
              autoComplete={activeTab === 'login' ? 'current-password' : 'new-password'}
            />
          </label>

          {errorMessage ? (
            <div className="rounded-3xl border border-danger/20 bg-danger/10 p-4 text-sm leading-6 text-slate-100">
              {errorMessage}
            </div>
          ) : null}

          <PrimaryButton
            type="submit"
            fullWidth
            disabled={isSubmitting}
            icon={<LockKeyhole className="h-4 w-4" />}
          >
            {isSubmitting ? 'Подключаем аккаунт…' : primaryButtonLabel}
          </PrimaryButton>
        </form>
      </GlassCard>

      <GlassCard className="mb-5">
        <p className="text-xs uppercase tracking-[0.24em] text-muted">Что важно сейчас</p>
        <div className="mt-4 space-y-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <p className="font-medium text-white">Локальные данные не исчезают</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Вход и выход не удаляют маршрут дня, прогресс, backup и другие local-first данные на этом устройстве.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <p className="font-medium text-white">Синхронизации пока нет</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Пока аккаунт нужен только для базовой сессии аккаунта. Синхронизация и перенос локальных данных в аккаунт будут добавлены позже отдельным этапом.
            </p>
          </div>
        </div>
      </GlassCard>

      <div className="grid gap-3">
        <PrimaryButton fullWidth icon={<ArrowRight className="h-4 w-4" />} onClick={handleContinueLocally}>
          Продолжить локально
        </PrimaryButton>
        <PrimaryButton tone="secondary" fullWidth icon={<UserRound className="h-4 w-4" />} onClick={() => navigate('/settings')}>
          Открыть Настройки и резервную копию
        </PrimaryButton>
      </div>
    </section>
  )
}
