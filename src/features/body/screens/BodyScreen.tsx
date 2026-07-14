import { useEffect, useRef, useState } from 'react'
import { applyLifeQuestReward } from '@/services/gameplay'
import { GlassCard } from '@/shared/components/GlassCard'
import { MiniSparkline } from '@/shared/components/MiniSparkline'
import { PrimaryButton } from '@/shared/components/PrimaryButton'
import { ScreenHeader } from '@/shared/components/ScreenHeader'
import { cn } from '@/shared/lib/cn'
import type { BodyMovementType, BodyNutritionStatus } from '@/shared/types'
import { useBodyStore } from '@/stores/useBodyStore'
import { useSettingsStore } from '@/stores/useSettingsStore'

const nutritionOptions: BodyNutritionStatus[] = [
  'Нормально',
  'Переел',
  'Сорвался',
  'Мало белка',
  'Поздний ужин',
  'Сладкое',
]

const movementOptions: BodyMovementType[] = [
  'Без тренировки',
  'Прогулка',
  'Домашняя',
  'Зал',
  'Растяжка',
]

const nutritionScore: Record<BodyNutritionStatus, number> = {
  'Не выбрано': 0,
  Нормально: 82,
  Переел: 60,
  Сорвался: 35,
  'Мало белка': 68,
  'Поздний ужин': 64,
  Сладкое: 58,
}

const bodyGoalLabels = {
  weight_loss: 'Снижение веса',
  maintain: 'Поддержание',
  energy: 'Энергия',
  health: 'Здоровье',
  not_set: 'Цель не выбрана',
} as const

const targetPaceLabels = {
  calm: 'Спокойно',
  moderate: 'Умеренно',
  active: 'Активно',
} as const

const activityLevelLabels = {
  low: 'Низкая активность',
  medium: 'Средняя активность',
  high: 'Высокая активность',
} as const

function getChipClass(active: boolean) {
  return cn(
    'min-h-11 rounded-2xl border px-3 py-2 text-sm font-medium transition',
    active
      ? 'border-cyan/50 bg-cyan/15 text-white shadow-[0_0_20px_rgba(34,211,238,0.18)]'
      : 'border-white/10 bg-white/[0.04] text-muted hover:border-primary/40 hover:text-text',
  )
}

function formatBodyDate(dateKey: string) {
  const [year, month, day] = dateKey.split('-')

  return `${day}.${month}.${year}`
}

export function BodyScreen() {
  const today = useBodyStore((state) => state.today)
  const history = useBodyStore((state) => state.history)
  const saveCheckin = useBodyStore((state) => state.saveCheckin)
  const ensureTodayBodySnapshot = useBodyStore((state) => state.ensureTodayBodySnapshot)
  const heightCm = useSettingsStore((state) => state.heightCm)
  const bodyGoal = useSettingsStore((state) => state.bodyGoal)
  const targetWeightKg = useSettingsStore((state) => state.targetWeightKg)
  const targetPace = useSettingsStore((state) => state.targetPace)
  const activityLevel = useSettingsStore((state) => state.activityLevel)
  const weightInputRef = useRef<HTMLInputElement>(null)
  const stepsInputRef = useRef<HTMLInputElement>(null)
  const [savedLabel, setSavedLabel] = useState('')
  const isFreshBodyDay =
    today.waterLiters === 0 &&
    today.steps === 0 &&
    !today.workoutDone &&
    today.nutritionStatus === 'Не выбрано' &&
    today.movementType === 'Не выбрано'

  useEffect(() => {
    ensureTodayBodySnapshot()
  }, [ensureTodayBodySnapshot])

  const markSaved = (label = 'Сохранено') => {
    setSavedLabel(label)
    window.setTimeout(() => setSavedLabel(''), 1600)
  }

  const handleSaveWeight = () => {
    const weightInput = weightInputRef.current?.value ?? String(today.weightKg)
    const nextWeight = Number(weightInput.replace(',', '.'))

    if (!Number.isFinite(nextWeight) || nextWeight <= 0) {
      markSaved('Проверь число')
      return
    }

    const normalizedWeight = Number(nextWeight.toFixed(1))
    saveCheckin({
      weightKg: normalizedWeight,
    })

    if (weightInputRef.current) {
      weightInputRef.current.value = String(normalizedWeight)
    }

    markSaved('Вес сохранён')
  }

  const handleSaveSteps = (steps?: number) => {
    const stepsInput = stepsInputRef.current?.value ?? String(today.steps)
    const nextSteps = steps ?? Number.parseInt(stepsInput, 10)

    if (!Number.isFinite(nextSteps) || nextSteps < 0) {
      markSaved('Проверь шаги')
      return
    }

    const normalizedSteps = Math.round(nextSteps)
    saveCheckin({
      steps: normalizedSteps,
    })

    if (stepsInputRef.current) {
      stepsInputRef.current.value = String(normalizedSteps)
    }

    markSaved('Шаги сохранены')
  }

  const handleAddSteps = (amount: number) => {
    handleSaveSteps(today.steps + amount)
  }

  const handleAddWater = (liters: number) => {
    saveCheckin({
      waterLiters: Number((today.waterLiters + liters).toFixed(2)),
    })
    markSaved('Вода сохранена')
    applyLifeQuestReward(
      { xp: 6, sector: 'body' },
      'Контур тела обновлён. Ещё один спокойный базовый шаг закреплён.',
    )
  }

  const handleNutritionSelect = (nutritionStatus: BodyNutritionStatus) => {
    saveCheckin({
      nutritionStatus,
      foodDiscipline: nutritionScore[nutritionStatus],
    })
    markSaved('Питание сохранено')
  }

  const handleMovementSelect = (movementType: BodyMovementType) => {
    const workoutDone = movementType !== 'Без тренировки'

    saveCheckin({
      movementType,
      workout: movementType,
      workoutDone,
    })
    markSaved('Движение сохранено')
  }

  const handleWorkoutDone = () => {
    if (today.workoutDone) {
      return
    }

    const movementType =
      today.movementType === 'Без тренировки' || today.movementType === 'Не выбрано'
        ? 'Домашняя'
        : today.movementType

    saveCheckin({
      movementType,
      workout: movementType,
      workoutDone: true,
    })
    markSaved('Тренировка сохранена')
    applyLifeQuestReward(
      { xp: 18, sector: 'body', consistencyXp: 2 },
      'Тренировка записана. Сектор тела становится устойчивее.',
    )
  }

  return (
    <section className="pb-6">
      <ScreenHeader
        title="Тело"
        subtitle="Держи базовые показатели на виду, чтобы забота о себе была легче, чем избегание."
      />

      {heightCm || targetWeightKg || (bodyGoal && bodyGoal !== 'not_set') ? (
        <GlassCard className="mb-5 border border-cyan/15 bg-cyan/5">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan/80">Профиль тела</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-200">
            {heightCm ? <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">Рост: {heightCm} см</span> : null}
            {bodyGoal ? <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">Цель: {bodyGoalLabels[bodyGoal]}</span> : null}
            {targetWeightKg ? <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">Целевой вес: {targetWeightKg} кг</span> : null}
            {targetPace ? <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">Темп: {targetPaceLabels[targetPace]}</span> : null}
            {activityLevel ? <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">{activityLevelLabels[activityLevel]}</span> : null}
          </div>
        </GlassCard>
      ) : null}

      <GlassCard tone="strong" className="mb-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-primary/80">Быстрый чек-ин</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-white">
              Сегодняшнее состояние тела
            </h2>
            <p className="mt-1 text-sm text-muted">
              Сегодня: {formatBodyDate(today.date)}. Без давления. Просто фиксируем факт.
            </p>
            {isFreshBodyDay && (
              <p className="mt-2 text-xs text-cyan">Новый день начат. Вчерашний чек-ин сохранён.</p>
            )}
          </div>
          {savedLabel && (
            <span className="shrink-0 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-medium text-success">
              {savedLabel}
            </span>
          )}
        </div>

        <div className="mt-5 space-y-4">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white">Вес</p>
                <p className="text-xs text-muted">Последний вес: {today.weightKg} кг</p>
              </div>
              <div className="flex w-40 items-center gap-2">
                <input
                  className="min-h-12 w-full rounded-2xl border border-white/10 bg-surface/80 px-3 text-right font-mono text-base text-white outline-none transition placeholder:text-muted focus:border-cyan/50"
                  defaultValue={today.weightKg}
                  inputMode="decimal"
                  key={`weight-${today.date}-${today.weightKg}`}
                  min="1"
                  ref={weightInputRef}
                  step="0.1"
                  type="number"
                />
                <span className="text-sm text-muted">кг</span>
              </div>
            </div>
            <PrimaryButton className="mt-3" fullWidth tone="secondary" onClick={handleSaveWeight}>
              Сохранить вес
            </PrimaryButton>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white">Шаги</p>
                <p className="text-xs text-muted">Сегодня: {today.steps}</p>
              </div>
              <input
                className="min-h-12 w-32 rounded-2xl border border-white/10 bg-surface/80 px-3 text-right font-mono text-base text-white outline-none transition placeholder:text-muted focus:border-cyan/50"
                defaultValue={today.steps}
                inputMode="numeric"
                key={`steps-${today.date}-${today.steps}`}
                min="0"
                ref={stepsInputRef}
                step="100"
                type="number"
              />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[1000, 3000, 5000].map((amount) => (
                <button
                  className={getChipClass(false)}
                  key={amount}
                  type="button"
                  onClick={() => handleAddSteps(amount)}
                >
                  +{amount}
                </button>
              ))}
            </div>
            <PrimaryButton
              className="mt-3"
              fullWidth
              tone="secondary"
              onClick={() => handleSaveSteps()}
            >
              Сохранить шаги
            </PrimaryButton>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white">Вода</p>
                <p className="text-xs text-muted">Сегодня: {today.waterLiters} л</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <PrimaryButton tone="secondary" onClick={() => handleAddWater(0.25)}>
                  +250 мл
                </PrimaryButton>
                <PrimaryButton tone="secondary" onClick={() => handleAddWater(0.5)}>
                  +500 мл
                </PrimaryButton>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-sm font-medium text-white">Питание</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {nutritionOptions.map((option) => (
                <button
                  className={getChipClass(today.nutritionStatus === option)}
                  key={option}
                  type="button"
                  onClick={() => handleNutritionSelect(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white">Движение</p>
                <p className="text-xs text-muted">
                  {today.workoutDone ? 'Активность отмечена' : 'Движение не выбрано'}
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {movementOptions.map((option) => (
                <button
                  className={getChipClass(today.movementType === option)}
                  key={option}
                  type="button"
                  onClick={() => handleMovementSelect(option)}
                >
                  {option}
                </button>
              ))}
            </div>
            <PrimaryButton
              className="mt-3"
              fullWidth
              disabled={today.workoutDone}
              onClick={handleWorkoutDone}
            >
              {today.workoutDone ? 'Тренировка отмечена' : 'Отметить тренировку'}
            </PrimaryButton>
          </div>
        </div>
      </GlassCard>

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
          <p className="mt-2 font-display text-2xl font-bold text-white">{today.nutritionStatus}</p>
          <p className="mt-2 text-sm text-muted">Ровно, без крайностей</p>
        </GlassCard>
      </div>

      <GlassCard className="mt-5">
        <p className="text-xs uppercase tracking-[0.24em] text-muted">Быстрое действие</p>
        <p className="mt-3 text-white">{today.quickAction}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <PrimaryButton tone="secondary" fullWidth onClick={() => handleAddWater(0.25)}>
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
