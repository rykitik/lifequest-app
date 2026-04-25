import { AnimatePresence, motion } from 'framer-motion'
import { Clock3, Sparkles, X } from 'lucide-react'
import { getModeRouteHint, getQuestDomainLabel, getRouteAssignments, routeLabels } from '@/services/questMeta'
import { getRouteCandidatesForSlot } from '@/services/routeBuilder'
import { GlassCard } from '@/shared/components/GlassCard'
import { PrimaryButton } from '@/shared/components/PrimaryButton'
import type { ModeKey, QuestItem, TodayRoute, TodayRouteKey } from '@/shared/types'

interface RoutePickerSheetProps {
  isOpen: boolean
  slot: TodayRouteKey | null
  quests: QuestItem[]
  route: TodayRoute
  currentMode: ModeKey
  onClose: () => void
  onSelect: (quest: QuestItem) => void
  onOpenPlan: () => void
}

const slotDescriptions: Record<TodayRouteKey, string> = {
  mainQuest: 'Показываем задачи с главным весом дня: фокус, влияние и ясный результат.',
  quickWin: 'Здесь лучше работают короткие шаги, которые легко закрыть и почувствовать движение.',
  recoveryQuest: 'Сюда идут мягкие запасные шаги, которые помогают не выпадать из системы.',
}

export function RoutePickerSheet({
  isOpen,
  slot,
  quests,
  route,
  currentMode,
  onClose,
  onSelect,
  onOpenPlan,
}: RoutePickerSheetProps) {
  const currentQuest = slot ? route[slot] : null
  const candidates = slot
    ? getRouteCandidatesForSlot(quests, slot, currentMode, currentQuest ? [currentQuest.id] : []).slice(
        0,
        8,
      )
    : []

  return (
    <AnimatePresence>
      {isOpen && slot ? (
        <motion.div
          className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/70 p-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-[30rem]"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.22 }}
            onClick={(event) => event.stopPropagation()}
          >
            <GlassCard tone="strong" className="max-h-[88vh] overflow-auto rounded-[2rem] p-5">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-primary/80">Замена в маршруте</p>
                  <h2 className="mt-2 font-display text-xl font-bold text-white">
                    {routeLabels[slot]}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted">{slotDescriptions[slot]}</p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-white/10 bg-white/5 p-2 text-muted transition hover:text-white"
                  aria-label="Закрыть выбор задачи"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mb-4 rounded-3xl border border-primary/15 bg-primary/10 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-primary/75">Подсказка режима</p>
                <p className="mt-2 text-sm leading-6 text-white">{getModeRouteHint(currentMode)}</p>
              </div>

              {candidates.length ? (
                <div className="space-y-3">
                  {candidates.map((quest) => {
                    const routeAssignments = getRouteAssignments(route, quest.id)

                    return (
                      <button
                        key={quest.id}
                        type="button"
                        onClick={() => onSelect(quest)}
                        className="w-full rounded-3xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-primary/30 hover:bg-white/8"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-display text-base font-semibold text-white">{quest.title}</p>
                            <p className="mt-2 text-sm leading-6 text-muted">{quest.subtitle}</p>
                          </div>
                          <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white">
                            +{quest.xp} XP
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-muted">
                            {getQuestDomainLabel(quest)}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-muted">
                            <Clock3 className="h-3.5 w-3.5" />
                            {quest.minutes} мин
                          </span>
                          {routeAssignments.length ? (
                            <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-primary">
                              Уже в маршруте: {routeAssignments.map((assignment) => routeLabels[assignment]).join(', ')}
                            </span>
                          ) : null}
                        </div>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <p className="font-medium text-white">Подходящих задач пока нет.</p>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Добавь или уточни задачи в Плане, и система сразу сможет подставить их в маршрут.
                  </p>
                  <PrimaryButton
                    tone="secondary"
                    className="mt-4"
                    fullWidth
                    icon={<Sparkles className="h-4 w-4" />}
                    onClick={onOpenPlan}
                  >
                    Открыть План
                  </PrimaryButton>
                </div>
              )}
            </GlassCard>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
