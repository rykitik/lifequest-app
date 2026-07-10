import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { HeartPulse, LifeBuoy, MessageSquareText, Play, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { CompanionCoreWidget } from '@/features/companion/components/CompanionCoreWidget'
import { ModeSelector } from '@/features/today/components/ModeSelector'
import { QuestFocusCard } from '@/features/today/components/QuestFocusCard'
import { SectorStrip } from '@/features/today/components/SectorStrip'
import { routeLabels } from '@/services/questMeta'
import { applyLifeQuestReward } from '@/services/gameplay'
import { GlassCard } from '@/shared/components/GlassCard'
import { PrimaryButton } from '@/shared/components/PrimaryButton'
import { ScreenHeader } from '@/shared/components/ScreenHeader'
import { useAuthStore } from '@/stores/useAuthStore'
import { useCompanionStore } from '@/stores/useCompanionStore'
import { useProgressStore } from '@/stores/useProgressStore'
import { usePromptCenterStore } from '@/stores/usePromptCenterStore'
import { useQuestStore } from '@/stores/useQuestStore'
import { useRescueStore } from '@/stores/useRescueStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useTodayStore } from '@/stores/useTodayStore'
import type { QuestItem, SectorKey, TodayRouteKey } from '@/shared/types'

const RoutePickerSheet = lazy(async () => {
  const module = await import('@/features/today/components/RoutePickerSheet')

  return {
    default: module.RoutePickerSheet,
  }
})

function getRouteCompletionMessage(routeKey: TodayRouteKey, quest: QuestItem) {
  if (routeKey === 'mainQuest') {
    return `Главный квест закрыт: ${quest.title}. День стал заметно яснее.`
  }

  if (routeKey === 'quickWin') {
    return `Быстрая победа зафиксирована: ${quest.title}. Небольшой выигрыш уже вернул движение.`
  }

  return `Запасной план сработал: ${quest.title}. Возврат в систему уже считается прогрессом.`
}

function getRouteReplaceMessage(routeKey: TodayRouteKey, quest: QuestItem) {
  return `${routeLabels[routeKey]} обновлён: ${quest.title}. Держим маршрут коротким и реалистичным.`
}

export function TodayScreen() {
  const navigate = useNavigate()
  const [pickerSlot, setPickerSlot] = useState<TodayRouteKey | null>(null)
  const user = useAuthStore((state) => state.user)
  const userName = useSettingsStore((state) => state.userName)
  const currentMode = useTodayStore((state) => state.currentMode)
  const modes = useTodayStore((state) => state.modes)
  const route = useTodayStore((state) => state.route)
  const setMode = useTodayStore((state) => state.setMode)
  const setRouteQuest = useTodayStore((state) => state.setRouteQuest)
  const completeRouteItem = useTodayStore((state) => state.completeRouteItem)
  const generateRouteFromAvailableQuests = useTodayStore(
    (state) => state.generateRouteFromAvailableQuests,
  )
  const active = useQuestStore((state) => state.active)
  const inbox = useQuestStore((state) => state.inbox)
  const parked = useQuestStore((state) => state.parked)
  const completeQuest = useQuestStore((state) => state.completeQuest)
  const level = useProgressStore((state) => state.level)
  const currentLevelXp = useProgressStore((state) => state.currentLevelXp)
  const nextLevelXp = useProgressStore((state) => state.nextLevelXp)
  const sectors = useProgressStore((state) => state.sectors)
  const dailySummary = useProgressStore((state) => state.dailySummary)
  const ensureDailySummaryCurrent = useProgressStore((state) => state.ensureDailySummaryCurrent)
  const mood = useCompanionStore((state) => state.mood)
  const message = useCompanionStore((state) => state.activeMessage)
  const stabilityScore = useCompanionStore((state) => state.stabilityScore)
  const setActiveMessage = useCompanionStore((state) => state.setActiveMessage)
  const updateMoodFromContext = useCompanionStore((state) => state.updateMoodFromContext)
  const rescueCompleted = useRescueStore((state) => state.completed)
  const openRescue = useRescueStore((state) => state.openRescue)
  const openPromptCenter = usePromptCenterStore((state) => state.openPromptCenter)

  const allQuests = useMemo(() => [...active, ...inbox, ...parked], [active, inbox, parked])
  const stability = sectors.find((sector) => sector.key === 'stability')?.percent ?? 72
  const routeIsIncomplete = !route.mainQuest || !route.quickWin || !route.recoveryQuest
  const strongestSector = useMemo(() => {
    const entries = Object.entries(dailySummary.sectorXp) as Array<[SectorKey, number]>
    const [sectorKey, value] = [...entries].sort((left, right) => right[1] - left[1])[0] ?? []

    if (!sectorKey || !value) {
      return 'Пока без акцента'
    }

    return sectors.find((sector) => sector.key === sectorKey)?.label ?? 'Пока без акцента'
  }, [dailySummary.sectorXp, sectors])

  useEffect(() => {
    ensureDailySummaryCurrent()
  }, [ensureDailySummaryCurrent])

  useEffect(() => {
    updateMoodFromContext({
      mode: currentMode,
      level,
      stability,
      isRecovering: rescueCompleted,
    })
  }, [currentMode, level, rescueCompleted, stability, updateMoodFromContext])

  const handleRouteComplete = (routeKey: TodayRouteKey, quest: QuestItem) => {
    if (quest.status === 'complete') {
      return
    }

    completeRouteItem(routeKey)
    completeQuest(quest.id)
    applyLifeQuestReward(
      {
        xp: quest.xp,
        recoveryXp: routeKey === 'recoveryQuest' ? quest.xp : 0,
        consistencyXp: routeKey === 'mainQuest' ? 4 : 1,
        sector: routeKey === 'recoveryQuest' ? 'stability' : quest.sector,
        completedTask: true,
        sourceId: `quest:${quest.id}:complete`,
      },
      getRouteCompletionMessage(routeKey, quest),
    )
  }

  const handleFocusBoost = () => {
    applyLifeQuestReward(
      {
        xp: 8,
        consistencyXp: 2,
        sector: 'focus',
      },
      'Окно фокуса на 2 минуты готово. Открой поверхность и сделай один спокойный шаг.',
    )
  }

  const handleBuildRoute = () => {
    generateRouteFromAvailableQuests(allQuests)
    setActiveMessage('Маршрут дня собран из текущих задач. Теперь держим только три опорные линии.')
  }

  const handleRouteReplace = (quest: QuestItem) => {
    if (!pickerSlot) {
      return
    }

    setRouteQuest(pickerSlot, quest)
    setActiveMessage(getRouteReplaceMessage(pickerSlot, quest))
    setPickerSlot(null)
  }

  return (
    <section className="pb-4 pt-0">
      <ScreenHeader
        title={`Привет, ${userName || user?.name || 'Капитан'}`}
        subtitle="Система готова. Выбери один ясный шаг."
      />

      <CompanionCoreWidget
        mood={mood}
        message={message}
        level={level}
        stabilityScore={stabilityScore}
        currentXp={currentLevelXp}
        nextLevelXp={nextLevelXp}
        variant="hero"
      />

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">
            Состояние системы
          </p>
          <span className="rounded-full border border-cyan/20 bg-cyan/10 px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em] text-cyan">
            Режим
          </span>
        </div>
        <ModeSelector options={modes} activeMode={currentMode} onSelect={setMode} />
      </div>

      <GlassCard className="mt-4 overflow-hidden border-white/10 bg-gradient-to-br from-white/[0.06] via-white/[0.025] to-transparent !p-3.5">
        <div className="pointer-events-none -mx-3.5 -mt-3.5 mb-3 h-px bg-gradient-to-r from-transparent via-cyan/45 to-transparent" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
              Сводка дня
            </p>
            <h3 className="mt-1.5 font-display text-base font-semibold leading-tight text-white">
              Сегодня без перегруза
            </h3>
            <p className="mt-1.5 text-[13px] leading-5 text-muted">
              Следим только за движением дня, а не за идеальной картиной.
            </p>
          </div>
          {routeIsIncomplete ? (
            <span className="shrink-0 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.08em] text-primary">
              Маршрут не собран
            </span>
          ) : null}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1.5 text-sm">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <p className="font-mono text-[8px] uppercase tracking-[0.08em] text-muted">XP сегодня</p>
            <p className="mt-1.5 font-display text-lg font-bold text-white">+{dailySummary.xpToday}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <p className="font-mono text-[8px] uppercase tracking-[0.08em] text-muted">Готово</p>
            <p className="mt-1.5 font-display text-lg font-bold text-white">{dailySummary.completedTasks}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <p className="font-mono text-[8px] uppercase tracking-[0.08em] text-muted">Рост</p>
            <p className="mt-1.5 text-[13px] font-medium leading-4 text-white">{strongestSector}</p>
          </div>
        </div>
      </GlassCard>

      {routeIsIncomplete ? (
        <GlassCard className="mt-3 border border-primary/20 bg-gradient-to-br from-primary/16 via-cyan/8 to-transparent !p-3.5">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-primary/80">
            Мягкий старт маршрута
          </p>
          <h3 className="mt-1.5 font-display text-base font-semibold leading-tight text-white">
            День ещё не собран полностью
          </h3>
          <p className="mt-1.5 overflow-hidden text-[13px] leading-5 text-muted [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
            Система может автоматически подобрать главный квест, быструю победу и запасной план из уже существующих задач.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <PrimaryButton
              fullWidth
              className="!min-h-11 !py-2"
              icon={<Sparkles className="h-4 w-4" />}
              onClick={handleBuildRoute}
            >
              Собрать маршрут
            </PrimaryButton>
            <PrimaryButton tone="secondary" fullWidth className="!min-h-11 !py-2" onClick={() => navigate('/plan')}>
              Открыть План
            </PrimaryButton>
          </div>
        </GlassCard>
      ) : null}

      <div className="mt-4 space-y-3">
        <QuestFocusCard
          label="Главный квест"
          quest={route.mainQuest}
          tone="primary"
          emptyTitle="Главный квест ещё не выбран"
          emptyDescription="Выбери в Плане одну задачу, которая действительно должна вести день."
          emptyButtonLabel="Открыть План"
          onEmptyAction={() => navigate('/plan')}
          onComplete={() =>
            route.mainQuest ? handleRouteComplete('mainQuest', route.mainQuest) : navigate('/plan')
          }
          onReplace={() => setPickerSlot('mainQuest')}
        />
        <QuestFocusCard
          label="Быстрая победа"
          quest={route.quickWin}
          tone="success"
          emptyTitle="Быстрая победа не назначена"
          emptyDescription="Поставь сюда короткое действие, которое можно закрыть без перегруза."
          emptyButtonLabel="Выбрать в Плане"
          onEmptyAction={() => navigate('/plan')}
          onComplete={() =>
            route.quickWin ? handleRouteComplete('quickWin', route.quickWin) : navigate('/plan')
          }
          onReplace={() => setPickerSlot('quickWin')}
        />
        <QuestFocusCard
          label="Запасной план"
          quest={route.recoveryQuest}
          tone="warning"
          emptyTitle="Запасной план пока пуст"
          emptyDescription="Добавь мягкий резервный шаг, чтобы не выпадать из системы на сложном дне."
          emptyButtonLabel="Настроить в Плане"
          onEmptyAction={() => navigate('/plan')}
          onComplete={() =>
            route.recoveryQuest
              ? handleRouteComplete('recoveryQuest', route.recoveryQuest)
              : navigate('/plan')
          }
          onReplace={() => setPickerSlot('recoveryQuest')}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <PrimaryButton
          tone="secondary"
          fullWidth
          className="!min-h-11 !py-2.5"
          icon={<Play className="h-4 w-4" />}
          onClick={handleFocusBoost}
        >
          Начать 2 минуты
        </PrimaryButton>
        <PrimaryButton
          tone="warning"
          fullWidth
          className="!min-h-11 !py-2.5"
          icon={<LifeBuoy className="h-4 w-4" />}
          onClick={openRescue}
        >
          Спасательный режим
        </PrimaryButton>
        <PrimaryButton
          tone="secondary"
          fullWidth
          className="!min-h-11 !py-2.5"
          icon={<HeartPulse className="h-4 w-4" />}
          onClick={() => navigate('/body')}
        >
          Записать показатели
        </PrimaryButton>
        <PrimaryButton
          tone="secondary"
          fullWidth
          className="!min-h-11 !py-2.5"
          icon={<MessageSquareText className="h-4 w-4" />}
          onClick={openPromptCenter}
        >
          Поговорить с Ядром
        </PrimaryButton>
      </div>

      <div className="mt-4">
        <SectorStrip sectors={sectors} />
      </div>

      <GlassCard className="mt-4 border border-primary/20 bg-gradient-to-br from-primary/14 via-indigo-500/8 to-transparent !p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-primary/80">Центр промптов</p>
            <h3 className="mt-1.5 font-display text-base font-semibold leading-tight text-white">
              Открыть ChatGPT с готовым контекстом
            </h3>
            <p className="mt-1.5 overflow-hidden text-[13px] leading-5 text-muted [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
              Система соберёт промпт из текущего режима, маршрута дня, задач и прогресса, чтобы не начинать с пустого листа.
            </p>
          </div>
        </div>
        <PrimaryButton fullWidth className="mt-3 !min-h-11 !py-2.5" onClick={openPromptCenter}>
          Собрать промпт
        </PrimaryButton>
      </GlassCard>

      {pickerSlot ? (
        <Suspense fallback={null}>
          <RoutePickerSheet
            isOpen={Boolean(pickerSlot)}
            slot={pickerSlot}
            quests={allQuests}
            route={route}
            currentMode={currentMode}
            onClose={() => setPickerSlot(null)}
            onSelect={handleRouteReplace}
            onOpenPlan={() => {
              setPickerSlot(null)
              navigate('/plan')
            }}
          />
        </Suspense>
      ) : null}
    </section>
  )
}
