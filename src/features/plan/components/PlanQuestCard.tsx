import { useState, type KeyboardEvent } from 'react'
import { Check, CheckCircle2, Circle, Pencil, Sparkles, Trash2, X } from 'lucide-react'
import {
  getQuestClassificationLabel,
  getQuestDomainLabel,
  getQuestEffortLabel,
  getQuestImpactLabel,
  getQuestStatusLabel,
  routeLabels,
} from '@/services/questMeta'
import { GlassCard } from '@/shared/components/GlassCard'
import { LinearProgress } from '@/shared/components/LinearProgress'
import { PrimaryButton } from '@/shared/components/PrimaryButton'
import { cn } from '@/shared/lib/cn'
import type { QuestClassification, QuestItem, TodayRouteKey } from '@/shared/types'

interface PlanQuestCardProps {
  quest: QuestItem
  routeAssignments: TodayRouteKey[]
  onClassify: (classification: QuestClassification) => void
  onUnpack: () => void
  onToggleStep: (stepId: string) => void
  onComplete: () => void
  onAssignRoute: (slot: TodayRouteKey) => void
  onRename: (title: string) => void
  onDelete: () => void
}

const classificationOptions: Array<{ label: string; value: QuestClassification }> = [
  { label: 'Главная', value: 'focus' },
  { label: 'Быстрая', value: 'quick_win' },
  { label: 'Позже', value: 'later' },
  { label: 'Тело', value: 'body' },
  { label: 'Деньги', value: 'money' },
]

const routeButtons: Array<{ label: string; value: TodayRouteKey }> = [
  { label: 'Сделать главным квестом', value: 'mainQuest' },
  { label: 'Сделать быстрой победой', value: 'quickWin' },
  { label: 'Сделать запасным планом', value: 'recoveryQuest' },
]

export function PlanQuestCard({
  quest,
  routeAssignments,
  onAssignRoute,
  onClassify,
  onComplete,
  onDelete,
  onRename,
  onToggleStep,
  onUnpack,
}: PlanQuestCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [titleDraft, setTitleDraft] = useState(quest.title)
  const isComplete = quest.status === 'complete'

  const handleSaveTitle = () => {
    const trimmed = titleDraft.trim()

    if (!trimmed) {
      setTitleDraft(quest.title)
      setIsEditing(false)
      return
    }

    onRename(trimmed)
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setTitleDraft(quest.title)
    setIsEditing(false)
  }

  const handleTitleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleSaveTitle()
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      handleCancelEdit()
    }
  }

  const handleDelete = () => {
    if (
      !window.confirm(
        `Удалить задачу «${quest.title}»? Если она стоит в маршруте дня, слот автоматически освободится.`,
      )
    ) {
      return
    }

    onDelete()
  }

  return (
    <GlassCard className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">
            {getQuestStatusLabel(quest.status)}
          </p>

          {isEditing ? (
            <div className="mt-2 space-y-3">
              <input
                value={titleDraft}
                onChange={(event) => setTitleDraft(event.target.value)}
                onKeyDown={handleTitleKeyDown}
                autoFocus
                className="w-full rounded-2xl border border-primary/35 bg-white/10 px-4 py-3 text-base text-white outline-none transition focus:border-primary/50"
              />
              <div className="flex gap-2">
                <PrimaryButton tone="secondary" onClick={handleSaveTitle}>
                  Сохранить
                </PrimaryButton>
                <PrimaryButton tone="ghost" onClick={handleCancelEdit}>
                  Отмена
                </PrimaryButton>
              </div>
            </div>
          ) : (
            <>
              <h3 className="mt-2 font-display text-lg font-semibold text-white">{quest.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{quest.subtitle}</p>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white">
            {quest.minutes} мин
          </div>
          <button
            type="button"
            onClick={() => {
              setTitleDraft(quest.title)
              setIsEditing(true)
            }}
            className="rounded-full border border-white/10 bg-white/5 p-2 text-muted transition hover:text-white"
            aria-label="Редактировать задачу"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="rounded-full border border-danger/20 bg-danger/10 p-2 text-danger transition hover:bg-danger/15"
            aria-label="Удалить задачу"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-muted">
          Домен: {getQuestDomainLabel(quest)}
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-muted">
          Тип: {getQuestClassificationLabel(quest.classification)}
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-muted">
          Усилие: {getQuestEffortLabel(quest)}
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-muted">
          Влияние: {getQuestImpactLabel(quest)}
        </span>
        <span
          className={cn(
            'rounded-full border px-3 py-1',
            isComplete
              ? 'border-success/20 bg-success/10 text-success'
              : 'border-white/10 bg-white/5 text-muted',
          )}
        >
          Статус: {getQuestStatusLabel(quest.status)}
        </span>
        {routeAssignments.map((assignment) => (
          <span
            key={assignment}
            className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-primary"
          >
            В маршруте: {routeLabels[assignment]}
          </span>
        ))}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-muted">
          <span>Прогресс</span>
          <span>{quest.progress}%</span>
        </div>
        <LinearProgress value={quest.progress} />
      </div>

      <div className="flex flex-wrap gap-2">
        {classificationOptions.map((option) => {
          const active = quest.classification === option.value

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onClassify(option.value)}
              className={cn(
                'rounded-full border px-3 py-2 text-xs font-medium transition',
                active
                  ? 'border-primary/40 bg-primary/15 text-white'
                  : 'border-white/10 bg-white/5 text-slate-100 hover:border-primary/30 hover:bg-primary/10',
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>

      <div className="grid gap-2">
        {routeButtons.map((button) => {
          const active = routeAssignments.includes(button.value)

          return (
            <button
              key={button.value}
              type="button"
              disabled={isComplete}
              onClick={() => onAssignRoute(button.value)}
              className={cn(
                'rounded-2xl border px-4 py-3 text-left text-sm transition',
                isComplete
                  ? 'cursor-not-allowed border-white/10 bg-white/5 text-muted opacity-60'
                  : active
                    ? 'border-primary/35 bg-primary/10 text-white'
                    : 'border-white/10 bg-white/5 text-slate-100 hover:border-primary/35 hover:bg-primary/10',
              )}
            >
              <span className="block">{button.label}</span>
              {active ? <span className="mt-1 block text-xs text-primary">Уже назначено</span> : null}
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <PrimaryButton
          tone="secondary"
          icon={<Sparkles className="h-4 w-4" />}
          disabled={isComplete}
          onClick={onUnpack}
        >
          Развернуть на 3 шага
        </PrimaryButton>
        <PrimaryButton tone={isComplete ? 'ghost' : 'primary'} disabled={isComplete} onClick={onComplete}>
          {isComplete ? 'Уже выполнено' : 'Отметить выполненной'}
        </PrimaryButton>
      </div>

      {quest.steps?.length ? (
        <div className="space-y-2 rounded-3xl border border-white/10 bg-black/20 p-3">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Три ближайших шага</p>
          {quest.steps.map((step, index) => (
            <button
              key={step.id}
              type="button"
              disabled={isComplete}
              onClick={() => onToggleStep(step.id)}
              className={cn(
                'flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition',
                step.done
                  ? 'border-success/30 bg-success/10 text-white'
                  : 'border-white/10 bg-white/5 text-slate-100 hover:border-primary/30 hover:bg-white/8',
                isComplete ? 'cursor-default opacity-90' : '',
              )}
            >
              <span className="mt-0.5 text-primary">
                {step.done ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs uppercase tracking-[0.16em] text-muted">
                  Шаг {index + 1}
                </span>
                <span className="mt-1 block text-sm text-white">{step.label}</span>
                <span className="mt-1 block text-xs text-muted">{step.minutes} мин</span>
              </span>
              {step.done ? <Check className="mt-0.5 h-4 w-4 text-success" /> : null}
            </button>
          ))}
        </div>
      ) : null}

      {isEditing ? (
        <div className="flex items-center gap-2 rounded-2xl border border-warning/20 bg-warning/10 px-3 py-3 text-sm text-warning">
          <X className="h-4 w-4" />
          <span>Сохрани по Enter или отмени по Escape. Кнопки ниже тоже работают на мобильном.</span>
        </div>
      ) : null}
    </GlassCard>
  )
}
