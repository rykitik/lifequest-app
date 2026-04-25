import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { applyLifeQuestReward } from '@/services/gameplay'
import { mockRescueProblems } from '@/services/mockData'
import { GlassCard } from '@/shared/components/GlassCard'
import { PrimaryButton } from '@/shared/components/PrimaryButton'
import { useRescueStore } from '@/stores/useRescueStore'

export function RescueModal() {
  const isOpen = useRescueStore((state) => state.isOpen)
  const currentProblem = useRescueStore((state) => state.currentProblem)
  const suggestion = useRescueStore((state) => state.suggestion)
  const setProblem = useRescueStore((state) => state.setProblem)
  const acceptSuggestion = useRescueStore((state) => state.acceptSuggestion)
  const completeSuggestion = useRescueStore((state) => state.completeSuggestion)
  const closeRescue = useRescueStore((state) => state.closeRescue)

  const handleStart = () => {
    if (!suggestion) {
      return
    }

    acceptSuggestion()
    applyLifeQuestReward(
      {
        xp: suggestion.rewardXp,
        recoveryXp: suggestion.rewardXp,
        sector: 'stability',
      },
      'Маршрут восстановления выбран. Сделай только первый шаг и потом оцени состояние заново.',
    )
    completeSuggestion()
  }

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/70 p-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeRescue}
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
                  <p className="text-xs uppercase tracking-[0.3em] text-warning/90">
                    Спасательный режим
                  </p>
                  <h2 className="mt-2 font-display text-xl font-bold text-white">
                    Мягко вернуться в систему
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Выбери, что происходит сейчас. Система сузит всё до одного короткого шага.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeRescue}
                  className="rounded-full border border-white/10 bg-white/5 p-2 text-muted transition hover:text-white"
                  aria-label="Закрыть спасательный режим"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                {mockRescueProblems.map((problem) => {
                  const active = currentProblem?.id === problem.id

                  return (
                    <button
                      key={problem.id}
                      type="button"
                      onClick={() => setProblem(problem.id)}
                      className="w-full rounded-2xl border px-4 py-3 text-left transition"
                      style={{
                        borderColor: active ? 'rgba(245, 158, 11, 0.45)' : 'rgba(148, 163, 184, 0.12)',
                        background: active
                          ? 'linear-gradient(180deg, rgba(245, 158, 11, 0.14) 0%, rgba(17, 24, 39, 0.72) 100%)'
                          : 'rgba(255, 255, 255, 0.03)',
                      }}
                    >
                      <p className="font-medium text-white">{problem.label}</p>
                      <p className="mt-1 text-sm leading-6 text-muted">{problem.description}</p>
                    </button>
                  )
                })}
              </div>

              {suggestion ? (
                <div className="mt-5 rounded-3xl border border-warning/20 bg-warning/10 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-warning/80">
                    Рекомендуемое действие
                  </p>
                  <h3 className="mt-2 font-display text-lg font-semibold text-white">
                    {suggestion.title}
                  </h3>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-muted">
                    {suggestion.steps.map((step) => (
                      <li key={step}>- {step}</li>
                    ))}
                  </ul>
                  <p className="mt-3 text-sm text-warning/90">{suggestion.supportNote}</p>

                  <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted">Награда за возврат</p>
                      <p className="mt-1 text-white">+{suggestion.rewardXp} Recovery XP</p>
                    </div>
                    <PrimaryButton tone="warning" onClick={handleStart}>
                      Начать шаг восстановления
                    </PrimaryButton>
                  </div>
                </div>
              ) : null}
            </GlassCard>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
