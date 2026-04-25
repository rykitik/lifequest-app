import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bot, Copy, ExternalLink, Sparkles, X } from 'lucide-react'
import { GlassCard } from '@/shared/components/GlassCard'
import { PrimaryButton } from '@/shared/components/PrimaryButton'
import { useAuthStore } from '@/stores/useAuthStore'
import { usePromptCenterStore } from '@/stores/usePromptCenterStore'
import { useTodayStore } from '@/stores/useTodayStore'

export function PromptCenterSheet() {
  const isOpen = usePromptCenterStore((state) => state.isOpen)
  const cards = usePromptCenterStore((state) => state.cards)
  const selectedCard = usePromptCenterStore((state) => state.selectedCard)
  const generatedPrompt = usePromptCenterStore((state) => state.generatedPrompt)
  const userRequest = usePromptCenterStore((state) => state.userRequest)
  const preferredResponseFormat = usePromptCenterStore((state) => state.preferredResponseFormat)
  const hasCopied = usePromptCenterStore((state) => state.hasCopied)
  const setSelectedCard = usePromptCenterStore((state) => state.setSelectedCard)
  const setUserRequest = usePromptCenterStore((state) => state.setUserRequest)
  const setResponseFormat = usePromptCenterStore((state) => state.setResponseFormat)
  const generatePrompt = usePromptCenterStore((state) => state.generatePrompt)
  const copyPrompt = usePromptCenterStore((state) => state.copyPrompt)
  const openChatGPT = usePromptCenterStore((state) => state.openChatGPT)
  const closePromptCenter = usePromptCenterStore((state) => state.closePromptCenter)
  const user = useAuthStore((state) => state.user)
  const currentMode = useTodayStore((state) => state.currentMode)
  const modes = useTodayStore((state) => state.modes)
  const route = useTodayStore((state) => state.route)
  const relevantGoalsKey = (user?.relevantGoals ?? []).join('|')

  const context = {
    currentMode: modes.find((mode) => mode.key === currentMode)?.label ?? currentMode,
    mainQuest: route.mainQuest.title,
    quickWin: route.quickWin.title,
    recoveryOption: route.recoveryQuest.title,
    relevantGoals: user?.relevantGoals ?? [],
    userRequest,
    preferredResponseFormat,
  }

  useEffect(() => {
    if (isOpen && !generatedPrompt && selectedCard) {
      generatePrompt({
        currentMode: modes.find((mode) => mode.key === currentMode)?.label ?? currentMode,
        mainQuest: route.mainQuest.title,
        quickWin: route.quickWin.title,
        recoveryOption: route.recoveryQuest.title,
        relevantGoals: relevantGoalsKey ? relevantGoalsKey.split('|') : [],
        userRequest,
        preferredResponseFormat,
      })
    }
  }, [
    currentMode,
    generatePrompt,
    generatedPrompt,
    isOpen,
    modes,
    preferredResponseFormat,
    relevantGoalsKey,
    route.mainQuest.title,
    route.quickWin.title,
    route.recoveryQuest.title,
    selectedCard,
    userRequest,
  ])

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/70 p-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closePromptCenter}
        >
          <motion.div
            className="w-full max-w-[30rem]"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.22 }}
            onClick={(event) => event.stopPropagation()}
          >
            <GlassCard tone="strong" className="max-h-[90vh] overflow-auto rounded-[2rem] p-5">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-primary/80">Центр промптов</p>
                  <h2 className="mt-2 font-display text-xl font-bold text-white">
                    Внешний AI с твоим текущим контекстом
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Собери промпт здесь, а потом скопируй его или открой ChatGPT без внутреннего
                    платного API.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closePromptCenter}
                  className="rounded-full border border-white/10 bg-white/5 p-2 text-muted transition hover:text-white"
                  aria-label="Закрыть центр промптов"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="thin-scrollbar mb-4 flex gap-3 overflow-x-auto pb-1">
                {cards.map((card) => {
                  const active = selectedCard?.id === card.id

                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => setSelectedCard(card.id)}
                      className="glass-card min-w-[14rem] rounded-3xl border p-4 text-left transition"
                      style={{
                        borderColor: active ? 'rgba(99, 102, 241, 0.5)' : undefined,
                        background: active
                          ? 'linear-gradient(180deg, rgba(99, 102, 241, 0.18) 0%, rgba(17, 24, 39, 0.75) 100%)'
                          : undefined,
                      }}
                    >
                      <div className="mb-3 inline-flex rounded-2xl border border-white/10 bg-white/5 p-2 text-primary">
                        <Bot className="h-4 w-4" />
                      </div>
                      <p className="font-display text-base font-semibold text-white">{card.title}</p>
                      <p className="mt-2 text-sm leading-6 text-muted">{card.description}</p>
                    </button>
                  )
                })}
              </div>

              <div className="mb-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted">Текущий режим</p>
                  <p className="mt-2 font-medium text-white">{context.currentMode}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted">Главный квест</p>
                  <p className="mt-2 font-medium text-white">{context.mainQuest}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted">Быстрая победа</p>
                  <p className="mt-2 font-medium text-white">{context.quickWin}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted">Запасной план</p>
                  <p className="mt-2 font-medium text-white">{context.recoveryOption}</p>
                </div>
              </div>

              <div className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-white">
                    С чем тебе нужна помощь?
                  </span>
                  <textarea
                    value={userRequest}
                    onChange={(event) => setUserRequest(event.target.value)}
                    className="min-h-28 w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-muted focus:border-primary/50 focus:bg-white/10"
                    placeholder="Опиши ситуацию своими словами."
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-white">
                    Желаемый формат ответа
                  </span>
                  <input
                    value={preferredResponseFormat}
                    onChange={(event) => setResponseFormat(event.target.value)}
                    className="w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-muted focus:border-primary/50 focus:bg-white/10"
                    placeholder="Короткий маршрут, где сначала идёт лучший следующий шаг"
                  />
                </label>
              </div>

              <PrimaryButton
                fullWidth
                className="mt-4"
                icon={<Sparkles className="h-4 w-4" />}
                onClick={() => generatePrompt(context)}
              >
                Создать промпт
              </PrimaryButton>

              <div className="mt-4 rounded-[1.75rem] border border-white/10 bg-black/20 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-muted">Предпросмотр промпта</p>
                  {hasCopied ? <span className="text-xs text-success">Скопировано</span> : null}
                </div>
                <pre className="thin-scrollbar max-h-64 overflow-auto whitespace-pre-wrap font-sans text-sm leading-6 text-slate-100">
                  {generatedPrompt || 'Создай промпт, чтобы увидеть его здесь.'}
                </pre>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <PrimaryButton
                  tone="secondary"
                  fullWidth
                  icon={<Copy className="h-4 w-4" />}
                  onClick={() => {
                    void copyPrompt()
                  }}
                >
                  Скопировать промпт
                </PrimaryButton>
                <PrimaryButton
                  tone="primary"
                  fullWidth
                  icon={<ExternalLink className="h-4 w-4" />}
                  onClick={openChatGPT}
                >
                  Открыть ChatGPT
                </PrimaryButton>
              </div>
            </GlassCard>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
