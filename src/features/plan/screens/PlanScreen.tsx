import { useMemo, useState, type KeyboardEventHandler } from 'react'
import { Search } from 'lucide-react'
import { PlanQuestCard } from '@/features/plan/components/PlanQuestCard'
import { getRouteAssignments, isMainQuestCandidate, isQuickQuest, routeLabels } from '@/services/questMeta'
import { applyLifeQuestReward } from '@/services/gameplay'
import { GlassCard } from '@/shared/components/GlassCard'
import { PrimaryButton } from '@/shared/components/PrimaryButton'
import { ScreenHeader } from '@/shared/components/ScreenHeader'
import { useCompanionStore } from '@/stores/useCompanionStore'
import { useQuestStore } from '@/stores/useQuestStore'
import { useTodayStore } from '@/stores/useTodayStore'
import type { QuestItem, TodayRouteKey } from '@/shared/types'

type PlanFilterKey =
  | 'all'
  | 'main'
  | 'quick'
  | 'later'
  | 'body'
  | 'money'
  | 'completed'

const filterOptions: Array<{ key: PlanFilterKey; label: string }> = [
  { key: 'all', label: 'Все' },
  { key: 'main', label: 'Главные' },
  { key: 'quick', label: 'Быстрые' },
  { key: 'later', label: 'Позже' },
  { key: 'body', label: 'Тело' },
  { key: 'money', label: 'Деньги' },
  { key: 'completed', label: 'Выполненные' },
]

const routeSlotConfig: Array<{
  key: TodayRouteKey
  accentClassName: string
  emptyText: string
}> = [
  {
    key: 'mainQuest',
    accentClassName: 'border-primary/20 bg-primary/10',
    emptyText: 'Пока не выбран',
  },
  {
    key: 'quickWin',
    accentClassName: 'border-success/20 bg-success/10',
    emptyText: 'Пока не назначена',
  },
  {
    key: 'recoveryQuest',
    accentClassName: 'border-warning/20 bg-warning/10',
    emptyText: 'Пока не подготовлен',
  },
]

const listSections = [
  {
    key: 'active',
    title: 'Активно сейчас',
  },
  {
    key: 'inbox',
    title: 'Входящие',
  },
  {
    key: 'parked',
    title: 'Позже',
  },
] as const

function getQuestCompletionMessage(quest: QuestItem) {
  if (quest.sector === 'body') {
    return `Телесный контур укреплён: ${quest.title}. Этого шага достаточно на сейчас.`
  }

  if (quest.sector === 'money') {
    return `Денежная ясность выросла: ${quest.title}. Спокойный контроль снова в системе.`
  }

  return `Квест завершён: ${quest.title}. Держи только следующий чистый шаг, без лишнего шума.`
}

function getRouteAssignmentMessage(slot: TodayRouteKey, quest: QuestItem) {
  if (slot === 'mainQuest') {
    return `Главный квест обновлён: ${quest.title}. День получил один ясный центр тяжести.`
  }

  if (slot === 'quickWin') {
    return `Быстрая победа выбрана: ${quest.title}. Теперь у дня есть короткий гарантированный выигрыш.`
  }

  return `Запасной план обновлён: ${quest.title}. Возврат в систему теперь проще, если станет тяжело.`
}

function matchesFilter(quest: QuestItem, filter: PlanFilterKey) {
  if (filter === 'completed') {
    return quest.status === 'complete'
  }

  if (quest.status === 'complete') {
    return false
  }

  switch (filter) {
    case 'main':
      return quest.classification === 'focus' || isMainQuestCandidate(quest)
    case 'quick':
      return quest.classification === 'quick_win' || isQuickQuest(quest)
    case 'later':
      return quest.classification === 'later' || quest.status === 'parked'
    case 'body':
      return quest.classification === 'body' || quest.sector === 'body'
    case 'money':
      return quest.classification === 'money' || quest.sector === 'money'
    case 'all':
    default:
      return true
  }
}

function matchesSearch(quest: QuestItem, query: string) {
  if (!query.trim()) {
    return true
  }

  const normalizedQuery = query.trim().toLowerCase()
  const haystack = `${quest.title} ${quest.subtitle}`.toLowerCase()

  return haystack.includes(normalizedQuery)
}

export function PlanScreen() {
  const [draft, setDraft] = useState('')
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<PlanFilterKey>('all')
  const route = useTodayStore((state) => state.route)
  const setRouteQuest = useTodayStore((state) => state.setRouteQuest)
  const clearRouteItem = useTodayStore((state) => state.clearRouteItem)
  const inbox = useQuestStore((state) => state.inbox)
  const active = useQuestStore((state) => state.active)
  const parked = useQuestStore((state) => state.parked)
  const addQuest = useQuestStore((state) => state.addQuest)
  const updateQuestTitle = useQuestStore((state) => state.updateQuestTitle)
  const deleteQuest = useQuestStore((state) => state.deleteQuest)
  const classifyQuest = useQuestStore((state) => state.classifyQuest)
  const unpackQuest = useQuestStore((state) => state.unpackQuest)
  const toggleQuestStep = useQuestStore((state) => state.toggleQuestStep)
  const completeQuest = useQuestStore((state) => state.completeQuest)
  const setActiveMessage = useCompanionStore((state) => state.setActiveMessage)

  const handleAddQuest = () => {
    const trimmed = draft.trim()

    if (!trimmed) {
      return
    }

    addQuest(trimmed)
    setDraft('')
  }

  const handleAssignRoute = (slot: TodayRouteKey, quest: QuestItem) => {
    setRouteQuest(slot, quest)
    setActiveMessage(getRouteAssignmentMessage(slot, quest))
  }

  const handleCompleteQuest = (quest: QuestItem) => {
    if (quest.status === 'complete') {
      return
    }

    completeQuest(quest.id)
    applyLifeQuestReward(
      {
        xp: quest.xp,
        consistencyXp: quest.classification === 'focus' ? 3 : 1,
        sector: quest.sector,
        completedTask: true,
        sourceId: `quest:${quest.id}:complete`,
      },
      getQuestCompletionMessage(quest),
    )
  }

  const handleToggleStep = (quest: QuestItem, stepId: string) => {
    const updatedQuest = toggleQuestStep(quest.id, stepId)

    if (updatedQuest?.status === 'complete' && quest.status !== 'complete') {
      applyLifeQuestReward(
        {
          xp: updatedQuest.xp,
          consistencyXp: updatedQuest.classification === 'focus' ? 3 : 1,
          sector: updatedQuest.sector,
          completedTask: true,
          sourceId: `quest:${updatedQuest.id}:complete`,
        },
        getQuestCompletionMessage(updatedQuest),
      )
    }
  }

  const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (event.key !== 'Enter') {
      return
    }

    event.preventDefault()
    handleAddQuest()
  }

  const questLists = useMemo(() => {
    const filterAndSearch = (quests: QuestItem[]) =>
      quests.filter((quest) => matchesFilter(quest, activeFilter) && matchesSearch(quest, search))

    return {
      active: filterAndSearch(active),
      inbox: filterAndSearch(inbox),
      parked: filterAndSearch(parked),
    }
  }, [active, activeFilter, inbox, parked, search])

  const visibleCount = questLists.active.length + questLists.inbox.length + questLists.parked.length

  return (
    <section className="pb-6">
      <ScreenHeader
        title="План"
        subtitle="Собирай задачи быстро, назначай маршрут дня и разворачивай только ближайшие реальные шаги."
      />

      <GlassCard tone="strong" className="mb-5">
        <p className="text-xs uppercase tracking-[0.24em] text-primary/80">Быстрое добавление задачи</p>
        <div className="mt-3 space-y-3">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-muted focus:border-primary/50 focus:bg-white/10"
            placeholder="Сбрось сюда задачу без лишнего анализа"
          />
          <PrimaryButton fullWidth onClick={handleAddQuest}>
            Добавить
          </PrimaryButton>
        </div>
      </GlassCard>

      <GlassCard className="mb-5">
        <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/5 px-4 py-3">
          <Search className="h-4 w-4 text-muted" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-muted"
            placeholder="Поиск по задачам"
          />
        </div>

        <div className="thin-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
          {filterOptions.map((filter) => {
            const activeChip = activeFilter === filter.key

            return (
              <button
                key={filter.key}
                type="button"
                onClick={() => setActiveFilter(filter.key)}
                className={`rounded-full border px-4 py-2 text-xs font-medium transition ${
                  activeChip
                    ? 'border-primary/40 bg-primary/15 text-white'
                    : 'border-white/10 bg-white/5 text-slate-100 hover:border-primary/30 hover:bg-primary/10'
                }`}
              >
                {filter.label}
              </button>
            )
          })}
        </div>

        <p className="mt-4 text-sm text-muted">
          Найдено задач: <span className="text-white">{visibleCount}</span>
        </p>
      </GlassCard>

      <GlassCard className="mb-5">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs uppercase tracking-[0.24em] text-muted">Маршрут дня</p>
          <p className="text-xs text-muted">Назначай задачи прямо из карточек ниже</p>
        </div>
        <div className="mt-4 space-y-3 text-sm text-muted">
          {routeSlotConfig.map((slot) => (
            <div key={slot.key} className={`rounded-2xl border p-3 ${slot.accentClassName}`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/70">
                    {routeLabels[slot.key]}
                  </p>
                  <p className="mt-2 text-white">{route[slot.key]?.title ?? slot.emptyText}</p>
                  <p className="mt-1 text-sm text-muted">
                    {route[slot.key]?.subtitle ??
                      'Слот свободен. Выбери задачу, когда маршрут станет яснее.'}
                  </p>
                </div>
                {route[slot.key] ? (
                  <button
                    type="button"
                    onClick={() => clearRouteItem(slot.key)}
                    className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-100 transition hover:border-white/20 hover:bg-black/30"
                  >
                    Очистить
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      <div className="space-y-5">
        {visibleCount ? (
          listSections.map((section) => {
            const quests = questLists[section.key]

            if (!quests.length) {
              return null
            }

            return (
              <div key={section.key}>
                <p className="mb-3 text-xs uppercase tracking-[0.24em] text-muted">{section.title}</p>
                <div className="space-y-3">
                  {quests.map((quest) => (
                    <PlanQuestCard
                      key={quest.id}
                      quest={quest}
                      routeAssignments={getRouteAssignments(route, quest.id)}
                      onClassify={(classification) => classifyQuest(quest.id, classification)}
                      onUnpack={() => unpackQuest(quest.id)}
                      onToggleStep={(stepId) => handleToggleStep(quest, stepId)}
                      onComplete={() => handleCompleteQuest(quest)}
                      onAssignRoute={(slot) => handleAssignRoute(slot, quest)}
                      onRename={(title) => updateQuestTitle(quest.id, title)}
                      onDelete={() => deleteQuest(quest.id)}
                    />
                  ))}
                </div>
              </div>
            )
          })
        ) : (
          <GlassCard>
            <p className="text-sm leading-6 text-muted">
              Под выбранный фильтр и поиск пока ничего не попало. Смягчи запрос или добавь новую задачу.
            </p>
          </GlassCard>
        )}

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
