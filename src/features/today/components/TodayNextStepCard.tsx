import type { LucideIcon } from 'lucide-react'
import { BatteryCharging, Brain, HeartPulse, ShieldCheck, UserRound, Wallet } from 'lucide-react'
import type { TodayNextStepRecommendation } from '@/services/todayNextStep'
import { GlassCard } from '@/shared/components/GlassCard'
import { PrimaryButton } from '@/shared/components/PrimaryButton'

interface TodayNextStepCardProps {
  recommendation: TodayNextStepRecommendation
  onAction: () => void
  onFallback?: () => void
}

const domainIcons: Record<TodayNextStepRecommendation['domain'], LucideIcon> = {
  body: HeartPulse,
  money: Wallet,
  focus: Brain,
  recovery: BatteryCharging,
  weekly: ShieldCheck,
  profile: UserRound,
}

const domainAccent: Record<TodayNextStepRecommendation['domain'], string> = {
  body: 'text-cyan',
  money: 'text-success',
  focus: 'text-primary',
  recovery: 'text-warning',
  weekly: 'text-indigo-200',
  profile: 'text-white',
}

function getDifficultyLabel(difficulty: TodayNextStepRecommendation['difficulty']) {
  return difficulty === 'easy' ? 'Легко' : 'Средне'
}

export function TodayNextStepCard({ recommendation, onAction, onFallback }: TodayNextStepCardProps) {
  const Icon = domainIcons[recommendation.domain]

  return (
    <GlassCard className="mt-4 overflow-hidden border-cyan/20 bg-gradient-to-br from-cyan/14 via-primary/10 to-transparent !p-3.5">
      <div className="pointer-events-none -mx-3.5 -mt-3.5 mb-3 h-px bg-gradient-to-r from-transparent via-cyan/50 to-transparent" />

      <div className="flex items-start gap-3">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          <Icon className={`h-4 w-4 ${domainAccent[recommendation.domain]}`} strokeWidth={1.9} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-cyan/80">
              Следующий шаг
            </p>
            <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.08em] text-muted">
              {recommendation.minutes} мин · {getDifficultyLabel(recommendation.difficulty)}
            </span>
          </div>

          <h3 className="mt-1.5 overflow-hidden font-display text-base font-semibold leading-tight text-white [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
            {recommendation.title}
          </h3>
          {recommendation.subtitle ? (
            <p className="mt-0.5 font-display text-sm font-semibold text-cyan">
              {recommendation.subtitle}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3">
        <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-muted">Почему</p>
        <p className="mt-1.5 overflow-hidden text-[13px] leading-5 text-white/82 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3]">
          {recommendation.reason}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {recommendation.sourceLabels.map((label) => (
          <span
            key={label}
            className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-muted"
          >
            {label}
          </span>
        ))}
        <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] text-primary">
          Уверенность: {recommendation.confidence === 'high' ? 'высокая' : recommendation.confidence === 'medium' ? 'средняя' : 'низкая'}
        </span>
      </div>

      <div className="mt-3 grid gap-2">
        <PrimaryButton fullWidth className="!min-h-11 !py-2.5" onClick={onAction}>
          {recommendation.actionLabel}
        </PrimaryButton>
        {recommendation.fallbackLabel && onFallback ? (
          <PrimaryButton tone="ghost" fullWidth className="!min-h-11 !py-2.5" onClick={onFallback}>
            {recommendation.fallbackLabel}
          </PrimaryButton>
        ) : null}
      </div>
    </GlassCard>
  )
}
