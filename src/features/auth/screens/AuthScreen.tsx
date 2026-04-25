import { LockKeyhole, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { GlassCard } from '@/shared/components/GlassCard'
import { PrimaryButton } from '@/shared/components/PrimaryButton'
import { ScreenHeader } from '@/shared/components/ScreenHeader'
import { useAuthStore } from '@/stores/useAuthStore'

export function AuthScreen() {
  const navigate = useNavigate()
  const switchToLocalMode = useAuthStore((state) => state.switchToLocalMode)

  const handleContinueLocally = () => {
    switchToLocalMode()
    navigate('/today')
  }

  return (
    <section className="pb-6">
      <ScreenHeader
        title="Аккаунты появятся позже"
        subtitle="Сейчас LifeQuest работает локально на этом устройстве. Данные можно сохранить через backup в Настройках."
      />

      <GlassCard tone="strong" className="mb-5">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-primary/80">Local-first режим</p>
            <h2 className="mt-2 font-display text-xl font-semibold text-white">
              Пока без входа и регистрации
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              Мы уже готовим архитектуру к multi-user режиму, но сейчас основной сценарий остаётся
              честным local-first MVP: без аккаунта, без backend и без риска сломать текущий опыт.
            </p>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="mb-5">
        <p className="text-xs uppercase tracking-[0.24em] text-muted">Что доступно сейчас</p>
        <div className="mt-4 space-y-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <p className="font-medium text-white">Локальные данные</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Маршрут дня, прогресс, настройки и backup хранятся на этом устройстве.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <p className="font-medium text-white">Backup вместо аккаунта</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Если нужно сохранить состояние до появления синхронизации, используй экспорт и импорт
              backup в Настройках.
            </p>
          </div>
        </div>
      </GlassCard>

      <div className="grid gap-3">
        <PrimaryButton fullWidth onClick={handleContinueLocally}>
          Продолжить локально
        </PrimaryButton>
        <PrimaryButton
          tone="ghost"
          fullWidth
          disabled
          icon={<LockKeyhole className="h-4 w-4" />}
        >
          Войти / Зарегистрироваться позже
        </PrimaryButton>
        <PrimaryButton tone="secondary" fullWidth onClick={() => navigate('/settings')}>
          Открыть Настройки и backup
        </PrimaryButton>
      </div>
    </section>
  )
}
