import { motion } from 'framer-motion'
import { GlassCard } from '@/shared/components/GlassCard'
import { LinearProgress } from '@/shared/components/LinearProgress'
import { PrimaryButton } from '@/shared/components/PrimaryButton'
import { ScreenHeader } from '@/shared/components/ScreenHeader'
import { formatCompact, formatPercent } from '@/shared/lib/format'
import { useBodyStore } from '@/stores/useBodyStore'
import { useCompanionStore } from '@/stores/useCompanionStore'
import { useMoneyStore } from '@/stores/useMoneyStore'
import { useProgressStore } from '@/stores/useProgressStore'
import { usePromptCenterStore } from '@/stores/usePromptCenterStore'
import { useQuestStore } from '@/stores/useQuestStore'
import { useRescueStore } from '@/stores/useRescueStore'
import { useTodayStore } from '@/stores/useTodayStore'
import type { CompanionState } from '@/shared/types'

const evolutionMilestones = [
  { label: 'Спокоен', caption: 'База стабильна' },
  { label: 'Сфокусирован', caption: 'Сигнал собран' },
  { label: 'Мало энергии', caption: 'Режим бережности' },
  { label: 'Перегружен', caption: 'Нужна разгрузка' },
  { label: 'Восстанавливается', caption: 'Возврат в систему' },
  { label: 'Эволюционирует', caption: 'Новый виток роста' },
]

const moodLabels: Record<CompanionState, string> = {
  idle: 'Спокоен',
  focused: 'Сфокусирован',
  low_energy: 'Мало энергии',
  overloaded: 'Перегружен',
  recovering: 'Восстанавливается',
  evolving: 'Эволюционирует',
}

export function CoreScreen() {
  const mood = useCompanionStore((state) => state.mood)
  const evolutionLevel = useCompanionStore((state) => state.evolutionLevel)
  const activeMessage = useCompanionStore((state) => state.activeMessage)
  const level = useProgressStore((state) => state.level)
  const totalXp = useProgressStore((state) => state.totalXp)
  const currentLevelXp = useProgressStore((state) => state.currentLevelXp)
  const nextLevelXp = useProgressStore((state) => state.nextLevelXp)
  const actionXp = useProgressStore((state) => state.actionXp)
  const consistencyXp = useProgressStore((state) => state.consistencyXp)
  const recoveryXp = useProgressStore((state) => state.recoveryXp)
  const achievements = useProgressStore((state) => state.achievements)
  const sectors = useProgressStore((state) => state.sectors)
  const resetProgress = useProgressStore((state) => state.resetDemoData)
  const resetCompanion = useCompanionStore((state) => state.resetDemoData)
  const resetQuests = useQuestStore((state) => state.resetDemoData)
  const resetToday = useTodayStore((state) => state.resetDemoData)
  const resetBody = useBodyStore((state) => state.resetDemoData)
  const resetMoney = useMoneyStore((state) => state.resetDemoData)
  const resetPromptCenter = usePromptCenterStore((state) => state.resetDemoData)
  const resetRescue = useRescueStore((state) => state.resetRescueState)

  const progressPercent = (currentLevelXp / nextLevelXp) * 100
  const activeEvolutionIndex = evolutionLevel % evolutionMilestones.length

  const handleResetDemoData = () => {
    const shouldReset = window.confirm(
      'Сбросить локальные demo-данные LifeQuest и вернуть приложение к исходному состоянию?',
    )

    if (!shouldReset) {
      return
    }

    resetQuests()
    resetToday()
    resetProgress()
    resetBody()
    resetMoney()
    resetCompanion()
    resetPromptCenter()
    resetRescue()
  }

  return (
    <section className="pb-6">
      <ScreenHeader
        title="Ядро"
        subtitle="Видимый прогресс, рост секторов и эволюция спутника без стыда и давления."
      />

      <GlassCard tone="strong" className="mb-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-primary/80">Уровень</p>
            <p className="mt-2 font-display text-4xl font-bold text-white">{level}</p>
            <p className="mt-2 text-sm text-muted">{activeMessage}</p>
          </div>
          <motion.div
            className="flex h-20 w-20 items-center justify-center rounded-full border border-primary/30"
            animate={{
              boxShadow: [
                '0 0 12px rgba(99,102,241,0.2)',
                '0 0 28px rgba(99,102,241,0.55)',
                '0 0 12px rgba(99,102,241,0.2)',
              ],
            }}
            transition={{ duration: 3.8, repeat: Infinity }}
          >
            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">Состояние</p>
              <p className="mt-1 text-sm font-medium text-white">{moodLabels[mood]}</p>
            </div>
          </motion.div>
        </div>
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-muted">
            <span>Прогресс уровня</span>
            <span>
              {currentLevelXp} / {nextLevelXp} XP
            </span>
          </div>
          <LinearProgress value={progressPercent} />
        </div>
      </GlassCard>

      <div className="mb-5 grid grid-cols-3 gap-3">
        <GlassCard>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Всего XP</p>
          <p className="mt-2 font-display text-2xl font-bold text-white">{formatCompact(totalXp)}</p>
        </GlassCard>
        <GlassCard>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">XP действия</p>
          <p className="mt-2 font-display text-2xl font-bold text-white">{formatCompact(actionXp)}</p>
        </GlassCard>
        <GlassCard>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">XP восстановления</p>
          <p className="mt-2 font-display text-2xl font-bold text-white">
            {formatCompact(recoveryXp)}
          </p>
        </GlassCard>
      </div>

      <GlassCard className="mb-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.24em] text-muted">Прогресс секторов</p>
          <p className="text-xs text-muted">XP устойчивости: {formatCompact(consistencyXp)}</p>
        </div>
        <div className="space-y-4">
          {sectors.map((sector) => (
            <div key={sector.key} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">{sector.label}</p>
                  <p className="text-sm text-muted">Уровень {sector.level}</p>
                </div>
                <p className="text-sm font-medium text-white">{formatPercent(sector.percent)}</p>
              </div>
              <LinearProgress
                value={sector.percent}
                barClassName="bg-gradient-to-r from-primary via-indigo-400 to-cyan"
              />
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="mb-5">
        <p className="text-xs uppercase tracking-[0.24em] text-muted">Эволюция спутника</p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {evolutionMilestones.map((milestone, index) => {
            const active = index === activeEvolutionIndex

            return (
              <div
                key={milestone.label}
                className="rounded-2xl border p-3 text-center"
                style={{
                  borderColor: active ? 'rgba(99, 102, 241, 0.45)' : 'rgba(148, 163, 184, 0.12)',
                  background: active ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                }}
              >
                <div className="mx-auto mb-3 h-10 w-10 rounded-full border border-white/10 bg-gradient-to-br from-primary/30 to-cyan/20" />
                <p className="text-sm font-medium text-white">{milestone.label}</p>
                <p className="mt-1 text-xs text-muted">{milestone.caption}</p>
              </div>
            )
          })}
        </div>
      </GlassCard>

      <GlassCard>
        <p className="text-xs uppercase tracking-[0.24em] text-muted">Достижения</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {achievements.map((achievement) => (
            <span
              key={achievement}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
            >
              {achievement}
            </span>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="mt-5 border border-danger/20 bg-danger/5">
        <p className="text-xs uppercase tracking-[0.24em] text-danger/80">Локальные данные</p>
        <p className="mt-3 text-sm leading-6 text-slate-200">
          Всё хранится локально на этом устройстве. Если нужно вернуться к demo-состоянию, можно
          сбросить маршрут, задачи, прогресс, настройки Центра промптов и локальные логи.
        </p>
        <PrimaryButton tone="warning" fullWidth className="mt-4" onClick={handleResetDemoData}>
          Сбросить demo-данные
        </PrimaryButton>
      </GlassCard>
    </section>
  )
}
