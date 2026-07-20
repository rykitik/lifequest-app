import type { LucideIcon } from 'lucide-react'
import { BatteryCharging, CheckCircle2, HeartPulse, ShieldCheck, Sparkles, Target, Wallet } from 'lucide-react'
import { GlassCard } from '@/shared/components/GlassCard'
import { PrimaryButton } from '@/shared/components/PrimaryButton'
import { cn } from '@/shared/lib/cn'
import type { DailyQuest } from '@/shared/types'

interface DailyQuestCardProps {
  quest: DailyQuest
  onAction: () => void
}

const domainIcons: Record<DailyQuest['domain'], LucideIcon> = {
  body: HeartPulse,
  money: Wallet,
  focus: Target,
  recovery: BatteryCharging,
  system: ShieldCheck,
}

const domainAccent: Record<DailyQuest['domain'], string> = {
  body: 'text-cyan',
  money: 'text-success',
  focus: 'text-primary',
  recovery: 'text-warning',
  system: 'text-indigo-200',
}

const domainGlow: Record<DailyQuest['domain'], string> = {
  body: 'from-cyan/18 via-primary/10 to-transparent',
  money: 'from-success/16 via-cyan/10 to-transparent',
  focus: 'from-primary/18 via-cyan/10 to-transparent',
  recovery: 'from-warning/16 via-success/8 to-transparent',
  system: 'from-indigo-400/16 via-cyan/8 to-transparent',
}

function getDifficultyLabel(difficulty: DailyQuest['difficulty']) {
  return difficulty === 'tiny' ? 'Малый шаг' : 'Обычный шаг'
}

export function DailyQuestCard({ quest, onAction }: DailyQuestCardProps) {
  const Icon = domainIcons[quest.domain]
  const isCompleted = Boolean(quest.completedAt)

  return (
    <GlassCard
      className={cn(
        'mt-4 overflow-hidden border-cyan/20 bg-gradient-to-br !p-3.5',
        domainGlow[quest.domain],
      )}
    >
      <div className="pointer-events-none -mx-3.5 -mt-3.5 mb-3 h-px bg-gradient-to-r from-transparent via-cyan/50 to-transparent" />

      <div className="flex items-start gap-3">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          <Icon className={cn('h-4 w-4', domainAccent[quest.domain])} strokeWidth={1.9} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-cyan/80">
              Главный квест дня
            </p>
            <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.08em] text-muted">
              {getDifficultyLabel(quest.difficulty)}
            </span>
          </div>

          <h3 className="mt-1.5 break-words font-display text-base font-semibold leading-tight text-white">
            {quest.title}
          </h3>
          <p className="mt-1.5 break-words text-[13px] leading-5 text-white/82">
            {quest.caption}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-2 rounded-2xl border border-white/10 bg-black/20 p-3">
        <div className="min-w-0">
          <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-muted">Награда</p>
          <p className="mt-1 break-words text-sm font-semibold text-white">{quest.rewardSignal}</p>
        </div>
        <div
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-full border',
            isCompleted
              ? 'border-success/30 bg-success/15 text-success'
              : 'border-cyan/25 bg-cyan/10 text-cyan',
          )}
          aria-hidden="true"
        >
          {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
        </div>
      </div>

      {isCompleted ? (
        <div className="mt-3 rounded-2xl border border-success/20 bg-success/10 px-3 py-2.5">
          <p className="text-sm font-semibold text-success">Выполнено сегодня</p>
          <p className="mt-1 text-[13px] leading-5 text-slate-200">
            Сигнал дня принят. Следующий мягкий шаг можно выбрать позже.
          </p>
        </div>
      ) : (
        <PrimaryButton fullWidth className="mt-3 !min-h-11 !py-2.5" onClick={onAction}>
          {quest.actionLabel}
        </PrimaryButton>
      )}
    </GlassCard>
  )
}
