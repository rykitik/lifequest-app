import { useEffect, useState } from 'react'
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
import { buildFullLifeQuestContext, buildWeeklyReviewContext } from '@/services/contextBuilder'
import { GlassCard } from '@/shared/components/GlassCard'
import { PrimaryButton } from '@/shared/components/PrimaryButton'
import { usePromptCenterStore } from '@/stores/usePromptCenterStore'
import { useWeeklyReviewStore } from '@/stores/useWeeklyReviewStore'
import type { LifeQuestPromptResponse, LifeQuestSuggestedAction, WeeklyReviewSummary } from '@/shared/types'

const actionDomainLabels: Record<string, string> = {
  today: 'Сегодня',
  plan: 'План',
  body: 'Тело',
  money: 'Деньги',
  rescue: 'Возврат',
  core: 'Ядро',
}

const actionDifficultyLabels: Record<string, string> = {
  easy: 'Лёгко',
  medium: 'Средне',
  hard: 'Сложно',
}

const dataQualityLabels: Record<string, string> = {
  low: 'мало данных',
  medium: 'средне',
  good: 'достаточно',
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <p className="text-[10px] uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-1 break-words text-sm leading-5 text-white">{value || 'Нет данных'}</p>
    </div>
  )
}

function formatReviewDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function ActionMeta({ action }: { action: LifeQuestSuggestedAction }) {
  return (
    <span className="text-xs text-muted">
      {actionDomainLabels[action.domain] ?? action.domain} ·{' '}
      {actionDifficultyLabels[action.difficulty] ?? action.difficulty} · +{action.xp} XP
    </span>
  )
}

function WeeklyReviewSummaryPanel({
  summaries,
  message,
  onDelete,
}: {
  summaries: WeeklyReviewSummary[]
  message: string | null
  onDelete: (id: string) => void
}) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const visibleSummaries = showAll ? summaries : summaries.slice(0, 3)

  return (
    <div className="mb-4 rounded-[1.5rem] border border-cyan/15 bg-cyan/10 p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-cyan">История недель</p>
          <p className="mt-1 text-sm leading-5 text-muted">
            Подтверждённые недельные итоги хранятся только локально и не содержат выписки или полный список операций.
          </p>
        </div>
      </div>

      {visibleSummaries.length ? (
        <div className="mt-3 space-y-2">
          {visibleSummaries.map((summary) => (
            <div key={summary.id} className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-muted">
                    {formatReviewDate(summary.weekStart ?? summary.periodStart)} —{' '}
                    {formatReviewDate(summary.weekEnd ?? summary.periodEnd)}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Сохранено: {formatReviewDate(summary.createdAt)}
                    {summary.dataQuality ? ` · Данные: ${dataQualityLabels[summary.dataQuality]}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  className="shrink-0 rounded-xl border border-white/10 bg-white/5 p-2 text-muted transition hover:text-white"
                  aria-label="Удалить недельный итог"
                  onClick={() => setPendingDeleteId(summary.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 grid gap-2">
                <PreviewRow label="Главный вывод" value={summary.summary} />
                <PreviewRow label="Фокус по телу" value={summary.bodyFocus} />
                <PreviewRow label="Фокус по деньгам" value={summary.moneyFocus} />
                <PreviewRow label="Риск" value={summary.risk} />
              </div>

              <p className="mt-3 text-xs text-muted">
                Применено действий: {summary.appliedActionsCount} из {summary.suggestedActionsCount}
              </p>

              {pendingDeleteId === summary.id ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <PrimaryButton
                    tone="warning"
                    fullWidth
                    className="px-2 text-xs"
                    onClick={() => {
                      onDelete(summary.id)
                      setPendingDeleteId(null)
                    }}
                  >
                    Удалить итог
                  </PrimaryButton>
                  <PrimaryButton
                    tone="secondary"
                    fullWidth
                    className="px-2 text-xs"
                    onClick={() => setPendingDeleteId(null)}
                  >
                    Оставить
                  </PrimaryButton>
                </div>
              ) : null}
            </div>
          ))}

          {summaries.length > 3 ? (
            <PrimaryButton
              tone="secondary"
              fullWidth
              className="!min-h-10 px-3 py-2 text-xs"
              onClick={() => setShowAll((value) => !value)}
            >
              {showAll ? 'Свернуть историю' : 'Показать ещё'}
            </PrimaryButton>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm leading-5 text-muted">
          Здесь появятся сохранённые недельные итоги.
        </p>
      )}

      {message ? (
        <p className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm leading-5 text-white">
          {message}
        </p>
      ) : null}
    </div>
  )
}

interface ParsedResponsePreviewProps {
  response: LifeQuestPromptResponse
  selectedSuggestedActionIndexes: number[]
  shouldApplyCoreMessage: boolean
  toggleSuggestedAction: (index: number) => void
  toggleApplyCoreMessage: () => void
  selectAllSuggestedActions: () => void
  clearSuggestedActionSelection: () => void
}

function ParsedResponsePreview({
  response,
  selectedSuggestedActionIndexes,
  shouldApplyCoreMessage,
  toggleSuggestedAction,
  toggleApplyCoreMessage,
  selectAllSuggestedActions,
  clearSuggestedActionSelection,
}: ParsedResponsePreviewProps) {
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

      {response.coreMessage ? (
        <label className="mt-3 flex cursor-pointer gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
          <input
            type="checkbox"
            checked={shouldApplyCoreMessage}
            onChange={toggleApplyCoreMessage}
            className="mt-1 h-4 w-4 shrink-0 accent-cyan"
          />
          <span className="min-w-0">
            <span className="block text-sm font-medium text-white">Обновить сообщение Ядра</span>
            <span className="mt-1 block text-xs leading-5 text-muted">{response.coreMessage}</span>
          </span>
        </label>
      ) : null}

      <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted">
            Действия для применения
          </p>
          {response.suggestedActions.length ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAllSuggestedActions}
                className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white transition hover:bg-white/10"
              >
                Выбрать все
              </button>
              <button
                type="button"
                onClick={clearSuggestedActionSelection}
                className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-muted transition hover:bg-white/10 hover:text-white"
              >
                Снять все
              </button>
            </div>
          ) : null}
        </div>
        {response.suggestedActions.length ? (
          <div className="mt-2 space-y-2">
            {response.suggestedActions.map((action, index) => (
              <label
                key={`${action.domain}-${action.title}`}
                className="flex cursor-pointer gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 transition hover:bg-white/[0.07]"
              >
                <input
                  type="checkbox"
                  checked={selectedSuggestedActionIndexes.includes(index)}
                  onChange={() => toggleSuggestedAction(index)}
                  className="mt-1 h-4 w-4 shrink-0 accent-cyan"
                />
                <span className="min-w-0">
                  <span className="block break-words text-sm font-medium text-white">
                    {action.title}
                  </span>
                  <ActionMeta action={action} />
                </span>
              </label>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">Нет дополнительных действий.</p>
        )}
      </div>
    </div>
  )
}

function getContextPreviewRows(selectedCardId: string | null) {
  if (selectedCardId === 'weekly-review') {
    const context = buildWeeklyReviewContext()

    return [
      {
        label: 'Неделя',
        value: `${context.period.daysCount} дней, данные: ${dataQualityLabels[context.dataQuality.overall]}`,
      },
      {
        label: 'Тело',
        value: `вес ${context.bodySummary.weightStart ?? 'нет'} → ${context.bodySummary.weightEnd ?? 'нет'}, вода ${context.bodySummary.averageWaterLiters ?? 0} л, шаги ${context.bodySummary.averageSteps ?? 0}`,
      },
      {
        label: 'Деньги',
        value: `неделя: доход ${context.moneySummary.weekIncome}, расход ${context.moneySummary.weekExpense}, свободно ${context.moneySummary.safeToSpend ?? 0}`,
      },
      {
        label: 'Фокус',
        value: context.today.route.mainQuest?.title ?? 'Главный квест не выбран',
      },
      {
        label: 'Восстановление',
        value: context.today.route.recoveryQuest?.title ?? 'Запасной план не выбран',
      },
    ]
  }

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
      value: `Баланс ${context.money.totalBalance}, долг ${context.money.debtsTotal}`,
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
  const pendingWeeklyReviewSummary = usePromptCenterStore(
    (state) => state.pendingWeeklyReviewSummary,
  )
  const weeklyReviewSaveMessage = usePromptCenterStore((state) => state.weeklyReviewSaveMessage)
  const selectedSuggestedActionIndexes = usePromptCenterStore(
    (state) => state.selectedSuggestedActionIndexes,
  )
  const shouldApplyCoreMessage = usePromptCenterStore((state) => state.shouldApplyCoreMessage)
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
  const toggleSuggestedAction = usePromptCenterStore((state) => state.toggleSuggestedAction)
  const toggleApplyCoreMessage = usePromptCenterStore((state) => state.toggleApplyCoreMessage)
  const selectAllSuggestedActions = usePromptCenterStore((state) => state.selectAllSuggestedActions)
  const clearSuggestedActionSelection = usePromptCenterStore(
    (state) => state.clearSuggestedActionSelection,
  )
  const savePendingWeeklyReviewSummary = usePromptCenterStore(
    (state) => state.savePendingWeeklyReviewSummary,
  )
  const dismissPendingWeeklyReviewSummary = usePromptCenterStore(
    (state) => state.dismissPendingWeeklyReviewSummary,
  )
  const closePromptCenter = usePromptCenterStore((state) => state.closePromptCenter)
  const weeklyReviewSummaries = useWeeklyReviewStore((state) => state.summaries)
  const weeklyReviewStoreMessage = useWeeklyReviewStore((state) => state.lastMessage)
  const deleteWeeklyReviewSummary = useWeeklyReviewStore(
    (state) => state.deleteWeeklyReviewSummary,
  )

  const selectedCard = cards.find((card) => card.id === selectedCardId) ?? cards[0] ?? null
  const contextPreviewRows = isOpen ? getContextPreviewRows(selectedCardId) : []

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
            <GlassCard
              tone="strong"
              className="max-h-[90vh] overflow-auto rounded-[2rem] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
            >
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

              <WeeklyReviewSummaryPanel
                summaries={weeklyReviewSummaries}
                message={weeklyReviewStoreMessage}
                onDelete={deleteWeeklyReviewSummary}
              />

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
                <pre className="thin-scrollbar max-h-44 overflow-auto whitespace-pre-wrap font-sans text-sm leading-6 text-slate-100 sm:max-h-60">
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
                  className="whitespace-nowrap px-2 text-xs sm:px-4 sm:text-sm"
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
                  className="whitespace-nowrap px-2 text-xs sm:px-4 sm:text-sm"
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

                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <PrimaryButton
                    tone="secondary"
                    fullWidth
                    className="whitespace-nowrap px-2 text-xs sm:px-4 sm:text-sm"
                    icon={<FileJson className="h-4 w-4" />}
                    onClick={parseImportedResponse}
                  >
                    Разобрать ответ
                  </PrimaryButton>
                  <PrimaryButton
                    tone="secondary"
                    fullWidth
                    className="whitespace-nowrap px-2 text-xs sm:px-4 sm:text-sm"
                    icon={<Trash2 className="h-4 w-4" />}
                    onClick={clearImportedResponse}
                  >
                    Очистить
                  </PrimaryButton>
                  <PrimaryButton
                    tone="primary"
                    fullWidth
                    className="col-span-2 sm:col-span-1"
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

                {parsedResponse ? (
                  <ParsedResponsePreview
                    response={parsedResponse}
                    selectedSuggestedActionIndexes={selectedSuggestedActionIndexes}
                    shouldApplyCoreMessage={shouldApplyCoreMessage}
                    toggleSuggestedAction={toggleSuggestedAction}
                    toggleApplyCoreMessage={toggleApplyCoreMessage}
                    selectAllSuggestedActions={selectAllSuggestedActions}
                    clearSuggestedActionSelection={clearSuggestedActionSelection}
                  />
                ) : null}

                {applyMessage ? (
                  <p className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm leading-5 text-white">
                    {applyMessage}
                  </p>
                ) : null}

                {pendingWeeklyReviewSummary ? (
                  <div className="mt-3 rounded-[1.5rem] border border-primary/25 bg-primary/10 p-3.5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                      Сохранить этот недельный итог?
                    </p>
                    <div className="mt-3 grid gap-2">
                      <PreviewRow label="Главный вывод" value={pendingWeeklyReviewSummary.summary} />
                      <PreviewRow label="Фокус по телу" value={pendingWeeklyReviewSummary.bodyFocus} />
                      <PreviewRow label="Фокус по деньгам" value={pendingWeeklyReviewSummary.moneyFocus} />
                      <PreviewRow label="Риск" value={pendingWeeklyReviewSummary.risk} />
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-muted">
                          Выбранные действия
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          Применено: {pendingWeeklyReviewSummary.appliedActionsCount} из{' '}
                          {pendingWeeklyReviewSummary.suggestedActionsCount}
                        </p>
                        {pendingWeeklyReviewSummary.suggestedActions.length ? (
                          <div className="mt-2 space-y-2">
                            {pendingWeeklyReviewSummary.suggestedActions.map((action) => (
                              <div key={`${action.domain}-${action.title}`} className="min-w-0">
                                <p className="break-words text-sm leading-5 text-white">
                                  {action.title}
                                </p>
                                <ActionMeta action={action} />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-2 text-sm text-muted">Действия не выбраны.</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <PrimaryButton
                        tone="primary"
                        fullWidth
                        className="px-3 text-xs sm:text-sm"
                        onClick={savePendingWeeklyReviewSummary}
                      >
                        Сохранить недельный итог
                      </PrimaryButton>
                      <PrimaryButton
                        tone="secondary"
                        fullWidth
                        className="px-2 text-xs sm:text-sm"
                        onClick={dismissPendingWeeklyReviewSummary}
                      >
                        Не сохранять
                      </PrimaryButton>
                    </div>
                  </div>
                ) : null}

                {weeklyReviewSaveMessage ? (
                  <p className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm leading-5 text-white">
                    {weeklyReviewSaveMessage}
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
