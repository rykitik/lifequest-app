import { CheckCircle2, Clock3, RefreshCcw } from 'lucide-react'
import { GlassCard } from '@/shared/components/GlassCard'
import { LinearProgress } from '@/shared/components/LinearProgress'
import { PrimaryButton } from '@/shared/components/PrimaryButton'
import { cn } from '@/shared/lib/cn'
import type { QuestItem } from '@/shared/types'

interface QuestFocusCardProps {
  label: string
  quest: QuestItem | null
  tone: 'primary' | 'success' | 'warning'
  onComplete: () => void
  onReplace?: () => void
  emptyTitle?: string
  emptyDescription?: string
  emptyButtonLabel?: string
  onEmptyAction: () => void
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
  onComplete,
  onReplace,
  emptyTitle,
  emptyDescription,
  emptyButtonLabel,
  onEmptyAction,
}: QuestFocusCardProps) {
  const theme = toneClasses[tone]
  const isComplete = quest?.status === 'complete'

  return (
    <GlassCard className={cn('overflow-hidden border-white/10 bg-gradient-to-br', theme.card)}>
      {!quest ? (
        <>
          <div className="mb-4">
            <p className="text-xs uppercase tracking-[0.22em] text-muted">{label}</p>
            <h3 className="mt-2 font-display text-lg font-semibold text-white">
              {emptyTitle ?? 'Слот пока свободен'}
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              {emptyDescription ??
                'Выбери задачу в Плане, чтобы поставить сюда один ясный маршрут.'}
            </p>
          </div>

          <PrimaryButton tone="secondary" fullWidth className="mt-4" onClick={onEmptyAction}>
            {emptyButtonLabel ?? 'Выбрать в Плане'}
          </PrimaryButton>
        </>
      ) : (
        <>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-muted">{label}</p>
              <h3 className="mt-2 font-display text-lg font-semibold text-white">{quest.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{quest.subtitle}</p>
            </div>
            <div
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium',
                isComplete
                  ? 'border-success/25 bg-success/15 text-success'
                  : 'border-white/10 bg-white/5 text-white/75',
              )}
            >
              {isComplete ? 'Выполнено' : 'В маршруте'}
            </div>
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

          <div className="mt-4 grid grid-cols-2 gap-3">
            <PrimaryButton
              tone={isComplete ? 'ghost' : 'secondary'}
              fullWidth
              disabled={isComplete}
              onClick={onComplete}
            >
              {isComplete ? 'Уже выполнено' : 'Выполнено'}
            </PrimaryButton>
            <PrimaryButton
              tone="ghost"
              fullWidth
              icon={<RefreshCcw className="h-4 w-4" />}
              onClick={onReplace}
            >
              Заменить
            </PrimaryButton>
          </div>

          {isComplete ? (
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-success/20 bg-success/10 px-3 py-3 text-sm text-success">
              <CheckCircle2 className="h-4 w-4" />
              <span>Этот слот закрыт. При желании можно мягко выбрать следующую задачу.</span>
            </div>
          ) : null}
        </>
      )}
    </GlassCard>
  )
}
