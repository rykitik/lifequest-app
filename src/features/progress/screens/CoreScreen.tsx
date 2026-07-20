import { ArrowRight, Target } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CompanionCustomizationPanel } from '@/features/companion/components/CompanionCustomizationPanel'
import { CompanionCoreWidget } from '@/features/companion/components/CompanionCoreWidget'
import { CompanionEvolutionPreview } from '@/features/companion/components/CompanionEvolutionPreview'
import {
  buildLifeQuestSkillTree,
  type LifeQuestModuleSuggestion,
} from '@/features/profile/lib/skillTree'
import { buildSystemProfileViewModel } from '@/features/profile/lib/systemProfile'
import { buildWeeklyRecapViewModel } from '@/features/profile/lib/weeklyRecap'
import { MilestonesPanel } from '@/features/progress/components/MilestonesPanel'
import { SkillTreePanel } from '@/features/progress/components/SkillTreePanel'
import { WeeklyRecapPanel } from '@/features/progress/components/WeeklyRecapPanel'
import { buildDailyQuest } from '@/services/dailyQuest'
import { GlassCard } from '@/shared/components/GlassCard'
import { LinearProgress } from '@/shared/components/LinearProgress'
import { PrimaryButton } from '@/shared/components/PrimaryButton'
import { ScreenHeader } from '@/shared/components/ScreenHeader'
import { formatCompact, formatPercent } from '@/shared/lib/format'
import { buildTodayNextStepRecommendation } from '@/services/todayNextStep'
import { useBodyStore } from '@/stores/useBodyStore'
import { useCompanionStore } from '@/stores/useCompanionStore'
import { useMilestonesStore } from '@/stores/useMilestonesStore'
import { useMoneyStore } from '@/stores/useMoneyStore'
import { useProgressStore } from '@/stores/useProgressStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useTodayStore } from '@/stores/useTodayStore'
import { useWeeklyReviewStore } from '@/stores/useWeeklyReviewStore'

export function CoreScreen() {
  const navigate = useNavigate()
  const companionCustomizationRef = useRef<HTMLDivElement>(null)
  const [companionCustomizationOpen, setCompanionCustomizationOpen] = useState(false)
  const companionMood = useCompanionStore((state) => state.mood)
  const companionEvolutionLevel = useCompanionStore((state) => state.evolutionLevel)
  const companionActiveMessage = useCompanionStore((state) => state.activeMessage)
  const companionStabilityScore = useCompanionStore((state) => state.stabilityScore)
  const companionCustomization = useCompanionStore((state) => state.customization)
  const progressLevel = useProgressStore((state) => state.level)
  const progressTotalXp = useProgressStore((state) => state.totalXp)
  const progressCurrentLevelXp = useProgressStore((state) => state.currentLevelXp)
  const progressNextLevelXp = useProgressStore((state) => state.nextLevelXp)
  const progressRecoveryXp = useProgressStore((state) => state.recoveryXp)
  const progressSectors = useProgressStore((state) => state.sectors)
  const progressDailySummary = useProgressStore((state) => state.dailySummary)
  const userName = useSettingsStore((state) => state.userName)
  const userRole = useSettingsStore((state) => state.userRole)
  const heightCm = useSettingsStore((state) => state.heightCm)
  const bodyGoal = useSettingsStore((state) => state.bodyGoal)
  const targetWeightKg = useSettingsStore((state) => state.targetWeightKg)
  const activityLevel = useSettingsStore((state) => state.activityLevel)
  const usualSleepTime = useSettingsStore((state) => state.usualSleepTime)
  const usualWakeTime = useSettingsStore((state) => state.usualWakeTime)
  const lastBackupAt = useSettingsStore((state) => state.lastBackupAt)
  const lastBackupExportAt = useSettingsStore((state) => state.lastBackupExportAt)
  const lastBackupReason = useSettingsStore((state) => state.lastBackupReason)
  const backupReminderSnoozedUntil = useSettingsStore((state) => state.backupReminderSnoozedUntil)
  const onboarding = useSettingsStore((state) => state.onboarding)
  const bodyToday = useBodyStore((state) => state.today)
  const bodyDailyLogs = useBodyStore((state) => state.dailyLogs)
  const moneyAccounts = useMoneyStore((state) => state.accounts)
  const moneyTransactions = useMoneyStore((state) => state.transactions)
  const moneyPlannedPayments = useMoneyStore((state) => state.plannedPayments)
  const moneyDebts = useMoneyStore((state) => state.debts)
  const moneyTrackingStartDate = useMoneyStore((state) => state.trackingStartDate)
  const moneyLastImportAt = useMoneyStore((state) => state.lastImportAt)
  const moneyLastBalanceCheckAt = useMoneyStore((state) => state.lastBalanceCheckAt)
  const moneyImportWarnings = useMoneyStore((state) => state.importWarnings)
  const todayCurrentMode = useTodayStore((state) => state.currentMode)
  const todayRoute = useTodayStore((state) => state.route)
  const todayDailyQuestCompletion = useTodayStore((state) => state.dailyQuestCompletion)
  const weeklySummaries = useWeeklyReviewStore((state) => state.summaries)
  const milestones = useMilestonesStore((state) => state.milestones)

  const nextStep = buildTodayNextStepRecommendation()
  const dailyQuest = useMemo(
    () => buildDailyQuest(nextStep, todayDailyQuestCompletion),
    [nextStep, todayDailyQuestCompletion],
  )
  const companion = useMemo(
    () => ({
      mood: companionMood,
      evolutionLevel: companionEvolutionLevel,
      activeMessage: companionActiveMessage,
      stabilityScore: companionStabilityScore,
      customization: companionCustomization,
    }),
    [
      companionActiveMessage,
      companionCustomization,
      companionEvolutionLevel,
      companionMood,
      companionStabilityScore,
    ],
  )
  const progress = useMemo(
    () => ({
      level: progressLevel,
      totalXp: progressTotalXp,
      currentLevelXp: progressCurrentLevelXp,
      nextLevelXp: progressNextLevelXp,
      recoveryXp: progressRecoveryXp,
      sectors: progressSectors,
      dailySummary: progressDailySummary,
    }),
    [
      progressCurrentLevelXp,
      progressDailySummary,
      progressLevel,
      progressNextLevelXp,
      progressRecoveryXp,
      progressSectors,
      progressTotalXp,
    ],
  )
  const settings = useMemo(
    () => ({
      userName,
      userRole,
      heightCm,
      bodyGoal,
      targetWeightKg,
      activityLevel,
      usualSleepTime,
      usualWakeTime,
      lastBackupAt,
      lastBackupExportAt,
      lastBackupReason,
      backupReminderSnoozedUntil,
      onboarding,
    }),
    [
      activityLevel,
      bodyGoal,
      heightCm,
      lastBackupAt,
      lastBackupExportAt,
      lastBackupReason,
      onboarding,
      backupReminderSnoozedUntil,
      targetWeightKg,
      userName,
      userRole,
      usualSleepTime,
      usualWakeTime,
    ],
  )
  const body = useMemo(
    () => ({
      today: bodyToday,
      dailyLogs: bodyDailyLogs,
    }),
    [bodyDailyLogs, bodyToday],
  )
  const money = useMemo(
    () => ({
      accounts: moneyAccounts,
      transactions: moneyTransactions,
      plannedPayments: moneyPlannedPayments,
      debts: moneyDebts,
      trackingStartDate: moneyTrackingStartDate,
      lastImportAt: moneyLastImportAt,
      lastBalanceCheckAt: moneyLastBalanceCheckAt,
      importWarnings: moneyImportWarnings,
    }),
    [
      moneyAccounts,
      moneyDebts,
      moneyImportWarnings,
      moneyLastBalanceCheckAt,
      moneyLastImportAt,
      moneyPlannedPayments,
      moneyTrackingStartDate,
      moneyTransactions,
    ],
  )
  const today = useMemo(
    () => ({
      currentMode: todayCurrentMode,
      route: todayRoute,
      dailyQuest,
      dailyQuestCompletion: todayDailyQuestCompletion,
    }),
    [dailyQuest, todayCurrentMode, todayDailyQuestCompletion, todayRoute],
  )
  const profile = useMemo(
    () =>
      buildSystemProfileViewModel({
        settings,
        progress,
        companion,
        body,
        money,
        weekly: {
          summaries: weeklySummaries,
        },
        today,
        milestones,
        nextStep,
      }),
    [body, companion, milestones, money, nextStep, progress, settings, today, weeklySummaries],
  )
  const skillModules = useMemo(
    () =>
      buildLifeQuestSkillTree({
        settings,
        progress,
        companion,
        body,
        money,
        weekly: {
          summaries: weeklySummaries,
        },
        today,
        milestones,
      }),
    [body, companion, milestones, money, progress, settings, today, weeklySummaries],
  )
  const weeklyRecap = useMemo(
    () =>
      buildWeeklyRecapViewModel({
        settings,
        progress: {
          recoveryXp: progress.recoveryXp,
          dailySummary: progress.dailySummary,
        },
        companion,
        body,
        money,
        today,
        milestones,
        weekly: {
          summaries: weeklySummaries,
        },
        modules: skillModules,
      }),
    [body, companion, milestones, money, progress.dailySummary, progress.recoveryXp, settings, skillModules, today, weeklySummaries],
  )

  const handleModuleSuggestionAction = (suggestion: LifeQuestModuleSuggestion) => {
    if (suggestion.actionType === 'open_body' || suggestion.actionType === 'add_water') {
      navigate('/body')
      return
    }

    if (suggestion.actionType === 'open_money') {
      navigate('/money')
      return
    }

    if (suggestion.actionType === 'open_today' || suggestion.actionType === 'open_recovery') {
      navigate('/today')
      return
    }

    if (suggestion.actionType === 'open_backup') {
      navigate('/settings')
      return
    }

    if (suggestion.actionType === 'open_companion_customization') {
      setCompanionCustomizationOpen(true)
      const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? true

      window.setTimeout(() => {
        companionCustomizationRef.current?.scrollIntoView({
          block: 'start',
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
        })
      }, 0)
    }
  }

  const dailyQuestDomainLabels = {
    body: 'Тело',
    money: 'Деньги',
    focus: 'Фокус',
    recovery: 'Восстановление',
    system: 'Система',
  }

  return (
    <section className="pb-24">
      <ScreenHeader title="Профиль системы" subtitle="Локальная база · Companion активен" />

      <div className="mb-4">
        <CompanionCoreWidget
          mood={companion.mood}
          message={profile.companionMessage}
          level={profile.systemLevel}
          stabilityScore={companion.stabilityScore}
          currentXp={progress.currentLevelXp}
          nextLevelXp={progress.nextLevelXp}
          variant="hero"
        />
      </div>

      <GlassCard tone="strong" className="relative mb-4 overflow-hidden border-white/10">
        <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-cyan/60 to-transparent" />
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-primary/80">
                LifeQuest OS
              </p>
              <h1 className="mt-1.5 break-words font-display text-2xl font-bold leading-tight text-white">
                {profile.userName}
              </h1>
              <p className="mt-1 text-sm leading-5 text-muted">{profile.title}</p>
            </div>
            <div className="shrink-0 rounded-2xl border border-cyan/25 bg-cyan/10 px-3 py-2 text-right">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-cyan/80">Система</p>
              <p className="mt-1 text-sm font-semibold text-white">Ур. {profile.systemLevel}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.045] p-3">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Форма Core</p>
              <p className="mt-1 break-words text-sm font-semibold text-white">
                {profile.companionForm}
              </p>
            </div>
            <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.045] p-3">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Статус</p>
              <p className="mt-1 break-words text-sm font-semibold text-white">
                {profile.systemStatus}
              </p>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3 text-xs uppercase tracking-[0.16em] text-muted">
              <span>До {profile.nextEvolutionLabel}</span>
              <span>{formatPercent(profile.nextEvolutionProgressPercent)}</span>
            </div>
            <LinearProgress
              value={profile.nextEvolutionProgressPercent}
              barClassName="bg-gradient-to-r from-primary via-cyan to-success"
            />
            <p className="mt-2 text-xs leading-5 text-muted">
              Осталось {formatPercent(profile.nextEvolutionRemainingPercent)} до следующего витка.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.045] p-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted">Всего XP</p>
              <p className="mt-1 font-display text-lg font-bold text-white">
                {formatCompact(profile.xpSignals.totalXp)}
              </p>
            </div>
            <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.045] p-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted">Сегодня</p>
              <p className="mt-1 font-display text-lg font-bold text-white">
                {formatCompact(profile.xpSignals.todayXp)}
              </p>
            </div>
            <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.045] p-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted">Recovery</p>
              <p className="mt-1 font-display text-lg font-bold text-white">
                {formatCompact(profile.xpSignals.recoveryXp)}
              </p>
            </div>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="mb-4 overflow-hidden border-cyan/20 bg-gradient-to-br from-cyan/12 via-primary/8 to-transparent !p-3.5">
        <div className="pointer-events-none -mx-3.5 -mt-3.5 mb-3 h-px bg-gradient-to-r from-transparent via-cyan/50 to-transparent" />
        <div className="flex items-start gap-3">
          <div className="rounded-2xl border border-cyan/20 bg-cyan/10 p-2 text-cyan">
            <Target className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-cyan/80">
                Сегодняшний маршрут
              </p>
              <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[11px] text-muted">
                {profile.dailyRoute.status === 'completed' ? 'Выполнен' : 'Ждёт действия'}
              </span>
            </div>
            <h2 className="mt-1.5 break-words font-display text-base font-semibold leading-tight text-white">
              Главный квест: {profile.dailyRoute.title}
            </h2>
            <p className="mt-1.5 break-words text-[13px] leading-5 text-muted">
              {profile.dailyRoute.caption} · {profile.dailyRoute.rewardSignal}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-cyan/20 bg-cyan/10 px-2.5 py-1 text-[11px] text-cyan">
                Усиливает: {dailyQuestDomainLabels[dailyQuest.domain]}
              </span>
              <PrimaryButton
                className="min-h-9 rounded-xl px-3 py-2 text-xs"
                icon={<ArrowRight className="h-3.5 w-3.5" />}
                onClick={() => navigate('/today')}
                tone="secondary"
                type="button"
              >
                Открыть Сегодня
              </PrimaryButton>
            </div>
          </div>
        </div>
      </GlassCard>

      <SkillTreePanel modules={skillModules} onSuggestionAction={handleModuleSuggestionAction} />

      <WeeklyRecapPanel recap={weeklyRecap} />

      <MilestonesPanel
        emptyText={profile.milestoneEmptyText}
        milestones={profile.recentMilestones}
        totalCount={profile.milestoneCount}
      />

      <GlassCard className="mb-3">
        <CompanionEvolutionPreview
          mood={companion.mood}
          evolutionLevel={companion.evolutionLevel}
          progressToNextForm={profile.nextEvolutionProgressPercent}
          nextFormLabel={profile.nextEvolutionLabel}
          showNodes={false}
        />
      </GlassCard>

      <div ref={companionCustomizationRef} className="scroll-mt-4">
        <CompanionCustomizationPanel
          key={`${companionCustomization.displayName}:${companionCustomization.accent}:${companionCustomization.shell}:${companionCustomization.updatedAt ?? 'default'}`}
          customization={companionCustomization}
          expanded={companionCustomizationOpen}
          mood={companion.mood}
          message={profile.companionMessage}
          level={profile.systemLevel}
          stabilityScore={companion.stabilityScore}
          currentXp={progress.currentLevelXp}
          nextLevelXp={progress.nextLevelXp}
          onExpandedChange={setCompanionCustomizationOpen}
        />
      </div>
    </section>
  )
}
