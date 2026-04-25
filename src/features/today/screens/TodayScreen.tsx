import { useEffect } from 'react'
import { HeartPulse, LifeBuoy, MessageSquareText, Play } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { CompanionCoreWidget } from '@/features/companion/components/CompanionCoreWidget'
import { ModeSelector } from '@/features/today/components/ModeSelector'
import { QuestFocusCard } from '@/features/today/components/QuestFocusCard'
import { SectorStrip } from '@/features/today/components/SectorStrip'
import { GlassCard } from '@/shared/components/GlassCard'
import { PrimaryButton } from '@/shared/components/PrimaryButton'
import { ScreenHeader } from '@/shared/components/ScreenHeader'
import { useAuthStore } from '@/stores/useAuthStore'
import { useCompanionStore } from '@/stores/useCompanionStore'
import { useProgressStore } from '@/stores/useProgressStore'
import { usePromptCenterStore } from '@/stores/usePromptCenterStore'
import { useQuestStore } from '@/stores/useQuestStore'
import { useRescueStore } from '@/stores/useRescueStore'
import { useTodayStore } from '@/stores/useTodayStore'
import type { QuestItem, TodayRouteKey } from '@/shared/types'

export function TodayScreen() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const currentMode = useTodayStore((state) => state.currentMode)
  const modes = useTodayStore((state) => state.modes)
  const route = useTodayStore((state) => state.route)
  const setMode = useTodayStore((state) => state.setMode)
  const completeRouteItem = useTodayStore((state) => state.completeRouteItem)
  const level = useProgressStore((state) => state.level)
  const currentLevelXp = useProgressStore((state) => state.currentLevelXp)
  const nextLevelXp = useProgressStore((state) => state.nextLevelXp)
  const sectors = useProgressStore((state) => state.sectors)
  const applyReward = useProgressStore((state) => state.applyReward)
  const mood = useCompanionStore((state) => state.mood)
  const message = useCompanionStore((state) => state.activeMessage)
  const stabilityScore = useCompanionStore((state) => state.stabilityScore)
  const updateMoodFromContext = useCompanionStore((state) => state.updateMoodFromContext)
  const setActiveMessage = useCompanionStore((state) => state.setActiveMessage)
  const rescueCompleted = useRescueStore((state) => state.completed)
  const openRescue = useRescueStore((state) => state.openRescue)
  const openPromptCenter = usePromptCenterStore((state) => state.openPromptCenter)
  const completeQuest = useQuestStore((state) => state.completeQuest)

  const stability = sectors.find((sector) => sector.key === 'stability')?.percent ?? 72

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
    applyReward({
      xp: quest.xp,
      recoveryXp: routeKey === 'recoveryQuest' ? quest.xp : 0,
      consistencyXp: routeKey === 'mainQuest' ? 4 : 1,
      sector: quest.sector,
    })
    setActiveMessage(`Зафиксировано: ${quest.title}. Сейчас нужен только один чистый следующий шаг.`)
  }

  const handleFocusBoost = () => {
    applyReward({
      xp: 8,
      consistencyXp: 2,
      sector: 'focus',
    })
    setActiveMessage('Окно фокуса на 2 минуты готово. Открой поверхность и сделай один спокойный шаг.')
  }

  return (
    <section className="pb-6">
      <ScreenHeader
        title={`Привет, ${user?.name ?? 'Капитан'}`}
        subtitle="Выбери самый лёгкий полезный маршрут. Прогресс важнее идеала."
      />

      <CompanionCoreWidget
        mood={mood}
        message={message}
        level={level}
        stabilityScore={stabilityScore}
        currentXp={currentLevelXp}
        nextLevelXp={nextLevelXp}
      />

      <div className="mt-6">
        <p className="mb-3 text-xs uppercase tracking-[0.24em] text-muted">Состояние системы</p>
        <ModeSelector options={modes} activeMode={currentMode} onSelect={setMode} />
      </div>

      <div className="mt-6 space-y-4">
        <QuestFocusCard
          label="Главный квест"
          quest={route.mainQuest}
          tone="primary"
          buttonLabel="Продолжить маршрут"
          onAction={() => handleRouteComplete('mainQuest', route.mainQuest)}
        />
        <QuestFocusCard
          label="Быстрая победа"
          quest={route.quickWin}
          tone="success"
          buttonLabel="Забрать победу"
          onAction={() => handleRouteComplete('quickWin', route.quickWin)}
        />
        <QuestFocusCard
          label="Запасной план"
          quest={route.recoveryQuest}
          tone="warning"
          buttonLabel="Держать под рукой"
          onAction={() => handleRouteComplete('recoveryQuest', route.recoveryQuest)}
        />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <PrimaryButton
          tone="secondary"
          fullWidth
          icon={<Play className="h-4 w-4" />}
          onClick={handleFocusBoost}
        >
          Начать 2 минуты
        </PrimaryButton>
        <PrimaryButton
          tone="warning"
          fullWidth
          icon={<LifeBuoy className="h-4 w-4" />}
          onClick={openRescue}
        >
          Спасательный режим
        </PrimaryButton>
        <PrimaryButton
          tone="secondary"
          fullWidth
          icon={<HeartPulse className="h-4 w-4" />}
          onClick={() => navigate('/body')}
        >
          Записать показатели
        </PrimaryButton>
        <PrimaryButton
          tone="secondary"
          fullWidth
          icon={<MessageSquareText className="h-4 w-4" />}
          onClick={openPromptCenter}
        >
          Поговорить с Ядром
        </PrimaryButton>
      </div>

      <div className="mt-6">
        <SectorStrip sectors={sectors} />
      </div>

      <GlassCard className="mt-6 border border-primary/20 bg-gradient-to-br from-primary/14 via-indigo-500/8 to-transparent">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-primary/80">Центр промптов</p>
            <h3 className="mt-2 font-display text-lg font-semibold text-white">
              Открыть ChatGPT с готовым контекстом
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              Система соберёт промпт из текущего режима, главного квеста, быстрой победы и
              запасного плана, чтобы не начинать с пустого листа.
            </p>
          </div>
        </div>
        <PrimaryButton fullWidth className="mt-4" onClick={openPromptCenter}>
          Собрать промпт
        </PrimaryButton>
      </GlassCard>
    </section>
  )
}
