import {
  Activity,
  ArrowRight,
  BadgeCheck,
  Brain,
  CircleDollarSign,
  HeartPulse,
  Radio,
  ShieldCheck,
} from 'lucide-react'
import { PrimaryButton } from '@/shared/components/PrimaryButton'
import { GlassCard } from '@/shared/components/GlassCard'
import { LinearProgress } from '@/shared/components/LinearProgress'
import { formatPercent } from '@/shared/lib/format'
import type {
  LifeQuestModuleSuggestion,
  LifeQuestSkillModule,
  LifeQuestSkillModuleId,
} from '@/features/profile/lib/skillTree'

interface SkillTreePanelProps {
  modules: LifeQuestSkillModule[]
  onSuggestionAction?: (suggestion: LifeQuestModuleSuggestion, module: LifeQuestSkillModule) => void
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

function getStateTone(module: LifeQuestSkillModule) {
  if (module.state === 'locked' || module.state === 'forming') {
    return 'bg-white/[0.045] text-muted'
  }

  if (module.state === 'evolving') {
    return 'bg-primary/12 text-primary/90'
  }

  if (module.state === 'stable') {
    return 'bg-success/12 text-success'
  }

  return 'bg-cyan/12 text-cyan'
}

function getSuggestionTone(suggestion: LifeQuestModuleSuggestion) {
  if (suggestion.priority === 'high') {
    return 'bg-cyan/10'
  }

  if (suggestion.priority === 'normal') {
    return 'bg-primary/8'
  }

  return 'bg-white/[0.035]'
}

function getDailyQuestLabel(module: LifeQuestSkillModule) {
  const status = module.suggestion?.linkedDailyQuest ?? module.linkedQuest?.status

  if (!status) {
    return null
  }

  return status === 'completed' ? 'Квест дня выполнен' : 'Квест дня'
}

export function SkillTreePanel({ modules, onSuggestionAction }: SkillTreePanelProps) {
  return (
    <GlassCard className="mb-5 overflow-hidden !p-3.5">
      <div className="pointer-events-none -mx-3.5 -mt-3.5 mb-4 h-px bg-gradient-to-r from-transparent via-cyan/45 to-transparent" />
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan/80">Ветки развития</p>
          <p className="mt-1 text-[13px] leading-5 text-muted">
            Состояние модулей и один ближайший сигнал для системы.
          </p>
        </div>
        <ShieldCheck className="h-5 w-5 shrink-0 text-cyan" />
      </div>

      <div className="grid grid-cols-1 gap-3 min-[560px]:grid-cols-2">
        {modules.map((module) => {
          const Icon = moduleIcons[module.id]
          const suggestion = module.suggestion
          const dailyQuestLabel = getDailyQuestLabel(module)
          const suggestionTitle = suggestion?.title ?? module.nextSignal
          const suggestionCaption = suggestion?.caption
          const canRunSuggestion = suggestion && suggestion.actionType !== 'none'

          return (
            <div
              className="min-w-0 rounded-[1.35rem] border border-white/[0.08] bg-white/[0.035] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
              key={module.id}
            >
              <div className="flex items-start gap-3">
                <div className="shrink-0 rounded-2xl bg-black/20 p-2.5 text-cyan shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 break-words text-[15px] font-semibold leading-tight text-white">
                      {module.label}
                    </p>
                    <span className="shrink-0 text-sm font-semibold text-white">
                      {formatPercent(module.progressPercent)}
                    </span>
                  </div>
                  <p className="break-words text-[13px] leading-5 text-muted">
                    {module.summary} · {module.levelLabel}
                  </p>
                </div>
              </div>

              <div className="mt-3">
                <LinearProgress
                  className="h-1"
                  value={module.progressPercent}
                  barClassName={`bg-gradient-to-r ${moduleAccentClasses[module.id]}`}
                />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className={`rounded-full px-2 py-0.5 text-[11px] leading-4 ${getStateTone(module)}`}>
                  {module.state === 'locked' ? 'Нужен сигнал' : 'Модуль активен'}
                </span>
                {dailyQuestLabel ? (
                  <span className="rounded-full bg-cyan/10 px-2 py-0.5 text-[11px] leading-4 text-cyan">
                    {dailyQuestLabel}
                  </span>
                ) : null}
                <span className="rounded-full bg-black/18 px-2 py-0.5 text-[11px] leading-4 text-muted">
                  Вехи: {module.relatedMilestoneCount}
                </span>
              </div>

              <div
                className={`mt-3 rounded-2xl p-3 ${suggestion ? getSuggestionTone(suggestion) : 'bg-white/[0.035]'}`}
                data-testid={`module-suggestion-${module.id}`}
              >
                <p className="text-[11px] font-medium leading-4 text-cyan/85">
                  Следующий сигнал
                </p>
                <p className="mt-1 break-words text-sm font-semibold leading-5 text-white">
                  {suggestionTitle}
                </p>
                {suggestionCaption ? (
                  <p className="mt-1 break-words text-[13px] leading-5 text-muted">
                    {suggestionCaption}
                  </p>
                ) : null}
                {canRunSuggestion ? (
                  <div className="mt-3">
                    <PrimaryButton
                      className="min-h-9 rounded-xl px-3 py-2 text-xs"
                      data-testid={`module-suggestion-action-${module.id}`}
                      icon={<ArrowRight className="h-3.5 w-3.5" />}
                      onClick={() => onSuggestionAction?.(suggestion, module)}
                      tone="secondary"
                      type="button"
                    >
                      {suggestion.actionLabel}
                    </PrimaryButton>
                  </div>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </GlassCard>
  )
}
