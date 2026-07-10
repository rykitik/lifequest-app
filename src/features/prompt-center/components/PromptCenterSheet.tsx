import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileJson,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { buildFullLifeQuestContext } from '@/services/contextBuilder'
import { GlassCard } from '@/shared/components/GlassCard'
import { PrimaryButton } from '@/shared/components/PrimaryButton'
import { usePromptCenterStore } from '@/stores/usePromptCenterStore'
import type { LifeQuestPromptResponse } from '@/shared/types'

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <p className="text-[10px] uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-1 text-sm leading-5 text-white">{value || 'Нет данных'}</p>
    </div>
  )
}

function ParsedResponsePreview({ response }: { response: LifeQuestPromptResponse }) {
  const rows = [
    { label: 'Краткий вывод', value: response.summary },
    { label: 'Главный квест', value: response.todayMainQuest },
    { label: 'Быстрая победа', value: response.quickWin },
    { label: 'Запасной план', value: response.recoveryAction },
    { label: 'Фокус по телу', value: response.bodyFocus },
    { label: 'Фокус по деньгам', value: response.moneyFocus },
    { label: 'Риск', value: response.risk },
    { label: 'Сообщение от Ядра', value: response.coreMessage },
  ]

  return (
    <div className="mt-4 rounded-[1.5rem] border border-success/20 bg-success/10 p-3.5">
      <div className="mb-3 flex items-center gap-2 text-success">
        <CheckCircle2 className="h-4 w-4" />
        <p className="text-xs font-semibold uppercase tracking-[0.18em]">Рекомендации готовы</p>
      </div>
      <div className="grid gap-2">
        {rows.map((row) => (
          <PreviewRow key={row.label} label={row.label} value={row.value} />
        ))}
      </div>

      <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3">
        <p className="text-[10px] uppercase tracking-[0.16em] text-muted">Suggested actions</p>
        {response.suggestedActions.length ? (
          <div className="mt-2 space-y-2">
            {response.suggestedActions.map((action) => (
              <div
                key={`${action.domain}-${action.title}`}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-3"
              >
                <p className="text-sm font-medium text-white">{action.title}</p>
                <p className="mt-1 text-xs text-muted">
                  {action.domain} / {action.difficulty} / +{action.xp} XP
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">Нет дополнительных действий.</p>
        )}
      </div>
    </div>
  )
}

function getContextPreviewRows() {
  const context = buildFullLifeQuestContext()

  return [
    { label: 'Режим', value: context.today.mode.label },
    {
      label: 'Главный квест',
      value: context.today.route.mainQuest?.title ?? 'Не выбран',
    },
    {
      label: 'Быстрая победа',
      value: context.today.route.quickWin?.title ?? 'Не выбрана',
    },
    {
      label: 'Запасной план',
      value: context.today.route.recoveryQuest?.title ?? 'Не подготовлен',
    },
    {
      label: 'Прогресс',
      value: `Уровень ${context.progress.level}, ${context.progress.totalXp} XP`,
    },
    {
      label: 'Тело',
      value: `${context.body.today.weightKg} кг, ${context.body.today.steps} шагов, вода ${context.body.today.waterLiters} л`,
    },
    {
      label: 'Деньги',
      value: `Баланс ${context.money.snapshot.balance}, долг ${context.money.snapshot.debt}`,
    },
  ]
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
  const importedResponseText = usePromptCenterStore((state) => state.importedResponseText)
  const parsedResponse = usePromptCenterStore((state) => state.parsedResponse)
  const parseError = usePromptCenterStore((state) => state.parseError)
  const applyMessage = usePromptCenterStore((state) => state.applyMessage)
  const setSelectedCard = usePromptCenterStore((state) => state.setSelectedCard)
  const setUserRequest = usePromptCenterStore((state) => state.setUserRequest)
  const setResponseFormat = usePromptCenterStore((state) => state.setResponseFormat)
  const generatePrompt = usePromptCenterStore((state) => state.generatePrompt)
  const copyPrompt = usePromptCenterStore((state) => state.copyPrompt)
  const openChatGPT = usePromptCenterStore((state) => state.openChatGPT)
  const setImportedResponseText = usePromptCenterStore((state) => state.setImportedResponseText)
  const parseImportedResponse = usePromptCenterStore((state) => state.parseImportedResponse)
  const clearImportedResponse = usePromptCenterStore((state) => state.clearImportedResponse)
  const applyParsedResponse = usePromptCenterStore((state) => state.applyParsedResponse)
  const closePromptCenter = usePromptCenterStore((state) => state.closePromptCenter)

  const selectedCard = cards.find((card) => card.id === selectedCardId) ?? cards[0] ?? null
  const contextPreviewRows = isOpen ? getContextPreviewRows() : []

  useEffect(() => {
    if (!isOpen || generatedPrompt || !selectedCard) {
      return
    }

    generatePrompt()
  }, [generatePrompt, generatedPrompt, isOpen, selectedCard])

  const handleCopy = async () => {
    if (!generatedPrompt) {
      generatePrompt()
    }

    await copyPrompt()
  }

  const handleOpenChatGPT = async () => {
    if (!generatedPrompt) {
      generatePrompt()
    }

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
            <GlassCard tone="strong" className="max-h-[90vh] overflow-auto rounded-[2rem] p-4">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.24em] text-primary/80">
                    Центр промптов
                  </p>
                  <h2 className="mt-2 font-display text-lg font-bold leading-6 text-white">
                    Внешний ChatGPT без API
                  </h2>
                  <p className="mt-2 text-sm leading-5 text-muted">
                    LifeQuest собирает контекст, ты копируешь prompt, а ответ можно вернуть обратно
                    через JSON-блок.
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
                      className="glass-card min-w-[13rem] rounded-3xl border p-3.5 text-left transition"
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
                      <p className="font-display text-sm font-semibold leading-5 text-white">
                        {card.title}
                      </p>
                      <p className="mt-2 text-xs leading-5 text-muted">{card.description}</p>
                    </button>
                  )
                })}
              </div>

              <GlassCard className="mb-4 border border-white/10 bg-black/20 p-3.5">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted">
                  Контекст, который уйдёт в промпт
                </p>
                <div className="mt-3 grid gap-2">
                  {contextPreviewRows.map((row) => (
                    <PreviewRow key={row.label} label={row.label} value={row.value} />
                  ))}
                </div>
              </GlassCard>

              <div className="space-y-3">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-white">
                    Что сейчас происходит?
                  </span>
                  <textarea
                    value={userRequest}
                    onChange={(event) => setUserRequest(event.target.value)}
                    className="min-h-24 w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-muted focus:border-primary/50 focus:bg-white/10"
                    placeholder="Опиши ситуацию своими словами: где застрял, что давит, что важно удержать."
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
                onClick={generatePrompt}
              >
                Создать промпт
              </PrimaryButton>

              <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-black/20 p-3.5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted">
                    Предпросмотр промпта
                  </p>
                  {hasCopied ? <span className="text-xs text-success">Скопировано</span> : null}
                </div>
                <pre className="thin-scrollbar max-h-60 overflow-auto whitespace-pre-wrap font-sans text-sm leading-6 text-slate-100">
                  {generatedPrompt || 'Создай промпт, чтобы увидеть его здесь.'}
                </pre>
              </div>

              {showCopyFallback ? (
                <div className="mt-4 rounded-[1.5rem] border border-warning/20 bg-warning/10 p-3.5">
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

              <div className="mt-5 rounded-[1.5rem] border border-cyan/20 bg-cyan/10 p-3.5">
                <div className="mb-3 flex items-center gap-2 text-cyan">
                  <FileJson className="h-4 w-4" />
                  <p className="text-xs font-semibold uppercase tracking-[0.18em]">Ответ ChatGPT</p>
                </div>
                <textarea
                  value={importedResponseText}
                  onChange={(event) => setImportedResponseText(event.target.value)}
                  className="min-h-32 w-full rounded-3xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none transition placeholder:text-muted focus:border-cyan/50 focus:bg-black/30"
                  placeholder="Вставь сюда ответ ChatGPT, если хочешь применить рекомендации в LifeQuest."
                />

                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <PrimaryButton tone="secondary" icon={<FileJson className="h-4 w-4" />} onClick={parseImportedResponse}>
                    Разобрать ответ
                  </PrimaryButton>
                  <PrimaryButton tone="secondary" icon={<Trash2 className="h-4 w-4" />} onClick={clearImportedResponse}>
                    Очистить
                  </PrimaryButton>
                  <PrimaryButton
                    tone="primary"
                    icon={<CheckCircle2 className="h-4 w-4" />}
                    onClick={applyParsedResponse}
                    disabled={!parsedResponse}
                  >
                    Применить рекомендации
                  </PrimaryButton>
                </div>

                {parseError ? (
                  <div className="mt-3 flex gap-2 rounded-2xl border border-warning/20 bg-warning/10 p-3 text-sm leading-5 text-white">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                    <p>
                      Не удалось найти структурированный JSON-блок. Можно использовать текст как
                      обычную рекомендацию.
                    </p>
                  </div>
                ) : null}

                {parsedResponse ? <ParsedResponsePreview response={parsedResponse} /> : null}

                {applyMessage ? (
                  <p className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm leading-5 text-white">
                    {applyMessage}
                  </p>
                ) : null}
              </div>
            </GlassCard>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
