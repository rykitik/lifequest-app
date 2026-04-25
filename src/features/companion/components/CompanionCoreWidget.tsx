import { motion } from 'framer-motion'
import { ShieldCheck, Sparkles, Zap } from 'lucide-react'
import { GlassCard } from '@/shared/components/GlassCard'
import { LinearProgress } from '@/shared/components/LinearProgress'
import { formatPercent } from '@/shared/lib/format'
import type { CompanionState } from '@/shared/types'

interface CompanionCoreWidgetProps {
  mood: CompanionState
  message: string
  level: number
  stabilityScore: number
  currentXp: number
  nextLevelXp: number
}

const moodMeta: Record<
  CompanionState,
  { label: string; caption: string; glow: string; textClassName: string }
> = {
  idle: {
    label: 'Спокоен',
    caption: 'Система в равновесии',
    glow: '#22D3EE',
    textClassName: 'text-cyan',
  },
  focused: {
    label: 'Сфокусирован',
    caption: 'Сигнал чистый',
    glow: '#6366F1',
    textClassName: 'text-primary',
  },
  low_energy: {
    label: 'Мало энергии',
    caption: 'Береги базу',
    glow: '#F59E0B',
    textClassName: 'text-warning',
  },
  overloaded: {
    label: 'Перегружен',
    caption: 'Сузь поверхность',
    glow: '#EF4444',
    textClassName: 'text-danger',
  },
  recovering: {
    label: 'Восстанавливается',
    caption: 'Возвращается в центр',
    glow: '#22C55E',
    textClassName: 'text-success',
  },
  evolving: {
    label: 'Эволюционирует',
    caption: 'Малые шаги накапливаются',
    glow: '#A78BFA',
    textClassName: 'text-violet-300',
  },
}

export function CompanionCoreWidget({
  mood,
  message,
  level,
  stabilityScore,
  currentXp,
  nextLevelXp,
}: CompanionCoreWidgetProps) {
  const meta = moodMeta[mood]
  const xpPercent = (currentXp / nextLevelXp) * 100

  return (
    <GlassCard tone="strong" className="overflow-hidden p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-primary/80">Ядро-компаньон</p>
          <h2 className="mt-2 font-display text-xl font-bold text-white">
            Спокойный оператор на связи
          </h2>
          <p className="mt-2 max-w-xs text-sm leading-6 text-muted">{message}</p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white">
          {meta.label}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex h-36 w-36 shrink-0 items-center justify-center">
          <motion.div
            className="absolute inset-0 rounded-full blur-2xl"
            animate={{ opacity: [0.35, 0.65, 0.35], scale: [0.92, 1.06, 0.92] }}
            transition={{ duration: 4.5, ease: 'easeInOut', repeat: Infinity }}
            style={{
              background: `radial-gradient(circle, ${meta.glow}70 0%, ${meta.glow}12 54%, transparent 76%)`,
            }}
          />
          <motion.div
            className="absolute inset-2 rounded-full border"
            animate={{ rotate: 360 }}
            transition={{ duration: 22, ease: 'linear', repeat: Infinity }}
            style={{ borderColor: `${meta.glow}55` }}
          />
          <motion.div
            className="absolute inset-5 rounded-full border"
            animate={{ rotate: -360, scale: [1, 1.05, 1] }}
            transition={{ duration: 14, ease: 'linear', repeat: Infinity }}
            style={{ borderColor: `${meta.glow}35` }}
          />
          <motion.div
            className="relative h-20 w-20 rounded-full border border-white/15"
            animate={{
              boxShadow: [
                `0 0 16px ${meta.glow}40`,
                `0 0 38px ${meta.glow}95`,
                `0 0 16px ${meta.glow}40`,
              ],
            }}
            transition={{ duration: 4, repeat: Infinity }}
            style={{
              background: `radial-gradient(circle at 35% 30%, #ffffff 0%, ${meta.glow}75 24%, ${meta.glow}12 68%, transparent 100%)`,
            }}
          >
            <div className="absolute inset-[22%] rounded-full border border-white/10 bg-bg/70" />
            <div className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan shadow-cyan" />
          </motion.div>
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted">
                <Sparkles className="h-3.5 w-3.5" />
                Уровень
              </div>
              <p className="mt-2 font-display text-lg font-bold text-white">{level}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted">
                <ShieldCheck className="h-3.5 w-3.5" />
                Стабильность
              </div>
              <p className="mt-2 font-display text-lg font-bold text-white">
                {formatPercent(stabilityScore)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted">
                <Zap className="h-3.5 w-3.5" />
                Состояние
              </div>
              <p className={`mt-2 text-sm font-semibold ${meta.textClassName}`}>{meta.caption}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-muted">
              <span>Прогресс эволюции</span>
              <span>
                {currentXp} / {nextLevelXp} XP
              </span>
            </div>
            <LinearProgress value={xpPercent} />
          </div>
        </div>
      </div>
    </GlassCard>
  )
}
