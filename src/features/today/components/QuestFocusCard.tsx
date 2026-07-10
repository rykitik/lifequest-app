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
    <GlassCard className={cn('overflow-hidden border-white/10 bg-gradient-to-br !p-3.5', theme.card)}>
      {!quest ? (
        <>
          <div className="mb-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">{label}</p>
            <h3 className="mt-1.5 font-display text-base font-semibold leading-tight text-white">
              {emptyTitle ?? 'Слот пока свободен'}
            </h3>
            <p className="mt-1.5 overflow-hidden text-[13px] leading-5 text-muted [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
              {emptyDescription ??
                'Выбери задачу в Плане, чтобы поставить сюда один ясный маршрут.'}
            </p>
          </div>

          <PrimaryButton tone="secondary" fullWidth className="mt-3 !min-h-11 !py-2" onClick={onEmptyAction}>
            {emptyButtonLabel ?? 'Выбрать в Плане'}
          </PrimaryButton>
        </>
      ) : (
        <>
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">{label}</p>
              <h3 className="mt-1.5 overflow-hidden font-display text-base font-semibold leading-tight text-white [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                {quest.title}
              </h3>
              <p className="mt-1.5 overflow-hidden text-[13px] leading-5 text-muted [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                {quest.subtitle}
              </p>
            </div>
            <div
              className={cn(
                'shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium',
                isComplete
                  ? 'border-success/25 bg-success/15 text-success'
                  : 'border-white/10 bg-white/5 text-white/75',
              )}
            >
              {isComplete ? 'Выполнено' : 'В маршруте'}
            </div>
          </div>

          <div className="mb-3 flex items-center justify-between text-[13px] text-muted">
            <div className="flex items-center gap-2">
              <Clock3 className="h-3.5 w-3.5" />
              <span>{quest.minutes} мин</span>
            </div>
            <span className={cn('font-medium', theme.badge)}>+{quest.xp} XP</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
              <span>Прогресс</span>
              <span>{quest.progress}%</span>
            </div>
            <LinearProgress
              value={quest.progress}
              className="h-1.5"
              barClassName={cn('bg-gradient-to-r', theme.bar)}
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <PrimaryButton
              tone={isComplete ? 'ghost' : 'secondary'}
              fullWidth
              className="!min-h-11 !py-2"
              disabled={isComplete}
              onClick={onComplete}
            >
              {isComplete ? 'Уже выполнено' : 'Выполнено'}
            </PrimaryButton>
            <PrimaryButton
              tone="ghost"
              fullWidth
              className="!min-h-11 !py-2"
              icon={<RefreshCcw className="h-3.5 w-3.5" />}
              onClick={onReplace}
            >
              Заменить
            </PrimaryButton>
          </div>

          {isComplete ? (
            <div className="mt-3 flex items-center gap-2 rounded-2xl border border-success/20 bg-success/10 px-3 py-2.5 text-[13px] leading-5 text-success">
              <CheckCircle2 className="h-4 w-4" />
              <span>Этот слот закрыт. При желании можно мягко выбрать следующую задачу.</span>
            </div>
          ) : null}
        </>
      )}
    </GlassCard>
  )
}
