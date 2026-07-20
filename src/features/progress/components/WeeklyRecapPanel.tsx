import { CalendarDays, CheckCircle2, Radio, Target } from 'lucide-react'
import { GlassCard } from '@/shared/components/GlassCard'
import type {
  WeeklyRecapMilestone,
  WeeklyRecapSignal,
  WeeklyRecapViewModel,
} from '@/features/profile/lib/weeklyRecap'

interface WeeklyRecapPanelProps {
  recap: WeeklyRecapViewModel
}

const domainTone: Record<WeeklyRecapSignal['domain'], string> = {
  body: 'border-success/20 bg-success/10 text-success',
  money: 'border-cyan/20 bg-cyan/10 text-cyan',
  focus: 'border-primary/25 bg-primary/10 text-primary/90',
  recovery: 'border-warning/25 bg-warning/10 text-warning',
  system: 'border-cyan/20 bg-cyan/10 text-cyan',
  companion: 'border-violet-300/25 bg-violet-300/10 text-violet-200',
}

function getStatusLabel(status: WeeklyRecapViewModel['status']) {
  if (status === 'strong') return 'Хорошо закреплена'
  if (status === 'active') return 'Устойчивые сигналы'
  if (status === 'forming') return 'Формируется'

  return 'Сигналы собираются'
}

function MilestoneList({ milestones }: { milestones: WeeklyRecapMilestone[] }) {
  if (!milestones.length) {
    return (
      <p className="break-words text-xs leading-5 text-muted">
        Вехи появятся, когда система зафиксирует значимые действия.
      </p>
    )
  }

  return (
    <div className="space-y-1.5">
      {milestones.map((milestone) => (
        <div className="flex min-w-0 items-center gap-2" key={milestone.id}>
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan shadow-[0_0_12px_rgba(34,211,238,0.8)]" />
          <p className="min-w-0 break-words text-[11px] leading-4 text-muted">
            {milestone.title}
          </p>
        </div>
      ))}
    </div>
  )
}

export function WeeklyRecapPanel({ recap }: WeeklyRecapPanelProps) {
  return (
    <GlassCard className="mb-5 overflow-hidden border-cyan/15 bg-gradient-to-br from-cyan/8 via-white/[0.03] to-primary/8">
      <div className="pointer-events-none -mx-5 -mt-5 mb-4 h-px bg-gradient-to-r from-transparent via-cyan/45 to-transparent" />
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.24em] text-muted">Недельное отражение</p>
          <h2 className="mt-1.5 break-words font-display text-lg font-bold leading-tight text-white">
            {recap.headline}
          </h2>
          <p className="mt-1 break-words text-sm leading-5 text-muted">{recap.summary}</p>
        </div>
        <div className="shrink-0 rounded-2xl border border-cyan/20 bg-cyan/10 p-2 text-cyan">
          <CalendarDays className="h-5 w-5" />
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] text-muted">
          {recap.periodLabel}
        </span>
        <span className="rounded-full border border-cyan/20 bg-cyan/10 px-2.5 py-1 text-[11px] text-cyan">
          {getStatusLabel(recap.status)}
        </span>
      </div>

      <div className="grid gap-2.5 min-[430px]:grid-cols-2">
        <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.035] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-cyan/80">Усилен модуль</p>
          <p className="mt-1 break-words text-sm font-semibold leading-tight text-white">
            {recap.strongestModule?.label ?? 'Сигналы собираются'}
          </p>
          <p className="mt-1 break-words text-xs leading-4 text-muted">
            {recap.strongestModule?.reason ?? 'Нужно больше локальных фактов недели.'}
          </p>
        </div>
        <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.035] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-warning/80">
            Мягкий фокус
          </p>
          <p className="mt-1 break-words text-sm font-semibold leading-tight text-white">
            {recap.attentionModule?.label ?? 'Фокус'}
          </p>
          <p className="mt-1 break-words text-xs leading-4 text-muted">
            {recap.attentionModule?.reason ?? 'Можно начать с одного простого шага.'}
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-white/10 bg-black/18 p-3">
        <div className="mb-2 flex items-center gap-2">
          <Radio className="h-4 w-4 text-cyan" />
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">Сигналы недели</p>
        </div>
        {recap.signals.length ? (
          <div className="grid gap-2 min-[430px]:grid-cols-2">
            {recap.signals.map((signal) => (
              <div
                className={`min-w-0 rounded-2xl border px-2.5 py-2 ${domainTone[signal.domain]}`}
                key={signal.id}
              >
                <p className="break-words text-[11px] leading-4 text-current">{signal.label}</p>
                <p className="mt-0.5 break-words text-xs font-semibold leading-4 text-white">
                  {signal.value}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="break-words text-sm leading-5 text-slate-200">
            Можно начать с одного мягкого сигнала. Система продолжит с текущей точки.
          </p>
        )}
      </div>

      <div className="mt-3 grid gap-2.5 min-[430px]:grid-cols-2">
        <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.035] p-3">
          <div className="mb-2 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">Вехи недели</p>
          </div>
          <MilestoneList milestones={recap.milestones} />
        </div>
        <div className="min-w-0 rounded-2xl border border-primary/20 bg-primary/8 p-3">
          <div className="mb-2 flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-primary/80">
              Фокус следующей недели
            </p>
          </div>
          <p className="break-words text-sm font-semibold leading-tight text-white">
            {recap.nextWeekFocus.title}
          </p>
          <p className="mt-1 break-words text-xs leading-4 text-muted">
            {recap.nextWeekFocus.caption}
          </p>
        </div>
      </div>

      {recap.promptCenterHint ? (
        <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <p className="break-words text-xs font-semibold leading-4 text-slate-200">
            {recap.promptCenterHint.title}
          </p>
          <p className="mt-1 break-words text-[11px] leading-4 text-muted">
            {recap.promptCenterHint.caption}
          </p>
        </div>
      ) : null}
    </GlassCard>
  )
}
