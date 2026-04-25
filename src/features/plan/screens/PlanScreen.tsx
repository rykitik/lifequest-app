import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { GlassCard } from '@/shared/components/GlassCard'
import { PrimaryButton } from '@/shared/components/PrimaryButton'
import { ScreenHeader } from '@/shared/components/ScreenHeader'
import { useQuestStore } from '@/stores/useQuestStore'
import { useTodayStore } from '@/stores/useTodayStore'
import type { QuestClassification } from '@/shared/types'

const classificationOptions: Array<{ label: string; value: QuestClassification }> = [
  { label: 'Фокус', value: 'focus' },
  { label: 'Быстро', value: 'quick_win' },
  { label: 'Тело', value: 'body' },
  { label: 'Деньги', value: 'money' },
  { label: 'Потом', value: 'later' },
]

export function PlanScreen() {
  const [draft, setDraft] = useState('')
  const route = useTodayStore((state) => state.route)
  const inbox = useQuestStore((state) => state.inbox)
  const active = useQuestStore((state) => state.active)
  const parked = useQuestStore((state) => state.parked)
  const addQuest = useQuestStore((state) => state.addQuest)
  const classifyQuest = useQuestStore((state) => state.classifyQuest)
  const unpackQuest = useQuestStore((state) => state.unpackQuest)

  const previewQuest = active[0] ?? inbox[0] ?? null

  const handleAddQuest = () => {
    if (!draft.trim()) {
      return
    }

    addQuest(draft)
    setDraft('')
  }

  return (
    <section className="pb-6">
      <ScreenHeader
        title="План"
        subtitle="Захватывай быстро, сортируй легко и разворачивай только ближайший реальный шаг."
      />

      <GlassCard tone="strong" className="mb-5">
        <p className="text-xs uppercase tracking-[0.24em] text-primary/80">Быстрый ввод</p>
        <div className="mt-3 space-y-3">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-muted focus:border-primary/50 focus:bg-white/10"
            placeholder="Сбрось сюда задачу без лишнего анализа"
          />
          <PrimaryButton fullWidth onClick={handleAddQuest}>
            Добавить задачу
          </PrimaryButton>
        </div>
      </GlassCard>

      <GlassCard className="mb-5">
        <p className="text-xs uppercase tracking-[0.24em] text-muted">Маршрут дня</p>
        <div className="mt-4 space-y-3 text-sm text-muted">
          <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-primary/80">Главный квест</p>
            <p className="mt-2 text-white">{route.mainQuest.title}</p>
          </div>
          <div className="rounded-2xl border border-success/20 bg-success/10 p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-success/80">Быстрая победа</p>
            <p className="mt-2 text-white">{route.quickWin.title}</p>
          </div>
          <div className="rounded-2xl border border-warning/20 bg-warning/10 p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-warning/80">Запасной план</p>
            <p className="mt-2 text-white">{route.recoveryQuest.title}</p>
          </div>
        </div>
      </GlassCard>

      <div className="space-y-4">
        <div>
          <p className="mb-3 text-xs uppercase tracking-[0.24em] text-muted">Входящие</p>
          <div className="space-y-3">
            {inbox.map((quest) => (
              <GlassCard key={quest.id} className="space-y-4">
                <div>
                  <p className="font-display text-lg font-semibold text-white">{quest.title}</p>
                  <p className="mt-2 text-sm leading-6 text-muted">{quest.subtitle}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {classificationOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => classifyQuest(quest.id, option.value)}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white transition hover:border-primary/35 hover:bg-primary/10"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </GlassCard>
            ))}
          </div>
        </div>

        <GlassCard className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted">Разложить на 3 шага</p>
              <h3 className="mt-2 font-display text-lg font-semibold text-white">
                {previewQuest?.title ?? 'Пока нет активного квеста'}
              </h3>
            </div>
            <PrimaryButton
              tone="secondary"
              icon={<Sparkles className="h-4 w-4" />}
              disabled={!previewQuest}
              onClick={() => {
                if (previewQuest) {
                  unpackQuest(previewQuest.id)
                }
              }}
            >
              Развернуть
            </PrimaryButton>
          </div>

          {previewQuest?.steps?.length ? (
            <div className="space-y-3">
              {previewQuest.steps.map((step, index) => (
                <div
                  key={step.id}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                >
                  <p className="text-xs uppercase tracking-[0.18em] text-muted">
                    Шаг {index + 1}
                  </p>
                  <p className="mt-2 text-white">{step.label}</p>
                  <p className="mt-1 text-sm text-muted">{step.minutes} мин</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-6 text-muted">
              Выбери квест и разложи только ближайшие три шага, а не всё будущее сразу.
            </p>
          )}
        </GlassCard>

        <GlassCard>
          <p className="text-xs uppercase tracking-[0.24em] text-muted">Линии системы</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-muted">Активно сейчас</p>
              <p className="mt-2 font-display text-xl font-bold text-white">{active.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-muted">Отложено</p>
              <p className="mt-2 font-display text-xl font-bold text-white">{parked.length}</p>
            </div>
          </div>
        </GlassCard>
      </div>
    </section>
  )
}
