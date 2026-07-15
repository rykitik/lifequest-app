import { getCreditDebt, getMonthlyPlanProjection, getTotalBalance } from '@/features/money/lib/money'
import { getLocalDateKey } from '@/shared/lib/date'
import type {
  BodyMovementType,
  BodyNutritionStatus,
  BodySnapshot,
  ModeKey,
  QuestItem,
  SettingsProfile,
  WeeklyReviewSummary,
} from '@/shared/types'
import { useBodyStore } from '@/stores/useBodyStore'
import { useMoneyStore } from '@/stores/useMoneyStore'
import { useProgressStore } from '@/stores/useProgressStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useTodayStore } from '@/stores/useTodayStore'
import { useWeeklyReviewStore } from '@/stores/useWeeklyReviewStore'

export interface TodayNextStepRecommendation {
  id: string
  title: string
  subtitle?: string
  reason: string
  domain: 'body' | 'money' | 'focus' | 'recovery' | 'weekly' | 'profile'
  difficulty: 'easy' | 'medium'
  minutes: number
  xp?: number
  actionLabel: string
  fallbackTitle?: string
  fallbackLabel?: string
  confidence: 'low' | 'medium' | 'high'
  sourceLabels: string[]
}

export interface TodayNextStepContext {
  profile: Partial<SettingsProfile> & {
    onboarding?: {
      completed: boolean
      skipped: boolean
    }
  }
  body: {
    today: Pick<
      BodySnapshot,
      | 'date'
      | 'weightKg'
      | 'waterLiters'
      | 'steps'
      | 'movementType'
      | 'nutritionStatus'
      | 'workoutDone'
    >
  }
  money: {
    trackingStartDate?: string
    totalBalance: number
    safeToSpend?: number
    creditDebt?: number
    lastImportAt?: string
    importWarnings: string[]
  }
  weekly: {
    latest?: Pick<
      WeeklyReviewSummary,
      'risk' | 'bodyFocus' | 'moneyFocus' | 'summary' | 'dataQuality' | 'appliedActionsCount'
    >
  }
  today: {
    currentMode: ModeKey
    mainQuest: QuestItem | null
    quickWin: QuestItem | null
    recoveryQuest: QuestItem | null
  }
  progress: {
    level: number
  }
}

const noSignalNutrition: BodyNutritionStatus[] = ['Не выбрано']
const noSignalMovement: BodyMovementType[] = ['Не выбрано', 'Без тренировки']
const movementLimitationPattern =
  /(колен|нога|ноги|стоп|голеностоп|спин|травм|боль|болит|нельзя|огранич|беречь|после операции)/i

function compactText(value: string | undefined, maxLength = 120) {
  const text = value?.replace(/\s+/g, ' ').trim() ?? ''

  if (text.length <= maxLength) {
    return text
  }

  return `${text.slice(0, maxLength - 1).trim()}…`
}

function isProfileMissing(profile: TodayNextStepContext['profile']) {
  const onboardingSkipped = profile.onboarding?.skipped === true

  return Boolean(
    onboardingSkipped && (!profile.heightCm || !profile.bodyGoal || profile.bodyGoal === 'not_set' || !profile.targetWeightKg),
  )
}

function isBodyAlmostEmpty(today: TodayNextStepContext['body']['today']) {
  return (
    today.waterLiters <= 0 &&
    today.steps <= 0 &&
    !today.workoutDone &&
    noSignalNutrition.includes(today.nutritionStatus) &&
    noSignalMovement.includes(today.movementType)
  )
}

function hasMovementLimitation(profile: TodayNextStepContext['profile']) {
  return movementLimitationPattern.test(profile.bodyLimitations ?? '')
}

function hasMoneyRisk(money: TodayNextStepContext['money']) {
  return (
    (money.safeToSpend !== undefined && money.safeToSpend < 1000) ||
    (money.creditDebt ?? 0) > 0 ||
    money.importWarnings.length > 0
  )
}

function getFallbackQuest(today: TodayNextStepContext['today']) {
  return today.quickWin && today.quickWin.status !== 'complete'
    ? today.quickWin
    : today.mainQuest && today.mainQuest.status !== 'complete'
      ? today.mainQuest
      : today.recoveryQuest && today.recoveryQuest.status !== 'complete'
        ? today.recoveryQuest
        : null
}

export function buildTodayNextStepContext(): TodayNextStepContext {
  const settings = useSettingsStore.getState()
  const body = useBodyStore.getState()
  const money = useMoneyStore.getState()
  const weekly = useWeeklyReviewStore.getState()
  const today = useTodayStore.getState()
  const progress = useProgressStore.getState()
  const projection = getMonthlyPlanProjection(money)

  return {
    profile: {
      heightCm: settings.heightCm,
      bodyGoal: settings.bodyGoal,
      targetWeightKg: settings.targetWeightKg,
      targetPace: settings.targetPace,
      activityLevel: settings.activityLevel,
      bodyLimitations: settings.bodyLimitations,
      onboarding: {
        completed: settings.onboarding.completed,
        skipped: settings.onboarding.skipped,
      },
    },
    body: {
      today: body.today,
    },
    money: {
      trackingStartDate: money.trackingStartDate,
      totalBalance: getTotalBalance(money.accounts, money.transactions),
      safeToSpend: projection.safeToSpend,
      creditDebt: getCreditDebt(money.accounts),
      lastImportAt: money.lastImportAt,
      importWarnings: money.importWarnings.slice(0, 3),
    },
    weekly: {
      latest: weekly.summaries[0],
    },
    today: {
      currentMode: today.currentMode,
      mainQuest: today.route.mainQuest,
      quickWin: today.route.quickWin,
      recoveryQuest: today.route.recoveryQuest,
    },
    progress: {
      level: progress.level,
    },
  }
}

export function buildTodayNextStepRecommendation(
  context = buildTodayNextStepContext(),
): TodayNextStepRecommendation {
  if (isProfileMissing(context.profile)) {
    return {
      id: 'profile-baseline-missing',
      title: 'Заполнить профиль LifeQuest',
      reason: 'Ядру нужен базовый контекст, чтобы точнее собирать тело и недельные выводы.',
      domain: 'profile',
      difficulty: 'easy',
      minutes: 3,
      xp: 6,
      actionLabel: 'Открыть профиль',
      confidence: 'high',
      sourceLabels: ['Профиль'],
    }
  }

  if (isBodyAlmostEmpty(context.body.today)) {
    return {
      id: 'body-quick-checkin',
      title: 'Сделать быстрый чек-ин тела',
      reason: 'Сегодня ещё нет базового сигнала по телу.',
      domain: 'body',
      difficulty: 'easy',
      minutes: 2,
      xp: 8,
      actionLabel: 'Открыть тело',
      confidence: 'high',
      sourceLabels: ['Тело', 'Сегодня'],
    }
  }

  if (context.body.today.waterLiters < 1) {
    return {
      id: 'body-water-low',
      title: 'Выпить воды',
      subtitle: '+500 мл',
      reason: 'Вода сегодня ниже базового уровня. Лучше восстановить базу перед фокусом.',
      domain: 'body',
      difficulty: 'easy',
      minutes: 1,
      xp: 5,
      actionLabel: 'Отметить воду',
      fallbackTitle: 'Если сейчас неудобно',
      fallbackLabel: 'Открыть тело',
      confidence: 'high',
      sourceLabels: ['Тело'],
    }
  }

  if (context.body.today.steps < 3000 && !hasMovementLimitation(context.profile)) {
    return {
      id: 'body-steps-low',
      title: 'Пройти 5 минут',
      reason: 'Движение сегодня низкое, но можно начать без тренировки.',
      domain: 'body',
      difficulty: 'easy',
      minutes: 5,
      xp: 8,
      actionLabel: 'Открыть тело',
      confidence: 'medium',
      sourceLabels: ['Тело', 'Энергия'],
    }
  }

  if (hasMoneyRisk(context.money)) {
    const reason = context.money.importWarnings[0]
      ? `Есть денежный сигнал: ${compactText(context.money.importWarnings[0], 90)}`
      : context.money.safeToSpend !== undefined && context.money.safeToSpend < 1000
        ? 'Свободный остаток сейчас лучше держать под контролем до новых трат.'
        : 'Есть кредитная задолженность. Достаточно спокойно сверить безопасный остаток.'

    return {
      id: 'money-safe-balance',
      title: 'Проверить безопасный остаток',
      reason,
      domain: 'money',
      difficulty: 'easy',
      minutes: 3,
      xp: 8,
      actionLabel: 'Открыть деньги',
      confidence: 'medium',
      sourceLabels: ['Деньги'],
    }
  }

  if (context.weekly.latest?.risk) {
    return {
      id: 'weekly-risk',
      title: 'Закрыть риск недели',
      reason: compactText(context.weekly.latest.risk, 120),
      domain: 'weekly',
      difficulty: 'medium',
      minutes: 7,
      xp: 10,
      actionLabel: 'Открыть Центр промптов',
      confidence: context.weekly.latest.dataQuality === 'low' ? 'low' : 'medium',
      sourceLabels: ['Недельный риск'],
    }
  }

  if (context.today.currentMode === 'low') {
    return {
      id: 'recovery-low-energy',
      title: 'Сделать восстановительный шаг',
      reason: 'Сегодня важнее вернуть базу, чем давить на продуктивность.',
      domain: 'recovery',
      difficulty: 'easy',
      minutes: 5,
      xp: 8,
      actionLabel: 'Открыть запасной план',
      confidence: 'high',
      sourceLabels: ['Режим', 'Восстановление'],
    }
  }

  const fallbackQuest = getFallbackQuest(context.today)

  if (fallbackQuest) {
    return {
      id: `focus-${fallbackQuest.id}`,
      title: fallbackQuest.title,
      subtitle: fallbackQuest.subtitle,
      reason: 'Система стабильна. Лучше сделать один чистый шаг.',
      domain: 'focus',
      difficulty: fallbackQuest.minutes <= 10 ? 'easy' : 'medium',
      minutes: Math.max(2, Math.min(10, fallbackQuest.minutes)),
      xp: fallbackQuest.xp,
      actionLabel: 'Перейти к шагу',
      confidence: 'medium',
      sourceLabels: ['Маршрут дня'],
    }
  }

  return {
    id: `baseline-${getLocalDateKey()}`,
    title: 'Собрать базовый сигнал',
    reason: 'Данных пока мало. Начни с короткого чек-ина, чтобы система не притворялась умнее фактов.',
    domain: 'body',
    difficulty: 'easy',
    minutes: 2,
    xp: 5,
    actionLabel: 'Открыть тело',
    confidence: 'low',
    sourceLabels: ['Мало данных'],
  }
}
