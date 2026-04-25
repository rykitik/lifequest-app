import { GlassCard } from '@/shared/components/GlassCard'
import { LinearProgress } from '@/shared/components/LinearProgress'
import { MiniSparkline } from '@/shared/components/MiniSparkline'
import { PrimaryButton } from '@/shared/components/PrimaryButton'
import { ScreenHeader } from '@/shared/components/ScreenHeader'
import { formatCurrency } from '@/shared/lib/format'
import { useCompanionStore } from '@/stores/useCompanionStore'
import { useMoneyStore } from '@/stores/useMoneyStore'
import { useProgressStore } from '@/stores/useProgressStore'

export function MoneyScreen() {
  const snapshot = useMoneyStore((state) => state.snapshot)
  const dailyMoneyQuests = useMoneyStore((state) => state.dailyMoneyQuests)
  const completeMoneyQuest = useMoneyStore((state) => state.completeMoneyQuest)
  const applyReward = useProgressStore((state) => state.applyReward)
  const setActiveMessage = useCompanionStore((state) => state.setActiveMessage)

  const debtProgress = ((snapshot.debtGoal - snapshot.debt) / snapshot.debtGoal) * 100

  const handleMoneyAction = (id: string, rewardXp: number, label: string, completed: boolean) => {
    if (completed) {
      return
    }

    completeMoneyQuest(id)
    applyReward({ xp: rewardXp, sector: 'money', consistencyXp: 1 })
    setActiveMessage(`Финансовый маршрут сдвинулся: ${label}. Спокойный контроль лучше избегания.`)
  }

  return (
    <section className="pb-6">
      <ScreenHeader
        title="Деньги"
        subtitle="Спокойная панель контроля денег. Без паники, только ясность и маленькие действия."
      />

      <GlassCard tone="strong" className="mb-5">
        <p className="text-xs uppercase tracking-[0.24em] text-cyan/80">Баланс</p>
        <div className="mt-4 grid grid-cols-[1.1fr_1fr] gap-4">
          <div>
            <p className="font-display text-4xl font-bold text-white">
              {formatCurrency(snapshot.balance)}
            </p>
            <p className="mt-2 text-sm text-success">
              +{formatCurrency(snapshot.weeklyDelta)} за неделю
            </p>
          </div>
          <MiniSparkline
            values={snapshot.history}
            color="linear-gradient(180deg, rgba(34,211,238,0.95), rgba(99,102,241,0.9))"
          />
        </div>
      </GlassCard>

      <GlassCard className="mb-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-warning/80">Долг</p>
            <p className="mt-2 font-display text-3xl font-bold text-white">
              {formatCurrency(snapshot.debt)}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
            {Math.max(0, Math.round(debtProgress))}% закрыто
          </div>
        </div>
        <LinearProgress
          value={Math.max(0, debtProgress)}
          className="mt-4"
          barClassName="bg-gradient-to-r from-warning via-amber-300 to-cyan"
        />
      </GlassCard>

      <div className="space-y-3">
        {dailyMoneyQuests.map((action) => (
          <GlassCard key={action.id} className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-white">{action.label}</p>
              <p className="mt-1 text-sm text-muted">{action.minutes} мин - +{action.rewardXp} XP</p>
            </div>
            <PrimaryButton
              tone={action.completed ? 'ghost' : 'secondary'}
              disabled={action.completed}
              onClick={() =>
                handleMoneyAction(action.id, action.rewardXp, action.label, action.completed)
              }
            >
              {action.completed ? 'Сделано' : 'Выполнить'}
            </PrimaryButton>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="mt-5 border border-cyan/15 bg-cyan/5">
        <p className="text-xs uppercase tracking-[0.24em] text-cyan/80">Спокойная заметка</p>
        <p className="mt-3 text-sm leading-6 text-slate-200">{snapshot.calmNote}</p>
      </GlassCard>
    </section>
  )
}
