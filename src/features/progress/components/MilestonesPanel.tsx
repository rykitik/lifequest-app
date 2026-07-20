import { CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { GlassCard } from '@/shared/components/GlassCard'
import type { SystemProfileMilestone } from '@/features/profile/lib/systemProfile'

interface MilestonesPanelProps {
  milestones: SystemProfileMilestone[]
  totalCount: number
  emptyText: string
}

function formatMilestoneDate(value?: string) {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
  }).format(date)
}

export function MilestonesPanel({ emptyText, milestones, totalCount }: MilestonesPanelProps) {
  const [expanded, setExpanded] = useState(false)
  const visibleMilestones = expanded ? milestones : milestones.slice(0, 3)
  const canExpand = milestones.length > 3

  return (
    <GlassCard className="mb-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.24em] text-muted">Вехи системы</p>
          <p className="mt-1 text-sm leading-5 text-muted">
            {totalCount > 0
              ? `Зафиксировано: ${totalCount}`
              : 'История появится после первых безопасных действий.'}
          </p>
        </div>
        <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
      </div>

      {visibleMilestones.length ? (
        <div className="space-y-2.5">
          {visibleMilestones.map((milestone) => {
            const dateLabel = formatMilestoneDate(milestone.createdAt)

            return (
              <div
                key={milestone.id}
                className="flex min-w-0 items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3"
              >
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-cyan shadow-[0_0_12px_rgba(34,211,238,0.8)]" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="min-w-0 break-words text-sm font-semibold leading-tight text-white">
                      {milestone.label}
                    </p>
                    {dateLabel ? (
                      <span className="shrink-0 rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[11px] text-muted">
                        {dateLabel}
                      </span>
                    ) : null}
                  </div>
                  {milestone.caption ? (
                    <p className="mt-1 break-words text-xs leading-4 text-muted">{milestone.caption}</p>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
          <p className="text-sm leading-5 text-slate-200">{emptyText}</p>
        </div>
      )}

      {canExpand ? (
        <button
          className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-sm font-medium text-slate-200 transition hover:border-cyan/35 hover:text-white"
          type="button"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {expanded ? 'Свернуть' : 'Показать все'}
        </button>
      ) : null}
    </GlassCard>
  )
}
