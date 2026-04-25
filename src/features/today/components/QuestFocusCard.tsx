import { CheckCircle2, Clock3 } from 'lucide-react'
import { GlassCard } from '@/shared/components/GlassCard'
import { LinearProgress } from '@/shared/components/LinearProgress'
import { PrimaryButton } from '@/shared/components/PrimaryButton'
import { cn } from '@/shared/lib/cn'
import type { QuestItem } from '@/shared/types'

interface QuestFocusCardProps {
  label: string
  quest: QuestItem
  tone: 'primary' | 'success' | 'warning'
  buttonLabel: string
  onAction: () => void
}

const toneClasses = {
  primary: {
    card: 'from-primary/20 via-indigo-500/10 to-transparent',
    bar: 'from-primary via-indigo-400 to-cyan',
    badge: 'text-primary',
  },
  success: {
    card: 'from-success/18 via-emerald-400/8 to-transparent',
    bar: 'from-success via-emerald-300 to-cyan',
    badge: 'text-success',
  },
  warning: {
    card: 'from-warning/18 via-amber-400/8 to-transparent',
    bar: 'from-warning via-amber-300 to-orange-300',
    badge: 'text-warning',
  },
}

export function QuestFocusCard({
  label,
  quest,
  tone,
  buttonLabel,
  onAction,
}: QuestFocusCardProps) {
  const theme = toneClasses[tone]
  const isComplete = quest.status === 'complete'

  return (
    <GlassCard
      className={cn(
        'overflow-hidden border-white/10 bg-gradient-to-br',
        theme.card,
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted">{label}</p>
          <h3 className="mt-2 font-display text-lg font-semibold text-white">{quest.title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted">{quest.subtitle}</p>
        </div>
        {isComplete ? (
          <div className="rounded-full border border-success/25 bg-success/15 p-2 text-success">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        ) : null}
      </div>

      <div className="mb-4 flex items-center justify-between text-sm text-muted">
        <div className="flex items-center gap-2">
          <Clock3 className="h-4 w-4" />
          <span>{quest.minutes} мин</span>
        </div>
        <span className={cn('font-medium', theme.badge)}>+{quest.xp} XP</span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-muted">
          <span>Прогресс</span>
          <span>{quest.progress}%</span>
        </div>
        <LinearProgress value={quest.progress} barClassName={cn('bg-gradient-to-r', theme.bar)} />
      </div>

      <PrimaryButton
        tone={isComplete ? 'ghost' : 'secondary'}
        fullWidth
        className="mt-4"
        disabled={isComplete}
        onClick={onAction}
      >
        {isComplete ? 'Сделано' : buttonLabel}
      </PrimaryButton>
    </GlassCard>
  )
}
