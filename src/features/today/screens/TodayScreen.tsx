import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { Download, HeartPulse, LifeBuoy, MessageSquareText, Play, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { CompanionCoreWidget } from '@/features/companion/components/CompanionCoreWidget'
import { getCreditDebt, getMonthlyPlanProjection, getTotalBalance } from '@/features/money/lib/money'
import { DailyQuestCard } from '@/features/today/components/DailyQuestCard'
import { ModeSelector } from '@/features/today/components/ModeSelector'
import { QuestFocusCard } from '@/features/today/components/QuestFocusCard'
import { SectorStrip } from '@/features/today/components/SectorStrip'
import { routeLabels } from '@/services/questMeta'
import { buildDailyQuest, completeDailyQuestReward } from '@/services/dailyQuest'
import { applyLifeQuestReward, rewardFeedbackMessages } from '@/services/gameplay'
import { unlockLifeQuestMilestone } from '@/services/milestones'
import {
  backupFeedbackMessages,
  exportLifeQuestBackup,
  getBackupReminderStatus,
  getLifeQuestLocalDataSummary,
} from '@/services/lifequestBackup'
import { buildTodayNextStepRecommendation } from '@/services/todayNextStep'
import { GlassCard } from '@/shared/components/GlassCard'
import { PrimaryButton } from '@/shared/components/PrimaryButton'
import { ScreenHeader } from '@/shared/components/ScreenHeader'
import { useAuthStore } from '@/stores/useAuthStore'
import { useBodyStore } from '@/stores/useBodyStore'
import { useCompanionStore } from '@/stores/useCompanionStore'
import { useMoneyStore } from '@/stores/useMoneyStore'
import { useProgressStore } from '@/stores/useProgressStore'
import { usePromptCenterStore } from '@/stores/usePromptCenterStore'
import { useQuestStore } from '@/stores/useQuestStore'
import { useRescueStore } from '@/stores/useRescueStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useTodayStore } from '@/stores/useTodayStore'
import { useWeeklyReviewStore } from '@/stores/useWeeklyReviewStore'
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
  const [isExportingBackup, setIsExportingBackup] = useState(false)
  const user = useAuthStore((state) => state.user)
  const userName = useSettingsStore((state) => state.userName)
  const profileHeightCm = useSettingsStore((state) => state.heightCm)
  const profileBodyGoal = useSettingsStore((state) => state.bodyGoal)
  const profileTargetWeightKg = useSettingsStore((state) => state.targetWeightKg)
  const profileTargetPace = useSettingsStore((state) => state.targetPace)
  const profileActivityLevel = useSettingsStore((state) => state.activityLevel)
  const profileBodyLimitations = useSettingsStore((state) => state.bodyLimitations)
  const onboardingState = useSettingsStore((state) => state.onboarding)
  const lastBackupAt = useSettingsStore((state) => state.lastBackupAt)
  const lastBackupExportAt = useSettingsStore((state) => state.lastBackupExportAt)
  const lastBackupReason = useSettingsStore((state) => state.lastBackupReason)
  const backupReminderSnoozedUntil = useSettingsStore((state) => state.backupReminderSnoozedUntil)
  const recordBackupExport = useSettingsStore((state) => state.recordBackupExport)
  const snoozeBackupReminder = useSettingsStore((state) => state.snoozeBackupReminder)
  const currentMode = useTodayStore((state) => state.currentMode)
  const modes = useTodayStore((state) => state.modes)
  const route = useTodayStore((state) => state.route)
  const dailyQuestCompletion = useTodayStore((state) => state.dailyQuestCompletion)
  const setMode = useTodayStore((state) => state.setMode)
  const setRouteQuest = useTodayStore((state) => state.setRouteQuest)
  const completeRouteItem = useTodayStore((state) => state.completeRouteItem)
  const ensureDailyQuestCurrent = useTodayStore((state) => state.ensureDailyQuestCurrent)
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
  const todayBodySnapshot = useBodyStore((state) => state.today)
  const saveBodyCheckin = useBodyStore((state) => state.saveCheckin)
  const moneyAccounts = useMoneyStore((state) => state.accounts)
  const moneyTransactions = useMoneyStore((state) => state.transactions)
  const plannedPayments = useMoneyStore((state) => state.plannedPayments)
  const monthlyPlans = useMoneyStore((state) => state.monthlyPlans)
  const debts = useMoneyStore((state) => state.debts)
  const trackingStartDate = useMoneyStore((state) => state.trackingStartDate)
  const importWarnings = useMoneyStore((state) => state.importWarnings)
  const lastImportAt = useMoneyStore((state) => state.lastImportAt)
  const markBalanceChecked = useMoneyStore((state) => state.markBalanceChecked)
  const weeklySummaries = useWeeklyReviewStore((state) => state.summaries)

  const allQuests = useMemo(() => [...active, ...inbox, ...parked], [active, inbox, parked])
  const stability = sectors.find((sector) => sector.key === 'stability')?.percent ?? 72
  const routeIsIncomplete = !route.mainQuest || !route.quickWin || !route.recoveryQuest
  const nextStepRecommendation = useMemo(() => {
    const projection = getMonthlyPlanProjection({
      accounts: moneyAccounts,
      transactions: moneyTransactions,
      plannedPayments,
      debts,
      monthlyPlans,
    })

    return buildTodayNextStepRecommendation({
      profile: {
        heightCm: profileHeightCm,
        bodyGoal: profileBodyGoal,
        targetWeightKg: profileTargetWeightKg,
        targetPace: profileTargetPace,
        activityLevel: profileActivityLevel,
        bodyLimitations: profileBodyLimitations,
        onboarding: {
          completed: onboardingState.completed,
          skipped: onboardingState.skipped,
        },
      },
      body: {
        today: todayBodySnapshot,
      },
      money: {
        trackingStartDate,
        totalBalance: getTotalBalance(moneyAccounts, moneyTransactions),
        safeToSpend: projection.safeToSpend,
        creditDebt: getCreditDebt(moneyAccounts),
        lastImportAt,
        importWarnings: importWarnings.slice(0, 3),
      },
      weekly: {
        latest: weeklySummaries[0],
      },
      today: {
        currentMode,
        mainQuest: route.mainQuest,
        quickWin: route.quickWin,
        recoveryQuest: route.recoveryQuest,
      },
      progress: {
        level,
      },
    })
  }, [
    currentMode,
    debts,
    importWarnings,
    lastImportAt,
    level,
    moneyAccounts,
    moneyTransactions,
    monthlyPlans,
    onboardingState,
    plannedPayments,
    profileActivityLevel,
    profileBodyGoal,
    profileBodyLimitations,
    profileHeightCm,
    profileTargetPace,
    profileTargetWeightKg,
    route.mainQuest,
    route.quickWin,
    route.recoveryQuest,
    todayBodySnapshot,
    trackingStartDate,
    weeklySummaries,
  ])
  const strongestSector = useMemo(() => {
    const entries = Object.entries(dailySummary.sectorXp) as Array<[SectorKey, number]>
    const [sectorKey, value] = [...entries].sort((left, right) => right[1] - left[1])[0] ?? []

    if (!sectorKey || !value) {
      return 'Пока без акцента'
    }

    return sectors.find((sector) => sector.key === sectorKey)?.label ?? 'Пока без акцента'
  }, [dailySummary.sectorXp, sectors])
  const dailyQuest = useMemo(
    () => buildDailyQuest(nextStepRecommendation, dailyQuestCompletion),
    [dailyQuestCompletion, nextStepRecommendation],
  )
  const levelProgressPercent = Math.round((currentLevelXp / nextLevelXp) * 100)
  const todaySectorHighlights = useMemo(() => {
    const sectorXpEntries = (Object.entries(dailySummary.sectorXp) as Array<[SectorKey, number]>)
      .filter(([, value]) => value > 0)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 3)

    if (!sectorXpEntries.length) {
      return sectors.slice(0, 3).map((sector) => `${sector.label} +0`)
    }

    return sectorXpEntries.map(([sectorKey, value]) => {
      const sector = sectors.find((item) => item.key === sectorKey)

      return `${sector?.label ?? 'Сектор'} +${value}`
    })
  }, [dailySummary.sectorXp, sectors])
  const localDataSummary = getLifeQuestLocalDataSummary()
  const backupReminderStatus = getBackupReminderStatus({
    lastBackupAt,
    lastBackupExportAt,
    lastBackupReason,
    backupReminderSnoozedUntil,
    localDataKeysCount: localDataSummary.keysCount,
    hasValuableLocalData: localDataSummary.hasValuableLocalData,
  })

  useEffect(() => {
    ensureDailySummaryCurrent()
  }, [ensureDailySummaryCurrent])

  useEffect(() => {
    ensureDailyQuestCurrent()
  }, [ensureDailyQuestCurrent])

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
      routeKey === 'quickWin' ? rewardFeedbackMessages.quickWinDone : 'Квест закрыт · прогресс зафиксирован',
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
      'Фокус запущен · система держит окно',
    )
  }

  const completeDailyQuest = () => {
    completeDailyQuestReward(dailyQuest)
  }

  const handleDailyQuestAction = () => {
    if (dailyQuest.actionType === 'body_checkin') {
      const nextWaterLiters = Number((Math.max(todayBodySnapshot.waterLiters, 0) + 0.5).toFixed(1))

      saveBodyCheckin({
        waterLiters: nextWaterLiters,
      })
      completeDailyQuest()

      return
    }

    if (dailyQuest.actionType === 'add_water') {
      const nextWaterLiters = Number((todayBodySnapshot.waterLiters + 0.5).toFixed(1))

      saveBodyCheckin({
        waterLiters: nextWaterLiters,
      })
      completeDailyQuest()

      return
    }

    if (dailyQuest.actionType === 'open_settings') {
      navigate('/settings')
      return
    }

    if (dailyQuest.actionType === 'open_body') {
      navigate('/body')
      return
    }

    if (dailyQuest.actionType === 'open_money') {
      markBalanceChecked()
      completeDailyQuest()
      navigate('/money')
      return
    }

    if (dailyQuest.actionType === 'open_prompt_center') {
      completeDailyQuest()
      openPromptCenter()
      return
    }

    if (dailyQuest.actionType === 'open_recovery') {
      completeDailyQuest()
      openRescue()
      return
    }

    if (dailyQuest.actionType === 'focus_step') {
      const questId = nextStepRecommendation.id.startsWith('focus-')
        ? nextStepRecommendation.id.replace(/^focus-/, '')
        : undefined
      const routeEntries = [
        ['mainQuest', route.mainQuest],
        ['quickWin', route.quickWin],
        ['recoveryQuest', route.recoveryQuest],
      ] as const
      const matchedRoute = routeEntries.find(([, quest]) => quest?.id === questId)

      if (matchedRoute?.[1]) {
        completeRouteItem(matchedRoute[0])
        completeQuest(matchedRoute[1].id)
      }

      completeDailyQuest()
    }
  }

  const handleBuildRoute = () => {
    generateRouteFromAvailableQuests(allQuests)
    setActiveMessage('Маршрут дня собран из текущих задач. Теперь держим только три опорные линии.')
    unlockLifeQuestMilestone('daily_route_locked')
  }

  const handleBackupReminderExport = () => {
    setIsExportingBackup(true)

    try {
      const result = exportLifeQuestBackup()

      applyLifeQuestReward(
        {
          xp: 2,
          recoveryXp: 1,
          consistencyXp: 1,
          sector: 'stability',
          sourceId: `backup:${result.backup.exportedAt}`,
        },
        backupFeedbackMessages.protected,
        rewardFeedbackMessages.backupCreated,
      )
      recordBackupExport(result.backup.exportedAt)
    } catch {
      setActiveMessage('Backup не создан. Можно повторить из Настроек, когда файл сохранения будет доступен.')
    } finally {
      setIsExportingBackup(false)
    }
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

      <GlassCard className="mt-3 border border-cyan/15 bg-cyan/5 !p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-cyan/80">
              Прогресс системы
            </p>
            <p className="mt-1 text-sm font-semibold text-white">
              Уровень {level} · {levelProgressPercent}%
            </p>
          </div>
          <div className="h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary via-cyan to-violet-300"
              style={{ width: `${Math.min(100, Math.max(0, levelProgressPercent))}%` }}
            />
          </div>
        </div>
        <p className="mt-2 truncate text-xs text-muted">{todaySectorHighlights.join(' · ')}</p>
      </GlassCard>

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

      <DailyQuestCard quest={dailyQuest} onAction={handleDailyQuestAction} />

      {backupReminderStatus.active ? (
        <GlassCard className="mt-3 border border-cyan/20 bg-cyan/5 !p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-cyan/80">
                {backupReminderStatus.title}
              </p>
              <p className="mt-1.5 text-sm font-medium text-white">Локальная база стала ценной</p>
              <p className="mt-1 text-xs leading-5 text-muted">{backupReminderStatus.message}</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <PrimaryButton
              fullWidth
              className="!min-h-10 !py-2"
              disabled={isExportingBackup}
              icon={<Download className="h-4 w-4" />}
              onClick={handleBackupReminderExport}
            >
              {isExportingBackup ? 'Готовим…' : 'Скачать'}
            </PrimaryButton>
            <PrimaryButton
              tone="secondary"
              fullWidth
              className="!min-h-10 !py-2"
              disabled={isExportingBackup}
              onClick={() => snoozeBackupReminder()}
            >
              Позже
            </PrimaryButton>
          </div>
        </GlassCard>
      ) : null}

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
