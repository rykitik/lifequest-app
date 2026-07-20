import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, Check, MessageSquareText, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { applyLifeQuestReward, rewardFeedbackMessages } from '@/services/gameplay'
import { GlassCard } from '@/shared/components/GlassCard'
import { PrimaryButton } from '@/shared/components/PrimaryButton'
import { getLocalDateKey } from '@/shared/lib/date'
import { formatCurrency } from '@/shared/lib/format'
import type {
  BodyMovementType,
  MoneyAccount,
  MoneyAccountType,
  OnboardingStepId,
  SettingsProfile,
} from '@/shared/types'
import { useBodyStore } from '@/stores/useBodyStore'
import { useMoneyStore } from '@/stores/useMoneyStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useTodayStore } from '@/stores/useTodayStore'

type BodyGoal = NonNullable<SettingsProfile['bodyGoal']>
type ActivityLevel = NonNullable<SettingsProfile['activityLevel']>

const steps: Array<{ id: OnboardingStepId; title: string }> = [
  { id: 'welcome', title: 'Старт' },
  { id: 'profile', title: 'Профиль' },
  { id: 'body', title: 'Тело' },
  { id: 'money', title: 'Деньги' },
  { id: 'route', title: 'Маршрут' },
]

const bodyGoalOptions: Array<{ value: BodyGoal; label: string }> = [
  { value: 'not_set', label: 'Пока не выбрано' },
  { value: 'weight_loss', label: 'Снижение веса' },
  { value: 'maintain', label: 'Поддержание' },
  { value: 'energy', label: 'Энергия' },
  { value: 'health', label: 'Здоровье' },
]

const activityOptions: Array<{ value: ActivityLevel; label: string }> = [
  { value: 'low', label: 'Низкая' },
  { value: 'medium', label: 'Средняя' },
  { value: 'high', label: 'Высокая' },
]

const movementOptions: Array<{ value: BodyMovementType; label: string }> = [
  { value: 'Без тренировки' as BodyMovementType, label: 'Без тренировки' },
  { value: 'Прогулка' as BodyMovementType, label: 'Прогулка' },
  { value: 'Домашняя' as BodyMovementType, label: 'Домашняя' },
  { value: 'Зал' as BodyMovementType, label: 'Зал' },
  { value: 'Растяжка' as BodyMovementType, label: 'Растяжка' },
]

const inputClass =
  'w-full rounded-2xl border border-white/10 bg-surface/80 px-3 py-3 text-sm text-white outline-none transition placeholder:text-muted focus:border-cyan/50 focus:bg-white/10'

function parseOptionalNumber(value: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    return undefined
  }

  const parsed = Number(trimmed.replace(',', '.'))

  return Number.isFinite(parsed) ? parsed : undefined
}

function parseMoney(value: string) {
  return parseOptionalNumber(value) ?? 0
}

function formatDraftNumber(value: number | undefined) {
  if (value === undefined || value === 0) {
    return ''
  }

  return String(value)
}

function findBaselineAccount(accounts: MoneyAccount[], type: MoneyAccountType, fallbackName?: string) {
  return accounts.find((account) => {
    if (account.isArchived || account.type !== type) {
      return false
    }

    return fallbackName ? account.name.toLowerCase().includes(fallbackName.toLowerCase()) : true
  }) ?? accounts.find((account) => !account.isArchived && account.type === type)
}

function getStepIndex(step: OnboardingStepId) {
  return Math.max(0, steps.findIndex((item) => item.id === step))
}

function FieldLabel({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-white">{label}</span>
      {children}
    </label>
  )
}

export function OnboardingScreen() {
  const navigate = useNavigate()
  const onboarding = useSettingsStore((state) => state.onboarding)
  const setOnboardingStep = useSettingsStore((state) => state.setOnboardingStep)
  const completeOnboarding = useSettingsStore((state) => state.completeOnboarding)
  const skipOnboarding = useSettingsStore((state) => state.skipOnboarding)
  const updateProfile = useSettingsStore((state) => state.updateProfile)
  const userName = useSettingsStore((state) => state.userName)
  const heightCm = useSettingsStore((state) => state.heightCm)
  const bodyGoal = useSettingsStore((state) => state.bodyGoal)
  const targetWeightKg = useSettingsStore((state) => state.targetWeightKg)
  const activityLevel = useSettingsStore((state) => state.activityLevel)
  const bodyLimitations = useSettingsStore((state) => state.bodyLimitations)
  const todayBody = useBodyStore((state) => state.today)
  const saveCheckin = useBodyStore((state) => state.saveCheckin)
  const ensureTodayBodySnapshot = useBodyStore((state) => state.ensureTodayBodySnapshot)
  const moneyAccounts = useMoneyStore((state) => state.accounts)
  const storedTrackingStartDate = useMoneyStore((state) => state.trackingStartDate)
  const setupMoneyBaseline = useMoneyStore((state) => state.setupMoneyBaseline)
  const route = useTodayStore((state) => state.route)
  const debitAccount = useMemo(
    () => findBaselineAccount(moneyAccounts, 'debit_card', 'Основная'),
    [moneyAccounts],
  )
  const cashAccount = useMemo(
    () => findBaselineAccount(moneyAccounts, 'cash', 'Наличные'),
    [moneyAccounts],
  )
  const creditAccount = useMemo(
    () => findBaselineAccount(moneyAccounts, 'credit_card', 'Кредит'),
    [moneyAccounts],
  )

  const [nameDraft, setNameDraft] = useState(userName)
  const [heightDraft, setHeightDraft] = useState(String(heightCm ?? ''))
  const [goalDraft, setGoalDraft] = useState<BodyGoal>(bodyGoal ?? 'not_set')
  const [targetWeightDraft, setTargetWeightDraft] = useState(String(targetWeightKg ?? ''))
  const [activityDraft, setActivityDraft] = useState<ActivityLevel>(activityLevel ?? 'medium')
  const [limitationsDraft, setLimitationsDraft] = useState(bodyLimitations ?? '')
  const [weightDraft, setWeightDraft] = useState(String(todayBody.weightKg ?? ''))
  const [waterDraft, setWaterDraft] = useState(String(todayBody.waterLiters ?? ''))
  const [stepsDraft, setStepsDraft] = useState(String(todayBody.steps ?? ''))
  const [movementDraft, setMovementDraft] = useState<BodyMovementType>(
    todayBody.movementType || ('Без тренировки' as BodyMovementType),
  )
  const [trackingStartDate, setTrackingStartDate] = useState(storedTrackingStartDate ?? getLocalDateKey())
  const [debitBalance, setDebitBalance] = useState(formatDraftNumber(debitAccount?.openingBalance))
  const [cashBalance, setCashBalance] = useState(formatDraftNumber(cashAccount?.openingBalance))
  const [creditLimit, setCreditLimit] = useState(formatDraftNumber(creditAccount?.creditLimit))
  const [creditDebt, setCreditDebt] = useState(formatDraftNumber(creditAccount?.debt))
  const [moneyMessage, setMoneyMessage] = useState('')

  useEffect(() => {
    ensureTodayBodySnapshot()
  }, [ensureTodayBodySnapshot])

  const currentStep = onboarding.currentStep
  const currentStepIndex = getStepIndex(currentStep)
  const progressLabel = `Шаг ${currentStepIndex + 1} из ${steps.length}`
  const canGoBack = currentStepIndex > 0
  const totalAssets = useMemo(
    () => parseMoney(debitBalance) + parseMoney(cashBalance),
    [cashBalance, debitBalance],
  )

  const goToStep = (step: OnboardingStepId) => {
    setMoneyMessage('')
    setOnboardingStep(step)
  }

  const goBack = () => {
    const previousStep = steps[currentStepIndex - 1]?.id

    if (previousStep) {
      goToStep(previousStep)
    }
  }

  const handleSkip = () => {
    skipOnboarding()
    navigate('/today', { replace: true })
  }

  const handleProfileSave = () => {
    updateProfile({
      userName: nameDraft.trim() || userName,
      heightCm: parseOptionalNumber(heightDraft),
      bodyGoal: goalDraft,
      targetWeightKg: parseOptionalNumber(targetWeightDraft),
      activityLevel: activityDraft,
      bodyLimitations: limitationsDraft.trim() || undefined,
    })
    goToStep('body')
  }

  const handleBodySave = () => {
    const movementType = movementDraft
    saveCheckin({
      weightKg: parseOptionalNumber(weightDraft),
      waterLiters: parseOptionalNumber(waterDraft) ?? 0,
      steps: Math.max(0, Math.round(parseOptionalNumber(stepsDraft) ?? 0)),
      movementType,
      workout: movementType,
      workoutDone: movementType !== ('Без тренировки' as BodyMovementType),
    })
    goToStep('money')
  }

  const handleMoneySave = () => {
    const result = setupMoneyBaseline({
      trackingStartDate,
      accounts: [
        {
          name: 'Основная карта',
          type: 'debit_card',
          openingBalance: parseMoney(debitBalance),
        },
        {
          name: 'Наличные',
          type: 'cash',
          openingBalance: parseMoney(cashBalance),
        },
        {
          name: 'Кредитка',
          type: 'credit_card',
          creditLimit: parseMoney(creditLimit),
          debt: parseMoney(creditDebt),
        },
      ],
    })

    if (!result.ok) {
      setMoneyMessage(result.reason ?? 'Проверь дату старта и суммы.')
      return
    }

    setMoneyMessage('')
    goToStep('route')
  }

  const finishToToday = () => {
    completeOnboarding()
    applyLifeQuestReward(
      {
        xp: 12,
        consistencyXp: 2,
        sector: 'stability',
        sourceId: 'onboarding:completed',
      },
      'Настройка завершена. Система готова держать один следующий шаг.',
      rewardFeedbackMessages.onboardingCompleted,
    )
    navigate('/today', { replace: true })
  }

  const finishToPromptCenter = () => {
    completeOnboarding()
    applyLifeQuestReward(
      {
        xp: 12,
        consistencyXp: 2,
        sector: 'stability',
        sourceId: 'onboarding:completed',
      },
      'Настройка завершена. Центр промптов получит уже собранный контекст.',
      rewardFeedbackMessages.onboardingCompleted,
    )
    navigate('/today', { replace: true })
    window.setTimeout(() => {
      void import('@/stores/usePromptCenterStore').then(({ usePromptCenterStore }) => {
        usePromptCenterStore.getState().openPromptCenter()
      })
    }, 0)
  }

  return (
    <section className="min-h-screen pb-8 pt-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={goBack}
          disabled={!canGoBack}
          className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 text-sm text-slate-200 transition disabled:opacity-40"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад
        </button>
        <button
          type="button"
          onClick={handleSkip}
          className="min-h-11 rounded-2xl border border-white/10 bg-transparent px-3 text-sm text-muted transition hover:bg-white/5 hover:text-white"
        >
          Пропустить
        </button>
      </div>

      <GlassCard tone="strong" className="border border-cyan/15">
        <div className="mb-5">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan/80">{progressLabel}</p>
          <div className="mt-3 flex gap-1.5">
            {steps.map((step, index) => (
              <span
                key={step.id}
                className={`h-1.5 flex-1 rounded-full ${
                  index <= currentStepIndex ? 'bg-cyan' : 'bg-white/10'
                }`}
              />
            ))}
          </div>
        </div>

        {currentStep === 'welcome' ? (
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-primary/80">LifeQuest</p>
            <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-white">
              Соберём систему без перегруза
            </h1>
            <p className="mt-4 text-sm leading-6 text-slate-200">
              LifeQuest помогает собрать тело, деньги, фокус и восстановление в одну спокойную систему.
            </p>
            <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-200">
              Данные хранятся локально на этом устройстве. Настройку можно пропустить, а все поля изменить позже.
            </div>
            <div className="mt-6 grid gap-3">
              <PrimaryButton fullWidth icon={<ArrowRight className="h-4 w-4" />} onClick={() => goToStep('profile')}>
                Начать настройку
              </PrimaryButton>
              <PrimaryButton fullWidth tone="ghost" onClick={handleSkip}>
                Пропустить
              </PrimaryButton>
            </div>
          </div>
        ) : null}

        {currentStep === 'profile' ? (
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-primary/80">Профиль</p>
            <h1 className="mt-3 font-display text-2xl font-bold text-white">Кто ты и куда движемся</h1>
            <p className="mt-2 text-sm leading-6 text-muted">
              Только минимум для контекста. Это не анкета и не оценка.
            </p>
            <div className="mt-5 grid gap-4">
              <FieldLabel label="Имя">
                <input className={inputClass} value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} />
              </FieldLabel>
              <div className="grid grid-cols-2 gap-3">
                <FieldLabel label="Рост, см">
                  <input
                    className={inputClass}
                    inputMode="decimal"
                    min="80"
                    type="number"
                    value={heightDraft}
                    onChange={(event) => setHeightDraft(event.target.value)}
                  />
                </FieldLabel>
                <FieldLabel label="Целевой вес">
                  <input
                    className={inputClass}
                    inputMode="decimal"
                    min="20"
                    step="0.1"
                    type="number"
                    value={targetWeightDraft}
                    onChange={(event) => setTargetWeightDraft(event.target.value)}
                  />
                </FieldLabel>
              </div>
              <FieldLabel label="Цель тела">
                <select className={inputClass} value={goalDraft} onChange={(event) => setGoalDraft(event.target.value as BodyGoal)}>
                  {bodyGoalOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </FieldLabel>
              <FieldLabel label="Активность">
                <select
                  className={inputClass}
                  value={activityDraft}
                  onChange={(event) => setActivityDraft(event.target.value as ActivityLevel)}
                >
                  {activityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </FieldLabel>
              <FieldLabel label="Ограничения/заметки">
                <textarea
                  className={`${inputClass} min-h-24 resize-none`}
                  value={limitationsDraft}
                  onChange={(event) => setLimitationsDraft(event.target.value)}
                  placeholder="Например: беречь колени, не ставить прыжковые тренировки."
                />
              </FieldLabel>
            </div>
            <div className="mt-6">
              <PrimaryButton fullWidth icon={<ShieldCheck className="h-4 w-4" />} onClick={handleProfileSave}>
                Сохранить и дальше
              </PrimaryButton>
            </div>
          </div>
        ) : null}

        {currentStep === 'body' ? (
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-primary/80">Тело</p>
            <h1 className="mt-3 font-display text-2xl font-bold text-white">Зафиксируем старт</h1>
            <p className="mt-2 text-sm leading-6 text-muted">
              Не нужно идеально. Просто текущая точка, чтобы неделя читалась честнее.
            </p>
            <div className="mt-5 grid gap-4">
              <FieldLabel label="Текущий вес">
                <input
                  className={inputClass}
                  inputMode="decimal"
                  min="1"
                  step="0.1"
                  type="number"
                  value={weightDraft}
                  onChange={(event) => setWeightDraft(event.target.value)}
                />
              </FieldLabel>
              <div className="grid grid-cols-2 gap-3">
                <FieldLabel label="Вода сегодня, л">
                  <input
                    className={inputClass}
                    inputMode="decimal"
                    min="0"
                    step="0.1"
                    type="number"
                    value={waterDraft}
                    onChange={(event) => setWaterDraft(event.target.value)}
                  />
                </FieldLabel>
                <FieldLabel label="Шаги сегодня">
                  <input
                    className={inputClass}
                    inputMode="numeric"
                    min="0"
                    type="number"
                    value={stepsDraft}
                    onChange={(event) => setStepsDraft(event.target.value)}
                  />
                </FieldLabel>
              </div>
              <FieldLabel label="Движение сегодня">
                <select
                  className={inputClass}
                  value={movementDraft}
                  onChange={(event) => setMovementDraft(event.target.value as BodyMovementType)}
                >
                  {movementOptions.map((option) => (
                    <option key={option.label} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </FieldLabel>
            </div>
            <div className="mt-6">
              <PrimaryButton fullWidth icon={<Check className="h-4 w-4" />} onClick={handleBodySave}>
                Зафиксировать состояние
              </PrimaryButton>
            </div>
          </div>
        ) : null}

        {currentStep === 'money' ? (
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-primary/80">Деньги</p>
            <h1 className="mt-3 font-display text-2xl font-bold text-white">Старт учета денег</h1>
            <p className="mt-2 text-sm leading-6 text-muted">
              Не нужно загружать историю за годы. Укажи текущие остатки - LifeQuest начнёт считать с этой даты.
            </p>
            <div className="mt-5 grid gap-4">
              <FieldLabel label="Дата старта учета">
                <input
                  className={inputClass}
                  type="date"
                  value={trackingStartDate}
                  onChange={(event) => setTrackingStartDate(event.target.value)}
                />
              </FieldLabel>
              <div className="grid grid-cols-2 gap-3">
                <FieldLabel label="Основная карта">
                  <input
                    className={inputClass}
                    inputMode="decimal"
                    min="0"
                    type="number"
                    value={debitBalance}
                    onChange={(event) => setDebitBalance(event.target.value)}
                    placeholder="0"
                  />
                </FieldLabel>
                <FieldLabel label="Наличные">
                  <input
                    className={inputClass}
                    inputMode="decimal"
                    min="0"
                    type="number"
                    value={cashBalance}
                    onChange={(event) => setCashBalance(event.target.value)}
                    placeholder="0"
                  />
                </FieldLabel>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-medium text-white">Кредитка</p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  Лимит не считается свободными деньгами. Задолженность будет отдельной нагрузкой.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <FieldLabel label="Лимит">
                    <input
                      className={inputClass}
                      inputMode="decimal"
                      min="0"
                      type="number"
                      value={creditLimit}
                      onChange={(event) => setCreditLimit(event.target.value)}
                      placeholder="0"
                    />
                  </FieldLabel>
                  <FieldLabel label="Задолженность">
                    <input
                      className={inputClass}
                      inputMode="decimal"
                      min="0"
                      type="number"
                      value={creditDebt}
                      onChange={(event) => setCreditDebt(event.target.value)}
                      placeholder="0"
                    />
                  </FieldLabel>
                </div>
              </div>
              <div className="rounded-3xl border border-cyan/20 bg-cyan/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-cyan/80">Свободные активы на старте</p>
                <p className="mt-2 font-display text-2xl font-bold text-white">{formatCurrency(totalAssets)}</p>
                {parseMoney(creditDebt) > 0 ? (
                  <p className="mt-2 text-sm text-slate-200">Кредитная задолженность: {formatCurrency(parseMoney(creditDebt))}</p>
                ) : null}
              </div>
              {moneyMessage ? (
                <p className="rounded-2xl border border-warning/20 bg-warning/10 px-3 py-2 text-sm text-warning">
                  {moneyMessage}
                </p>
              ) : null}
            </div>
            <div className="mt-6">
              <PrimaryButton fullWidth icon={<ShieldCheck className="h-4 w-4" />} onClick={handleMoneySave}>
                Сохранить старт денег
              </PrimaryButton>
            </div>
          </div>
        ) : null}

        {currentStep === 'route' ? (
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-primary/80">Первый маршрут</p>
            <h1 className="mt-3 font-display text-2xl font-bold text-white">Система готова к первому шагу</h1>
            <p className="mt-2 text-sm leading-6 text-muted">
              Теперь LifeQuest понимает стартовую точку. Недельный разбор можно будет получить позже через Центр промптов.
            </p>
            <div className="mt-5 space-y-3">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted">Главный шаг</p>
                <p className="mt-2 text-sm font-medium text-white">{route.mainQuest?.title ?? 'Выбрать один спокойный шаг на сегодня'}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted">Быстрая победа</p>
                <p className="mt-2 text-sm font-medium text-white">{route.quickWin?.title ?? 'Сделать короткое полезное действие'}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted">Запасной план</p>
                <p className="mt-2 text-sm font-medium text-white">{route.recoveryQuest?.title ?? 'Вернуться в систему за 2 минуты'}</p>
              </div>
            </div>
            <div className="mt-6 grid gap-3">
              <PrimaryButton fullWidth icon={<Check className="h-4 w-4" />} onClick={finishToToday}>
                Перейти на Сегодня
              </PrimaryButton>
              <PrimaryButton fullWidth tone="secondary" icon={<MessageSquareText className="h-4 w-4" />} onClick={finishToPromptCenter}>
                Открыть Центр промптов
              </PrimaryButton>
            </div>
          </div>
        ) : null}
      </GlassCard>
    </section>
  )
}
