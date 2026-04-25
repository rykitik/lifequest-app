import { GlassCard } from '@/shared/components/GlassCard'
import { MiniSparkline } from '@/shared/components/MiniSparkline'
import { PrimaryButton } from '@/shared/components/PrimaryButton'
import { ScreenHeader } from '@/shared/components/ScreenHeader'
import { useBodyStore } from '@/stores/useBodyStore'
import { useCompanionStore } from '@/stores/useCompanionStore'
import { useProgressStore } from '@/stores/useProgressStore'

export function BodyScreen() {
  const today = useBodyStore((state) => state.today)
  const history = useBodyStore((state) => state.history)
  const saveCheckin = useBodyStore((state) => state.saveCheckin)
  const applyReward = useProgressStore((state) => state.applyReward)
  const setActiveMessage = useCompanionStore((state) => state.setActiveMessage)

  const handleAddWater = () => {
    saveCheckin({
      waterLiters: Number((today.waterLiters + 0.25).toFixed(2)),
    })
    applyReward({ xp: 6, sector: 'body' })
    setActiveMessage('Контур тела обновлён. Ещё один спокойный базовый шаг закреплён.')
  }

  const handleWorkoutDone = () => {
    if (today.workoutDone) {
      return
    }

    saveCheckin({
      workoutDone: true,
    })
    applyReward({ xp: 18, sector: 'body', consistencyXp: 2 })
    setActiveMessage('Тренировка записана. Сектор тела становится устойчивее.')
  }

  return (
    <section className="pb-6">
      <ScreenHeader
        title="Тело"
        subtitle="Держи базовые показатели на виду, чтобы забота о себе была легче, чем избегание."
      />

      <GlassCard tone="strong" className="mb-5">
        <p className="text-xs uppercase tracking-[0.24em] text-primary/80">Тренд веса</p>
        <div className="mt-4 grid grid-cols-[1.2fr_1fr] gap-4">
          <div>
            <p className="font-display text-4xl font-bold text-white">{today.weightKg} кг</p>
            <p className="mt-2 text-sm text-success">{today.weightTrendKg} кг за неделю</p>
          </div>
          <MiniSparkline
            values={history}
            color="linear-gradient(180deg, rgba(34,197,94,0.95), rgba(34,211,238,0.85))"
          />
        </div>
      </GlassCard>

      <div className="grid grid-cols-2 gap-3">
        <GlassCard>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Вода</p>
          <p className="mt-2 font-display text-2xl font-bold text-white">{today.waterLiters} л</p>
          <p className="mt-2 text-sm text-muted">Поддержка базы в течение дня</p>
        </GlassCard>
        <GlassCard>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Шаги</p>
          <p className="mt-2 font-display text-2xl font-bold text-white">{today.steps}</p>
          <p className="mt-2 text-sm text-muted">Движение уже в системе</p>
        </GlassCard>
        <GlassCard>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Тренировка</p>
          <p className="mt-2 font-display text-xl font-bold text-white">{today.workout}</p>
          <p className="mt-2 text-sm text-muted">
            {today.workoutDone ? 'Сегодня уже отмечена' : 'Готова, когда будешь готов'}
          </p>
        </GlassCard>
        <GlassCard>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Питание</p>
          <p className="mt-2 font-display text-2xl font-bold text-white">{today.foodDiscipline}%</p>
          <p className="mt-2 text-sm text-muted">Ровно, без крайностей</p>
        </GlassCard>
      </div>

      <GlassCard className="mt-5">
        <p className="text-xs uppercase tracking-[0.24em] text-muted">Быстрое действие</p>
        <p className="mt-3 text-white">{today.quickAction}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <PrimaryButton tone="secondary" fullWidth onClick={handleAddWater}>
            Добавить 250 мл
          </PrimaryButton>
          <PrimaryButton fullWidth disabled={today.workoutDone} onClick={handleWorkoutDone}>
            {today.workoutDone ? 'Тренировка отмечена' : 'Отметить тренировку'}
          </PrimaryButton>
        </div>
      </GlassCard>
    </section>
  )
}
