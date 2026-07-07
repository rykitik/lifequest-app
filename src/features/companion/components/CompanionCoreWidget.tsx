import { motion } from 'framer-motion'
import { ShieldCheck, Sparkles, Zap } from 'lucide-react'
import { GlassCard } from '@/shared/components/GlassCard'
import { LinearProgress } from '@/shared/components/LinearProgress'
import { cn } from '@/shared/lib/cn'
import { formatPercent } from '@/shared/lib/format'
import type { CompanionState } from '@/shared/types'

type CompanionCoreVariant = 'compact' | 'hero' | 'coreScreen'

interface CompanionCoreWidgetProps {
  mood: CompanionState
  message: string
  level: number
  stabilityScore: number
  currentXp: number
  nextLevelXp: number
  variant?: CompanionCoreVariant
}

const moodMeta: Record<
  CompanionState,
  {
    label: string
    headline: string
    caption: string
    guidance: string
    glow: string
    secondaryGlow: string
    textClassName: string
    auraOpacity: number
    ringOpacity: number
    scanSpeed: number
    pulseSpeed: number
    nodeCount: number
    signalMode: 'smooth' | 'steady' | 'dim' | 'broken' | 'soft' | 'dense'
  }
> = {
  idle: {
    label: 'Спокоен',
    headline: 'Спокойный оператор на связи',
    caption: 'Система в равновесии',
    guidance: 'Выбери один чистый шаг.',
    glow: '#22D3EE',
    secondaryGlow: '#6366F1',
    textClassName: 'text-cyan',
    auraOpacity: 0.52,
    ringOpacity: 0.48,
    scanSpeed: 16,
    pulseSpeed: 4.8,
    nodeCount: 4,
    signalMode: 'smooth',
  },
  focused: {
    label: 'Сфокусирован',
    headline: 'Фокус стабилизирован',
    caption: 'Сигнал чистый',
    guidance: 'Держим короткий маршрут.',
    glow: '#22D3EE',
    secondaryGlow: '#60A5FA',
    textClassName: 'text-cyan',
    auraOpacity: 0.6,
    ringOpacity: 0.68,
    scanSpeed: 10,
    pulseSpeed: 3.8,
    nodeCount: 5,
    signalMode: 'steady',
  },
  low_energy: {
    label: 'Мало энергии',
    headline: 'Энергия снижена',
    caption: 'Бережём базу',
    guidance: 'Сейчас важнее восстановление, а не рывок.',
    glow: '#F59E0B',
    secondaryGlow: '#FDE68A',
    textClassName: 'text-warning',
    auraOpacity: 0.32,
    ringOpacity: 0.32,
    scanSpeed: 24,
    pulseSpeed: 6.4,
    nodeCount: 3,
    signalMode: 'dim',
  },
  overloaded: {
    label: 'Перегружен',
    headline: 'Система перегружена',
    caption: 'Сужаем поверхность',
    guidance: 'Оставь только один мягкий шаг.',
    glow: '#EF4444',
    secondaryGlow: '#E879F9',
    textClassName: 'text-danger',
    auraOpacity: 0.44,
    ringOpacity: 0.44,
    scanSpeed: 8,
    pulseSpeed: 3.1,
    nodeCount: 4,
    signalMode: 'broken',
  },
  recovering: {
    label: 'Восстанавливается',
    headline: 'Восстановление активно',
    caption: 'Возвращаемся в центр',
    guidance: 'Сохрани базу и двигайся спокойно.',
    glow: '#22C55E',
    secondaryGlow: '#22D3EE',
    textClassName: 'text-success',
    auraOpacity: 0.5,
    ringOpacity: 0.46,
    scanSpeed: 18,
    pulseSpeed: 5.4,
    nodeCount: 4,
    signalMode: 'soft',
  },
  evolving: {
    label: 'Эволюционирует',
    headline: 'Ядро эволюционирует',
    caption: 'Новый уровень близко',
    guidance: 'Малые шаги уже усиливают систему.',
    glow: '#A78BFA',
    secondaryGlow: '#22D3EE',
    textClassName: 'text-violet-300',
    auraOpacity: 0.72,
    ringOpacity: 0.72,
    scanSpeed: 9,
    pulseSpeed: 3.6,
    nodeCount: 6,
    signalMode: 'dense',
  },
}

const variantSizes: Record<CompanionCoreVariant, number> = {
  compact: 88,
  hero: 158,
  coreScreen: 216,
}

const variantCardClasses: Record<CompanionCoreVariant, string> = {
  compact: 'p-4',
  hero: 'p-4 sm:p-5',
  coreScreen: 'p-5',
}

function CompanionCoreVisual({
  mood,
  variant,
}: {
  mood: CompanionState
  variant: CompanionCoreVariant
}) {
  const meta = moodMeta[mood]
  const size = variantSizes[variant]
  const coreSize = Math.round(size * 0.5)
  const nodeRadius = size * 0.42
  const nodes = Array.from({ length: meta.nodeCount }, (_, index) => index)
  const isCompact = variant === 'compact'
  const isUnstable = meta.signalMode === 'broken'

  return (
    <motion.div
      className="relative isolate flex shrink-0 items-center justify-center"
      animate={isUnstable ? { x: [0, 1, -1, 0], y: [0, -1, 1, 0] } : { x: 0, y: 0 }}
      transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <motion.div
        className="absolute inset-[-18%] rounded-full blur-3xl"
        animate={{
          opacity: [meta.auraOpacity * 0.55, meta.auraOpacity, meta.auraOpacity * 0.55],
          scale: [0.92, 1.07, 0.92],
        }}
        transition={{ duration: meta.pulseSpeed, ease: 'easeInOut', repeat: Infinity }}
        style={{
          background: `radial-gradient(circle, ${meta.glow}70 0%, ${meta.secondaryGlow}30 36%, transparent 70%)`,
        }}
      />

      <div
        className="absolute inset-0 rounded-full opacity-70"
        style={{
          background: `radial-gradient(circle, transparent 49%, ${meta.glow}18 50%, transparent 52%), linear-gradient(90deg, transparent 49%, ${meta.secondaryGlow}22 50%, transparent 51%), linear-gradient(0deg, transparent 49%, ${meta.glow}18 50%, transparent 51%)`,
        }}
      />

      <motion.div
        className="absolute rounded-full border"
        animate={{ rotate: 360 }}
        transition={{ duration: meta.scanSpeed * 1.7, ease: 'linear', repeat: Infinity }}
        style={{
          inset: size * 0.04,
          borderColor: `${meta.glow}${Math.round(meta.ringOpacity * 120).toString(16)}`,
          boxShadow: `0 0 ${size * 0.14}px ${meta.glow}20, inset 0 0 ${size * 0.08}px ${meta.secondaryGlow}12`,
        }}
      />

      <motion.div
        className="absolute rounded-full border border-dashed"
        animate={{ rotate: -360 }}
        transition={{ duration: meta.scanSpeed * 1.15, ease: 'linear', repeat: Infinity }}
        style={{
          inset: size * 0.14,
          borderColor: `${meta.secondaryGlow}${Math.round(meta.ringOpacity * 96).toString(16)}`,
        }}
      />

      {!isCompact ? (
        <motion.div
          className="absolute rounded-full border"
          animate={{ rotate: 360, scale: [1, 1.03, 1] }}
          transition={{ duration: meta.scanSpeed * 0.85, ease: 'linear', repeat: Infinity }}
          style={{
            inset: size * 0.25,
            borderColor: `${meta.glow}30`,
          }}
        />
      ) : null}

      <motion.div
        className="absolute rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: meta.scanSpeed, ease: 'linear', repeat: Infinity }}
        style={{
          inset: size * 0.09,
          background: `conic-gradient(from 20deg, transparent 0deg, transparent 34deg, ${meta.glow} 48deg, transparent 68deg, transparent 190deg, ${meta.secondaryGlow}90 212deg, transparent 230deg, transparent 360deg)`,
          WebkitMask:
            'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))',
          mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))',
          opacity: meta.signalMode === 'dim' ? 0.48 : 0.82,
        }}
      />

      <motion.div
        className="absolute rounded-full"
        animate={{ rotate: -360 }}
        transition={{ duration: meta.scanSpeed * 1.35, ease: 'linear', repeat: Infinity }}
        style={{
          inset: size * 0.19,
          background: `conic-gradient(from 120deg, transparent 0deg, ${meta.secondaryGlow}00 78deg, ${meta.secondaryGlow} 92deg, transparent 112deg, transparent 360deg)`,
          WebkitMask:
            'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1px))',
          mask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1px))',
          opacity: isUnstable ? 0.62 : 0.72,
        }}
      />

      <motion.div
        className="absolute rounded-full border"
        animate={{ scale: [0.28, 1.02], opacity: [0, 0.5, 0] }}
        transition={{
          duration: meta.pulseSpeed * 0.72,
          repeat: Infinity,
          repeatDelay: isUnstable ? 0.5 : 1.2,
          ease: 'easeOut',
        }}
        style={{
          width: size * 0.86,
          height: size * 0.86,
          borderColor: `${meta.glow}55`,
          boxShadow: `0 0 ${size * 0.18}px ${meta.glow}22`,
        }}
      />

      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{ rotate: meta.signalMode === 'steady' ? 360 : -360 }}
        transition={{ duration: meta.scanSpeed * 2.1, ease: 'linear', repeat: Infinity }}
      >
        {nodes.map((node) => {
          const angle = (Math.PI * 2 * node) / nodes.length - Math.PI / 2
          const dotSize = isCompact ? 4 : 6
          const x = size / 2 + Math.cos(angle) * nodeRadius - dotSize / 2
          const y = size / 2 + Math.sin(angle) * nodeRadius - dotSize / 2

          return (
            <motion.span
              key={node}
              className="absolute rounded-full"
              animate={{
                opacity: isUnstable ? [0.25, 0.9, 0.2, 0.65] : [0.35, 1, 0.35],
                scale: meta.signalMode === 'dim' ? [0.75, 0.95, 0.75] : [0.85, 1.2, 0.85],
              }}
              transition={{
                duration: meta.pulseSpeed * 0.8,
                delay: node * 0.22,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              style={{
                left: x,
                top: y,
                width: dotSize,
                height: dotSize,
                background: node % 2 === 0 ? meta.glow : meta.secondaryGlow,
                boxShadow: `0 0 12px ${node % 2 === 0 ? meta.glow : meta.secondaryGlow}`,
              }}
            />
          )
        })}
      </motion.div>

      <motion.div
        className="relative rounded-full border border-white/15"
        animate={{
          scale: [0.97, 1.04, 0.97],
          boxShadow: [
            `0 0 ${size * 0.12}px ${meta.glow}55, inset 0 0 ${size * 0.08}px ${meta.secondaryGlow}25`,
            `0 0 ${size * 0.26}px ${meta.glow}aa, inset 0 0 ${size * 0.16}px ${meta.secondaryGlow}45`,
            `0 0 ${size * 0.12}px ${meta.glow}55, inset 0 0 ${size * 0.08}px ${meta.secondaryGlow}25`,
          ],
        }}
        transition={{ duration: meta.pulseSpeed, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          width: coreSize,
          height: coreSize,
          background: `radial-gradient(circle at 34% 28%, #ffffff 0%, ${meta.secondaryGlow} 11%, ${meta.glow}90 34%, rgba(11,16,32,0.88) 68%, transparent 100%)`,
        }}
      >
        <div
          className="absolute inset-[18%] rounded-full border border-white/10"
          style={{
            background: `radial-gradient(circle, rgba(229,238,248,0.9) 0%, ${meta.glow}80 9%, rgba(11,16,32,0.82) 35%, transparent 72%)`,
          }}
        />
        <motion.div
          className="absolute left-1/2 top-1/2 rounded-full"
          animate={{ opacity: [0.75, 1, 0.75], scale: [0.9, 1.25, 0.9] }}
          transition={{ duration: meta.pulseSpeed * 0.64, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            width: Math.max(7, size * 0.07),
            height: Math.max(7, size * 0.07),
            marginLeft: -Math.max(7, size * 0.07) / 2,
            marginTop: -Math.max(7, size * 0.07) / 2,
            background: meta.secondaryGlow,
            boxShadow: `0 0 ${size * 0.18}px ${meta.secondaryGlow}`,
          }}
        />
      </motion.div>
    </motion.div>
  )
}

export function CompanionCoreWidget({
  mood,
  message,
  level,
  stabilityScore,
  currentXp,
  nextLevelXp,
  variant = 'compact',
}: CompanionCoreWidgetProps) {
  const meta = moodMeta[mood]
  const xpPercent = (currentXp / nextLevelXp) * 100
  const isCompact = variant === 'compact'

  return (
    <GlassCard
      tone="strong"
      className={cn('relative overflow-hidden border-white/10', variantCardClasses[variant])}
      style={{
        background: `linear-gradient(180deg, rgba(11,16,32,0.92) 0%, rgba(15,23,42,0.76) 100%), radial-gradient(circle at 50% 38%, ${meta.glow}1c 0%, transparent 46%)`,
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-5 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${meta.glow}80, transparent)` }}
      />

      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-primary/80">
            Ядро-компаньон
          </p>
          <h2 className="mt-2 font-display text-xl font-bold leading-tight text-white text-glow">
            {meta.headline}
          </h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-muted">{message || meta.guidance}</p>
        </div>
        <div
          className="shrink-0 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em]"
          style={{
            borderColor: `${meta.glow}55`,
            background: `${meta.glow}14`,
            color: meta.glow,
            boxShadow: `0 0 18px ${meta.glow}22`,
          }}
        >
          {meta.label}
        </div>
      </div>

      <div className={cn('grid items-center gap-4', isCompact ? 'grid-cols-[auto_1fr]' : 'grid-cols-1')}>
        <div className="mx-auto">
          <CompanionCoreVisual mood={mood} variant={variant} />
        </div>

        <div className="min-w-0 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
                <Sparkles className="h-3.5 w-3.5" />
                Уровень
              </div>
              <p className="mt-2 font-display text-lg font-bold text-white">{level}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
                <ShieldCheck className="h-3.5 w-3.5" />
                Стабильность
              </div>
              <p className="mt-2 font-display text-lg font-bold text-white">
                {formatPercent(stabilityScore)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
                <Zap className="h-3.5 w-3.5" />
                Режим
              </div>
              <p className={`mt-2 text-sm font-semibold ${meta.textClassName}`}>{meta.caption}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/25 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="mb-2 flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
              <span>Прогресс эволюции</span>
              <span>
                {currentXp} / {nextLevelXp} XP
              </span>
            </div>
            <LinearProgress
              value={xpPercent}
              className="h-1.5 bg-white/8"
              barClassName="bg-gradient-to-r from-primary via-cyan to-violet-300"
            />
            <p className="mt-3 text-sm leading-5 text-muted">{meta.guidance}</p>
          </div>
        </div>
      </div>
    </GlassCard>
  )
}
