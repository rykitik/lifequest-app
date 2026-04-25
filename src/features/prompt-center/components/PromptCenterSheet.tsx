import { useEffect, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bot, Copy, ExternalLink, Sparkles, X } from 'lucide-react'
import { GlassCard } from '@/shared/components/GlassCard'
import { PrimaryButton } from '@/shared/components/PrimaryButton'
import { useAuthStore } from '@/stores/useAuthStore'
import { useProgressStore } from '@/stores/useProgressStore'
import { usePromptCenterStore } from '@/stores/usePromptCenterStore'
import { useQuestStore } from '@/stores/useQuestStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useTodayStore } from '@/stores/useTodayStore'

function getToneLabel(preferredTone: 'calm' | 'direct' | 'supportive') {
  switch (preferredTone) {
    case 'direct':
      return 'Прямой'
    case 'supportive':
      return 'Поддерживающий'
    case 'calm':
    default:
      return 'Спокойный'
  }
}

export function PromptCenterSheet() {
  const isOpen = usePromptCenterStore((state) => state.isOpen)
  const cards = usePromptCenterStore((state) => state.cards)
  const selectedCardId = usePromptCenterStore((state) => state.selectedCardId)
  const generatedPrompt = usePromptCenterStore((state) => state.generatedPrompt)
  const userRequest = usePromptCenterStore((state) => state.userRequest)
  const preferredResponseFormat = usePromptCenterStore((state) => state.preferredResponseFormat)
  const hasCopied = usePromptCenterStore((state) => state.hasCopied)
  const showCopyFallback = usePromptCenterStore((state) => state.showCopyFallback)
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
  const active = useQuestStore((state) => state.active)
  const parked = useQuestStore((state) => state.parked)
  const level = useProgressStore((state) => state.level)
  const sectors = useProgressStore((state) => state.sectors)
  const preferredTone = useSettingsStore((state) => state.preferredTone)

  const selectedCard = cards.find((card) => card.id === selectedCardId) ?? cards[0] ?? null
  const currentModeLabel = modes.find((mode) => mode.key === currentMode)?.label ?? currentMode
  const relevantGoals = useMemo(() => user?.relevantGoals ?? [], [user?.relevantGoals])
  const activeQuests = useMemo(
    () =>
      active
        .filter((quest) => quest.status !== 'complete')
        .slice(0, 4)
        .map((quest) => quest.title),
    [active],
  )
  const parkedQuests = useMemo(
    () =>
      parked
        .filter((quest) => quest.status !== 'complete')
        .slice(0, 3)
        .map((quest) => quest.title),
    [parked],
  )
  const progressSummary = useMemo(
    () => [`Уровень ${level}`, ...sectors.map((sector) => `${sector.label}: ${sector.percent}%`).slice(0, 4)],
    [level, sectors],
  )
  const relevantGoalsKey = relevantGoals.join('|')
  const activeQuestsKey = activeQuests.join('|')
  const parkedQuestsKey = parkedQuests.join('|')
  const progressSummaryKey = progressSummary.join('|')

  const context = useMemo(
    () => ({
      currentMode: currentModeLabel,
      mainQuest: route.mainQuest?.title ?? 'Не выбран',
      quickWin: route.quickWin?.title ?? 'Не выбрана',
      recoveryOption: route.recoveryQuest?.title ?? 'Не подготовлен',
      preferredTone,
      relevantGoals,
      activeQuests,
      parkedQuests,
      progressSummary,
      userRequest,
      preferredResponseFormat,
    }),
    [
      activeQuests,
      currentModeLabel,
      parkedQuests,
      preferredTone,
      preferredResponseFormat,
      progressSummary,
      relevantGoals,
      route.mainQuest?.title,
      route.quickWin?.title,
      route.recoveryQuest?.title,
      userRequest,
    ],
  )

  const contextPreviewRows = useMemo(
    () => [
      { label: 'Текущий режим', value: context.currentMode },
      { label: 'Главный квест', value: context.mainQuest },
      { label: 'Быстрая победа', value: context.quickWin },
      { label: 'Запасной план', value: context.recoveryOption },
      { label: 'Тон ответа', value: getToneLabel(context.preferredTone) },
      {
        label: 'Активные задачи',
        value: context.activeQuests.length ? context.activeQuests.join(', ') : 'Нет активных задач',
      },
      {
        label: 'Прогресс',
        value: context.progressSummary.join(' • '),
      },
    ],
    [context],
  )

  useEffect(() => {
    if (!isOpen || generatedPrompt || !selectedCard) {
      return
    }

    generatePrompt({
      currentMode: currentModeLabel,
      mainQuest: route.mainQuest?.title ?? 'Не выбран',
      quickWin: route.quickWin?.title ?? 'Не выбрана',
      recoveryOption: route.recoveryQuest?.title ?? 'Не подготовлен',
      preferredTone,
      relevantGoals: relevantGoalsKey ? relevantGoalsKey.split('|') : [],
      activeQuests: activeQuestsKey ? activeQuestsKey.split('|') : [],
      parkedQuests: parkedQuestsKey ? parkedQuestsKey.split('|') : [],
      progressSummary: progressSummaryKey ? progressSummaryKey.split('|') : [],
      userRequest,
      preferredResponseFormat,
    })
  }, [
    activeQuestsKey,
    currentModeLabel,
    generatePrompt,
    generatedPrompt,
    isOpen,
    parkedQuestsKey,
    preferredTone,
    preferredResponseFormat,
    progressSummaryKey,
    relevantGoalsKey,
    route.mainQuest?.title,
    route.quickWin?.title,
    route.recoveryQuest?.title,
    selectedCard,
    userRequest,
  ])

  const handleCopy = async () => {
    if (!generatedPrompt) {
      generatePrompt(context)
    }

    await copyPrompt()
  }

  const handleOpenChatGPT = async () => {
    generatePrompt(context)
    await copyPrompt()
    openChatGPT()
  }

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
                    Внешний AI с текущим состоянием системы
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Сюда попадут режим, маршрут дня, активные задачи и прогресс. Потом промпт можно скопировать или открыть в ChatGPT.
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
                  const activeCard = selectedCard?.id === card.id

                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => setSelectedCard(card.id)}
                      className="glass-card min-w-[14rem] rounded-3xl border p-4 text-left transition"
                      style={{
                        borderColor: activeCard ? 'rgba(99, 102, 241, 0.5)' : undefined,
                        background: activeCard
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

              <GlassCard className="mb-4 border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted">
                  Контекст, который уйдёт в промпт
                </p>
                <div className="mt-3 space-y-3">
                  {contextPreviewRows.map((row) => (
                    <div key={row.label} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted">{row.label}</p>
                      <p className="mt-2 text-sm leading-6 text-white">{row.value}</p>
                    </div>
                  ))}
                </div>
              </GlassCard>

              <div className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-white">Что сейчас происходит?</span>
                  <textarea
                    value={userRequest}
                    onChange={(event) => setUserRequest(event.target.value)}
                    className="min-h-28 w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-muted focus:border-primary/50 focus:bg-white/10"
                    placeholder="Опиши ситуацию своими словами: где застрял, что давит, что важно удержать."
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-white">Желаемый формат ответа</span>
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

              {showCopyFallback ? (
                <div className="mt-4 rounded-[1.75rem] border border-warning/20 bg-warning/10 p-4">
                  <p className="text-sm font-medium text-white">
                    Буфер обмена недоступен. Скопируй текст вручную из поля ниже.
                  </p>
                  <textarea
                    readOnly
                    value={generatedPrompt}
                    className="mt-3 min-h-32 w-full rounded-3xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
                  />
                </div>
              ) : null}

              <div className="mt-4 grid grid-cols-2 gap-3">
                <PrimaryButton
                  tone="secondary"
                  fullWidth
                  icon={<Copy className="h-4 w-4" />}
                  onClick={() => {
                    void handleCopy()
                  }}
                >
                  Скопировать
                </PrimaryButton>
                <PrimaryButton
                  tone="primary"
                  fullWidth
                  icon={<ExternalLink className="h-4 w-4" />}
                  onClick={() => {
                    void handleOpenChatGPT()
                  }}
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
