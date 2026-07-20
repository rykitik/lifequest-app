import {
  Activity,
  BadgeCheck,
  Brain,
  CircleDollarSign,
  HeartPulse,
  Radio,
  ShieldCheck,
} from 'lucide-react'
import { GlassCard } from '@/shared/components/GlassCard'
import { LinearProgress } from '@/shared/components/LinearProgress'
import { formatPercent } from '@/shared/lib/format'
import type { LifeQuestSkillModule, LifeQuestSkillModuleId } from '@/features/profile/lib/skillTree'

interface SkillTreePanelProps {
  modules: LifeQuestSkillModule[]
}

const moduleIcons: Record<LifeQuestSkillModuleId, typeof Activity> = {
  body: HeartPulse,
  money: CircleDollarSign,
  focus: Brain,
  recovery: ShieldCheck,
  system: Radio,
  companion: BadgeCheck,
}

const moduleAccentClasses: Record<LifeQuestSkillModuleId, string> = {
  body: 'from-success/85 to-cyan',
  money: 'from-cyan to-primary',
  focus: 'from-primary to-violet-300',
  recovery: 'from-success to-warning',
  system: 'from-cyan to-success',
  companion: 'from-primary via-cyan to-violet-300',
}

const moduleDotClasses: Record<LifeQuestSkillModuleId, string> = {
  body: 'bg-success shadow-[0_0_12px_rgba(34,197,94,0.75)]',
  money: 'bg-cyan shadow-[0_0_12px_rgba(34,211,238,0.75)]',
  focus: 'bg-primary shadow-[0_0_12px_rgba(99,102,241,0.75)]',
  recovery: 'bg-warning shadow-[0_0_12px_rgba(245,158,11,0.65)]',
  system: 'bg-cyan shadow-[0_0_12px_rgba(34,211,238,0.75)]',
  companion: 'bg-violet-300 shadow-[0_0_12px_rgba(167,139,250,0.75)]',
}

function getStateTone(module: LifeQuestSkillModule) {
  if (module.state === 'locked' || module.state === 'forming') {
    return 'border-white/10 bg-white/[0.035] text-muted'
  }

  if (module.state === 'evolving') {
    return 'border-primary/30 bg-primary/10 text-primary/90'
  }

  if (module.state === 'stable') {
    return 'border-success/25 bg-success/10 text-success'
  }

  return 'border-cyan/25 bg-cyan/10 text-cyan'
}

export function SkillTreePanel({ modules }: SkillTreePanelProps) {
  return (
    <GlassCard className="mb-5 overflow-hidden">
      <div className="pointer-events-none -mx-5 -mt-5 mb-4 h-px bg-gradient-to-r from-transparent via-cyan/45 to-transparent" />
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.24em] text-muted">Ветки развития</p>
          <p className="mt-1 text-sm leading-5 text-muted">
            Карта жизненных модулей без лишней RPG-шумихи.
          </p>
        </div>
        <ShieldCheck className="h-5 w-5 shrink-0 text-cyan" />
      </div>

      <div className="grid grid-cols-1 gap-3 min-[430px]:grid-cols-2">
        {modules.map((module) => {
          const Icon = moduleIcons[module.id]

          return (
            <div
              className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.035] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
              key={module.id}
            >
              <div className="flex items-start gap-3">
                <div className="shrink-0 rounded-2xl border border-white/10 bg-black/20 p-2 text-cyan">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-semibold leading-tight text-white">
                        {module.label}
                      </p>
                      <p className="mt-1 break-words text-xs leading-4 text-muted">
                        {module.summary}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-white">
                      {formatPercent(module.progressPercent)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <LinearProgress
                  className="h-1.5"
                  value={module.progressPercent}
                  barClassName={`bg-gradient-to-r ${moduleAccentClasses[module.id]}`}
                />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2 py-1 text-[11px] ${getStateTone(module)}`}>
                  {module.levelLabel}
                </span>
                <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[11px] text-muted">
                  Вехи: {module.relatedMilestoneCount}
                </span>
              </div>

              <div className="mt-3 rounded-2xl border border-white/10 bg-black/18 p-2.5">
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
                  Следующий сигнал
                </p>
                <p className="mt-1 break-words text-xs leading-4 text-slate-200">
                  {module.nextSignal}
                </p>
              </div>

              {module.linkedQuest ? (
                <div className="mt-2 rounded-2xl border border-cyan/15 bg-cyan/8 p-2.5">
                  <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-cyan/80">
                    Квест дня
                  </p>
                  <p className="mt-1 break-words text-xs font-semibold leading-4 text-white">
                    {module.linkedQuest.title}
                  </p>
                  <p className="mt-1 text-[11px] text-muted">
                    {module.linkedQuest.status === 'completed' ? 'Выполнен сегодня' : 'Ждёт действия'}
                  </p>
                </div>
              ) : null}

              {module.recentMilestones.length ? (
                <div className="mt-3 space-y-1.5">
                  {module.recentMilestones.map((milestone) => (
                    <div className="flex min-w-0 items-center gap-2" key={milestone.id}>
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${moduleDotClasses[module.id]}`} />
                      <p className="min-w-0 break-words text-[11px] leading-4 text-muted">
                        {milestone.title}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-[11px] leading-4 text-muted">
                  Первая веха появится после безопасного сигнала.
                </p>
              )}
            </div>
          )
        })}
      </div>
    </GlassCard>
  )
}
