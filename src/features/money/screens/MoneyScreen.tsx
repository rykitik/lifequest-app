import { type FormEvent, type ReactNode, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Check,
  CircleDollarSign,
  Edit3,
  Plus,
  SlidersHorizontal,
  Trash2,
  Wallet,
  X,
} from 'lucide-react'
import {
  formatDateSafe,
  getAccountBalance,
  getDebtProgress,
  getDebtSummary,
  getMoneyCalmNote,
  getMonthKey,
  getMonthlyPlan,
  getMonthlyPlanProjection,
  getMonthTotals,
  getSevenDayMoneyBars,
  getSuggestedMoneyActions,
  getTotalBalance,
  getWeeklyDelta,
  moneyAccountTypeLabels,
  moneyCategoryLabels,
  moneyExpenseCategories,
  moneyIncomeCategories,
} from '@/features/money/lib/money'
import { GlassCard } from '@/shared/components/GlassCard'
import { LinearProgress } from '@/shared/components/LinearProgress'
import { PrimaryButton } from '@/shared/components/PrimaryButton'
import { ScreenHeader } from '@/shared/components/ScreenHeader'
import { cn } from '@/shared/lib/cn'
import { getLocalDateKey } from '@/shared/lib/date'
import { formatCurrency, formatPercent } from '@/shared/lib/format'
import type {
  Debt,
  MoneyAccount,
  MoneyAccountType,
  MoneyCategory,
  MoneyTransaction,
  PlannedPayment,
  PlannedPaymentType,
} from '@/shared/types'
import { useMoneyStore } from '@/stores/useMoneyStore'

type SheetMode =
  | 'transaction'
  | 'account'
  | 'adjustment'
  | 'planned'
  | 'debt'
  | 'debtPayment'
  | 'monthPlan'
  | 'confirm'

interface SheetState {
  mode: SheetMode
  title: string
  transaction?: MoneyTransaction
  account?: MoneyAccount
  plannedPayment?: PlannedPayment
  debt?: Debt
  confirmText?: string
  onConfirm?: () => void
}

const inputClass =
  'min-h-12 w-full rounded-2xl border border-white/10 bg-surface/80 px-3 text-sm text-white outline-none transition placeholder:text-muted focus:border-cyan/50'
const labelClass = 'text-xs font-medium uppercase tracking-[0.16em] text-muted'
const fieldClass = 'space-y-2'

function parseAmount(value: FormDataEntryValue | null) {
  return Number(String(value ?? '').replace(',', '.'))
}

function getDefaultAccountId(accounts: MoneyAccount[]) {
  return accounts.find((account) => !account.isArchived)?.id ?? ''
}

function getAccountName(accounts: MoneyAccount[], accountId: string) {
  return accounts.find((account) => account.id === accountId)?.name ?? 'Счёт не найден'
}

function getMonthTitle(monthKey: string) {
  const date = new Date(`${monthKey}-01T12:00:00`)

  if (!Number.isFinite(date.getTime())) {
    return monthKey
  }

  return new Intl.DateTimeFormat('ru-RU', {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function isOverdue(payment: PlannedPayment) {
  return payment.status === 'planned' && payment.dueDate < getLocalDateKey()
}

function MoneySheet({
  sheet,
  children,
  onClose,
}: {
  sheet: SheetState | null
  children: ReactNode
  onClose: () => void
}) {
  return (
    <AnimatePresence>
      {sheet ? (
        <motion.div
          className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/75 p-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-[32rem] pb-20"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.22 }}
            onClick={(event) => event.stopPropagation()}
          >
            <GlassCard tone="strong" className="max-h-[88vh] overflow-auto rounded-[2rem] p-5">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-cyan/80">Деньги</p>
                  <h2 className="mt-2 font-display text-xl font-bold text-white">{sheet.title}</h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-white/10 bg-white/5 p-2 text-muted transition hover:text-white"
                  aria-label="Закрыть форму"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {children}
            </GlassCard>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-muted">
      {children}
    </div>
  )
}

function StatusPill({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'good' | 'warn' }) {
  return (
    <span
      className={cn(
        'inline-flex min-h-8 items-center rounded-full border px-3 py-1 text-xs font-medium',
        tone === 'good' && 'border-success/30 bg-success/10 text-success',
        tone === 'warn' && 'border-warning/30 bg-warning/10 text-warning',
        tone === 'default' && 'border-white/10 bg-white/5 text-muted',
      )}
    >
      {children}
    </span>
  )
}

function SevenDayBars({ values }: { values: Array<{ date: string; value: number }> }) {
  const maxAbs = Math.max(1, ...values.map((item) => Math.abs(item.value)))
  const hasData = values.some((item) => item.value !== 0)

  if (!hasData) {
    return (
      <div className="flex h-24 items-center justify-center rounded-3xl border border-white/10 bg-black/15 px-3 text-center text-xs leading-5 text-muted">
        Данных за неделю пока нет.
      </div>
    )
  }

  return (
    <div className="grid h-24 grid-cols-7 items-center gap-1 rounded-3xl border border-white/10 bg-black/15 px-3 py-2">
      {values.map((item) => {
        const height = Math.max(8, (Math.abs(item.value) / maxAbs) * 38)
        const positive = item.value >= 0

        return (
          <div key={item.date} className="flex h-full flex-col items-center justify-center gap-1">
            <div className="flex h-16 w-full flex-col justify-center">
              <span
                className={cn(
                  'block w-full rounded-full',
                  positive
                    ? 'bg-gradient-to-t from-cyan/60 to-success/90'
                    : 'bg-gradient-to-t from-warning/70 to-primary/80',
                )}
                style={{ height }}
                title={`${formatDateSafe(item.date)}: ${formatCurrency(item.value)}`}
              />
            </div>
            <span className="text-[10px] text-muted">{item.date.slice(8)}</span>
          </div>
        )
      })}
    </div>
  )
}

function AccountForm({
  account,
  onDone,
}: {
  account?: MoneyAccount
  onDone: (message: string) => void
}) {
  const addAccount = useMoneyStore((state) => state.addAccount)
  const updateAccount = useMoneyStore((state) => state.updateAccount)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting) {
      return
    }

    setIsSubmitting(true)
    const form = new FormData(event.currentTarget)
    const input = {
      name: String(form.get('name') ?? ''),
      type: String(form.get('type') ?? 'debit_card') as MoneyAccountType,
      openingBalance: parseAmount(form.get('openingBalance')),
    }
    const result = account ? updateAccount(account.id, input) : addAccount(input)

    setIsSubmitting(false)

    if (result.ok) {
      event.currentTarget.reset()
      onDone(account ? 'Счёт обновлён' : 'Счёт добавлен')
    } else {
      onDone(result.reason ?? 'Проверь данные счёта')
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className={fieldClass}>
        <label className={labelClass} htmlFor="account-name">
          Название
        </label>
        <input
          className={inputClass}
          defaultValue={account?.name}
          id="account-name"
          name="name"
          placeholder="Основная карта"
          required
        />
      </div>
      <div className={fieldClass}>
        <label className={labelClass} htmlFor="account-type">
          Тип
        </label>
        <select className={inputClass} defaultValue={account?.type ?? 'debit_card'} id="account-type" name="type">
          {Object.entries(moneyAccountTypeLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className={fieldClass}>
        <label className={labelClass} htmlFor="account-opening-balance">
          Начальный баланс
        </label>
        <input
          className={inputClass}
          defaultValue={account?.openingBalance ?? 0}
          id="account-opening-balance"
          inputMode="decimal"
          name="openingBalance"
          step="0.01"
          type="number"
        />
      </div>
      <PrimaryButton fullWidth disabled={isSubmitting} type="submit">
        {account ? 'Сохранить счёт' : 'Добавить счёт'}
      </PrimaryButton>
    </form>
  )
}

function TransactionForm({
  accounts,
  transaction,
  initialDate,
  onDone,
}: {
  accounts: MoneyAccount[]
  transaction?: MoneyTransaction
  initialDate?: string
  onDone: (message: string) => void
}) {
  const addTransaction = useMoneyStore((state) => state.addTransaction)
  const updateTransaction = useMoneyStore((state) => state.updateTransaction)
  const [type, setType] = useState<'expense' | 'income'>(
    transaction?.type === 'income' ? 'income' : 'expense',
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const categories = type === 'income' ? moneyIncomeCategories : moneyExpenseCategories

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting) {
      return
    }

    setIsSubmitting(true)
    const form = new FormData(event.currentTarget)
    const category = String(form.get('category') ?? categories[0]) as MoneyCategory
    const input = {
      accountId: String(form.get('accountId') ?? ''),
      type,
      amount: parseAmount(form.get('amount')),
      category,
      title: String(form.get('title') || moneyCategoryLabels[category]),
      transactionDate: String(form.get('transactionDate') || getLocalDateKey()),
      note: String(form.get('note') ?? ''),
    }
    const result = transaction ? updateTransaction(transaction.id, input) : addTransaction(input)

    setIsSubmitting(false)

    if (result.ok) {
      event.currentTarget.reset()
      onDone(transaction ? 'Операция обновлена' : 'Операция записана')
    } else {
      onDone(result.reason ?? 'Проверь операцию')
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid grid-cols-2 gap-2">
        {(['expense', 'income'] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setType(option)}
            className={cn(
              'min-h-12 rounded-2xl border px-3 text-sm font-medium transition',
              type === option
                ? 'border-cyan/50 bg-cyan/15 text-white'
                : 'border-white/10 bg-white/5 text-muted',
            )}
          >
            {option === 'expense' ? 'Расход' : 'Доход'}
          </button>
        ))}
      </div>
      <div className={fieldClass}>
        <label className={labelClass} htmlFor="transaction-amount">
          Сумма
        </label>
        <input
          className={inputClass}
          defaultValue={transaction?.amount ?? ''}
          id="transaction-amount"
          inputMode="decimal"
          min="0.01"
          name="amount"
          required
          step="0.01"
          type="number"
        />
      </div>
      <div className={fieldClass}>
        <label className={labelClass} htmlFor="transaction-account">
          Счёт
        </label>
        <select
          className={inputClass}
          defaultValue={transaction?.accountId ?? getDefaultAccountId(accounts)}
          id="transaction-account"
          name="accountId"
          required
        >
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      </div>
      <div className={fieldClass}>
        <label className={labelClass} htmlFor="transaction-category">
          Категория
        </label>
        <select
          className={inputClass}
          defaultValue={transaction?.category ?? categories[0]}
          id="transaction-category"
          name="category"
        >
          {categories.map((category) => (
            <option key={category} value={category}>
              {moneyCategoryLabels[category]}
            </option>
          ))}
        </select>
      </div>
      <div className={fieldClass}>
        <label className={labelClass} htmlFor="transaction-title">
          Название
        </label>
        <input
          className={inputClass}
          defaultValue={transaction?.title}
          id="transaction-title"
          name="title"
          placeholder="Можно оставить пустым"
        />
      </div>
      <div className={fieldClass}>
        <label className={labelClass} htmlFor="transaction-date">
          Дата
        </label>
        <input
          className={inputClass}
          defaultValue={transaction?.transactionDate ?? initialDate ?? getLocalDateKey()}
          id="transaction-date"
          name="transactionDate"
          required
          type="date"
        />
      </div>
      <div className={fieldClass}>
        <label className={labelClass} htmlFor="transaction-note">
          Заметка
        </label>
        <textarea
          className={cn(inputClass, 'min-h-24 py-3')}
          defaultValue={transaction?.note}
          id="transaction-note"
          name="note"
          placeholder="Необязательно"
        />
      </div>
      <PrimaryButton fullWidth disabled={isSubmitting || accounts.length === 0} type="submit">
        {transaction ? 'Сохранить операцию' : 'Добавить операцию'}
      </PrimaryButton>
    </form>
  )
}

function BalanceAdjustmentForm({
  accounts,
  onDone,
}: {
  accounts: MoneyAccount[]
  onDone: (message: string) => void
}) {
  const transactions = useMoneyStore((state) => state.transactions)
  const recordBalanceAdjustment = useMoneyStore((state) => state.recordBalanceAdjustment)
  const [accountId, setAccountId] = useState(getDefaultAccountId(accounts))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const account = accounts.find((item) => item.id === accountId)
  const calculatedBalance = account ? getAccountBalance(account, transactions) : 0

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting) {
      return
    }

    setIsSubmitting(true)
    const form = new FormData(event.currentTarget)
    const result = recordBalanceAdjustment(String(form.get('accountId') ?? ''), parseAmount(form.get('actualBalance')))
    setIsSubmitting(false)

    onDone(result.reason ?? (result.ok ? 'Баланс проверен' : 'Проверь фактический баланс'))
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className={fieldClass}>
        <label className={labelClass} htmlFor="adjust-account">
          Счёт
        </label>
        <select
          className={inputClass}
          id="adjust-account"
          name="accountId"
          value={accountId}
          onChange={(event) => setAccountId(event.target.value)}
        >
          {accounts.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      <div className="rounded-3xl border border-cyan/15 bg-cyan/5 p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-cyan/80">Расчётный баланс</p>
        <p className="mt-2 font-display text-2xl font-bold text-white">
          {formatCurrency(calculatedBalance)}
        </p>
      </div>
      <div className={fieldClass}>
        <label className={labelClass} htmlFor="actual-balance">
          Фактический баланс
        </label>
        <input
          className={inputClass}
          id="actual-balance"
          inputMode="decimal"
          name="actualBalance"
          required
          step="0.01"
          type="number"
        />
      </div>
      <PrimaryButton fullWidth disabled={isSubmitting || accounts.length === 0} type="submit">
        Сверить баланс
      </PrimaryButton>
    </form>
  )
}

function PlannedPaymentForm({
  accounts,
  payment,
  onDone,
}: {
  accounts: MoneyAccount[]
  payment?: PlannedPayment
  onDone: (message: string) => void
}) {
  const addPlannedPayment = useMoneyStore((state) => state.addPlannedPayment)
  const updatePlannedPayment = useMoneyStore((state) => state.updatePlannedPayment)
  const [type, setType] = useState<PlannedPaymentType>(payment?.type ?? 'expense')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const categories = type === 'income' ? moneyIncomeCategories : moneyExpenseCategories

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting) {
      return
    }

    setIsSubmitting(true)
    const form = new FormData(event.currentTarget)
    const input = {
      title: String(form.get('title') ?? ''),
      amount: parseAmount(form.get('amount')),
      type,
      category: String(form.get('category') ?? categories[0]) as MoneyCategory,
      accountId: String(form.get('accountId') ?? '') || undefined,
      dueDate: String(form.get('dueDate') ?? ''),
      note: String(form.get('note') ?? ''),
      isMandatory: form.get('isMandatory') === 'on',
      repeatMonthly: form.get('repeatMonthly') === 'on',
    }
    const result = payment ? updatePlannedPayment(payment.id, input) : addPlannedPayment(input)

    setIsSubmitting(false)

    if (result.ok) {
      event.currentTarget.reset()
      onDone(payment ? 'Платёж обновлён' : 'Платёж запланирован')
    } else {
      onDone(result.reason ?? 'Проверь платёж')
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid grid-cols-2 gap-2">
        {(['expense', 'income'] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setType(option)}
            className={cn(
              'min-h-12 rounded-2xl border px-3 text-sm font-medium transition',
              type === option ? 'border-cyan/50 bg-cyan/15 text-white' : 'border-white/10 bg-white/5 text-muted',
            )}
          >
            {option === 'expense' ? 'Расход' : 'Доход'}
          </button>
        ))}
      </div>
      <div className={fieldClass}>
        <label className={labelClass} htmlFor="planned-title">
          Название
        </label>
        <input className={inputClass} defaultValue={payment?.title} id="planned-title" name="title" required />
      </div>
      <div className={fieldClass}>
        <label className={labelClass} htmlFor="planned-amount">
          Сумма
        </label>
        <input
          className={inputClass}
          defaultValue={payment?.amount ?? ''}
          id="planned-amount"
          min="0.01"
          name="amount"
          required
          step="0.01"
          type="number"
        />
      </div>
      <div className={fieldClass}>
        <label className={labelClass} htmlFor="planned-category">
          Категория
        </label>
        <select className={inputClass} defaultValue={payment?.category ?? categories[0]} id="planned-category" name="category">
          {categories.map((category) => (
            <option key={category} value={category}>
              {moneyCategoryLabels[category]}
            </option>
          ))}
        </select>
      </div>
      <div className={fieldClass}>
        <label className={labelClass} htmlFor="planned-account">
          Счёт
        </label>
        <select className={inputClass} defaultValue={payment?.accountId ?? ''} id="planned-account" name="accountId">
          <option value="">Выбрать при оплате</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      </div>
      <div className={fieldClass}>
        <label className={labelClass} htmlFor="planned-date">
          Дата
        </label>
        <input
          className={inputClass}
          defaultValue={payment?.dueDate ?? getLocalDateKey()}
          id="planned-date"
          name="dueDate"
          required
          type="date"
        />
      </div>
      <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 text-sm text-white">
        <input defaultChecked={payment?.isMandatory} name="isMandatory" type="checkbox" />
        Обязательный платёж
      </label>
      <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 text-sm text-white">
        <input defaultChecked={payment?.repeatMonthly} name="repeatMonthly" type="checkbox" />
        Повторять каждый месяц
      </label>
      <div className={fieldClass}>
        <label className={labelClass} htmlFor="planned-note">
          Заметка
        </label>
        <textarea className={cn(inputClass, 'min-h-20 py-3')} defaultValue={payment?.note} id="planned-note" name="note" />
      </div>
      <PrimaryButton fullWidth disabled={isSubmitting} type="submit">
        {payment ? 'Сохранить платёж' : 'Добавить платёж'}
      </PrimaryButton>
    </form>
  )
}

function DebtForm({ debt, onDone }: { debt?: Debt; onDone: (message: string) => void }) {
  const addDebt = useMoneyStore((state) => state.addDebt)
  const updateDebt = useMoneyStore((state) => state.updateDebt)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting) {
      return
    }

    setIsSubmitting(true)
    const form = new FormData(event.currentTarget)
    const input = {
      title: String(form.get('title') ?? ''),
      originalAmount: parseAmount(form.get('originalAmount')),
      remainingAmount: parseAmount(form.get('remainingAmount')),
      minimumPayment: parseAmount(form.get('minimumPayment')) || undefined,
      nextPaymentDate: String(form.get('nextPaymentDate') ?? '') || undefined,
      note: String(form.get('note') ?? ''),
    }
    const result = debt ? updateDebt(debt.id, input) : addDebt(input)

    setIsSubmitting(false)

    if (result.ok) {
      event.currentTarget.reset()
      onDone(debt ? 'Долг обновлён' : 'Долг добавлен')
    } else {
      onDone(result.reason ?? 'Проверь долг')
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className={fieldClass}>
        <label className={labelClass} htmlFor="debt-title">
          Название
        </label>
        <input className={inputClass} defaultValue={debt?.title} id="debt-title" name="title" required />
      </div>
      <div className={fieldClass}>
        <label className={labelClass} htmlFor="debt-original">
          Было изначально
        </label>
        <input
          className={inputClass}
          defaultValue={debt?.originalAmount ?? ''}
          id="debt-original"
          min="0.01"
          name="originalAmount"
          required
          step="0.01"
          type="number"
        />
      </div>
      <div className={fieldClass}>
        <label className={labelClass} htmlFor="debt-remaining">
          Осталось
        </label>
        <input
          className={inputClass}
          defaultValue={debt?.remainingAmount ?? ''}
          id="debt-remaining"
          min="0"
          name="remainingAmount"
          required
          step="0.01"
          type="number"
        />
      </div>
      <div className={fieldClass}>
        <label className={labelClass} htmlFor="debt-minimum">
          Минимальный платёж
        </label>
        <input
          className={inputClass}
          defaultValue={debt?.minimumPayment ?? ''}
          id="debt-minimum"
          min="0"
          name="minimumPayment"
          step="0.01"
          type="number"
        />
      </div>
      <div className={fieldClass}>
        <label className={labelClass} htmlFor="debt-next-date">
          Следующая дата
        </label>
        <input className={inputClass} defaultValue={debt?.nextPaymentDate} id="debt-next-date" name="nextPaymentDate" type="date" />
      </div>
      <div className={fieldClass}>
        <label className={labelClass} htmlFor="debt-note">
          Заметка
        </label>
        <textarea className={cn(inputClass, 'min-h-20 py-3')} defaultValue={debt?.note} id="debt-note" name="note" />
      </div>
      <PrimaryButton fullWidth disabled={isSubmitting} type="submit">
        {debt ? 'Сохранить долг' : 'Добавить долг'}
      </PrimaryButton>
    </form>
  )
}

function DebtPaymentForm({
  accounts,
  debt,
  onDone,
}: {
  accounts: MoneyAccount[]
  debt: Debt
  onDone: (message: string) => void
}) {
  const recordDebtPayment = useMoneyStore((state) => state.recordDebtPayment)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [idempotencyKey] = useState(() => `debt-payment-${debt.id}-${Date.now()}`)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting) {
      return
    }

    setIsSubmitting(true)
    const form = new FormData(event.currentTarget)
    const result = recordDebtPayment({
      debtId: debt.id,
      accountId: String(form.get('accountId') ?? ''),
      amount: parseAmount(form.get('amount')),
      paymentDate: String(form.get('paymentDate') ?? getLocalDateKey()),
      idempotencyKey,
    })
    setIsSubmitting(false)

    if (result.ok) {
      event.currentTarget.reset()
      onDone('Платёж по долгу записан')
    } else {
      onDone(result.reason ?? 'Проверь платёж')
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="rounded-3xl border border-warning/20 bg-warning/10 p-4">
        <p className="text-sm text-muted">Осталось по долгу</p>
        <p className="mt-1 font-display text-2xl font-bold text-white">{formatCurrency(debt.remainingAmount)}</p>
      </div>
      <div className={fieldClass}>
        <label className={labelClass} htmlFor="debt-payment-account">
          Счёт
        </label>
        <select className={inputClass} defaultValue={getDefaultAccountId(accounts)} id="debt-payment-account" name="accountId">
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      </div>
      <div className={fieldClass}>
        <label className={labelClass} htmlFor="debt-payment-amount">
          Сумма
        </label>
        <input
          className={inputClass}
          defaultValue={debt.minimumPayment ?? ''}
          id="debt-payment-amount"
          min="0.01"
          name="amount"
          required
          step="0.01"
          type="number"
        />
      </div>
      <div className={fieldClass}>
        <label className={labelClass} htmlFor="debt-payment-date">
          Дата
        </label>
        <input className={inputClass} defaultValue={getLocalDateKey()} id="debt-payment-date" name="paymentDate" required type="date" />
      </div>
      <PrimaryButton fullWidth disabled={isSubmitting || accounts.length === 0} type="submit">
        Записать платёж
      </PrimaryButton>
    </form>
  )
}

function MonthlyPlanForm({ month, onDone }: { month: string; onDone: (message: string) => void }) {
  const monthlyPlans = useMoneyStore((state) => state.monthlyPlans)
  const setMonthlyPlan = useMoneyStore((state) => state.setMonthlyPlan)
  const plan = getMonthlyPlan(monthlyPlans, month)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting) {
      return
    }

    setIsSubmitting(true)
    const form = new FormData(event.currentTarget)
    const result = setMonthlyPlan({
      month,
      expectedIncome: parseAmount(form.get('expectedIncome')) || 0,
      mandatoryExpenses: parseAmount(form.get('mandatoryExpenses')) || 0,
      debtPaymentTarget: parseAmount(form.get('debtPaymentTarget')) || 0,
      savingsTarget: parseAmount(form.get('savingsTarget')) || 0,
      flexibleSpendingLimit: parseAmount(form.get('flexibleSpendingLimit')) || 0,
      note: String(form.get('note') ?? ''),
    })
    setIsSubmitting(false)

    onDone(result.ok ? 'План месяца сохранён' : result.reason ?? 'Проверь план')
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {[
        ['expectedIncome', 'Ожидаемый доход', plan?.expectedIncome],
        ['mandatoryExpenses', 'Обязательные расходы', plan?.mandatoryExpenses],
        ['debtPaymentTarget', 'Платёж по долгам', plan?.debtPaymentTarget],
        ['savingsTarget', 'Цель накоплений', plan?.savingsTarget],
        ['flexibleSpendingLimit', 'Лимит гибких расходов', plan?.flexibleSpendingLimit],
      ].map(([name, label, value]) => (
        <div className={fieldClass} key={String(name)}>
          <label className={labelClass} htmlFor={`plan-${name}`}>
            {label}
          </label>
          <input
            className={inputClass}
            defaultValue={value as number | undefined}
            id={`plan-${name}`}
            min="0"
            name={String(name)}
            step="0.01"
            type="number"
          />
        </div>
      ))}
      <div className={fieldClass}>
        <label className={labelClass} htmlFor="plan-note">
          Заметка
        </label>
        <textarea className={cn(inputClass, 'min-h-20 py-3')} defaultValue={plan?.note} id="plan-note" name="note" />
      </div>
      <PrimaryButton fullWidth disabled={isSubmitting} type="submit">
        Сохранить план
      </PrimaryButton>
    </form>
  )
}

function ConfirmForm({ text, onConfirm, onDone }: { text: string; onConfirm: () => void; onDone: (message: string) => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleConfirm = () => {
    if (isSubmitting) {
      return
    }

    setIsSubmitting(true)
    onConfirm()
    setIsSubmitting(false)
    onDone('Действие выполнено')
  }

  return (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-slate-200">{text}</p>
      <PrimaryButton fullWidth disabled={isSubmitting} tone="warning" onClick={handleConfirm}>
        Подтвердить
      </PrimaryButton>
    </div>
  )
}

export function MoneyScreen() {
  const state = useMoneyStore()
  const [sheet, setSheet] = useState<SheetState | null>(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<'all' | 'income' | 'expense' | 'adjustment'>('all')
  const [accountFilter, setAccountFilter] = useState('all')
  const activeAccounts = state.accounts.filter((account) => !account.isArchived)
  const currentMonth = getMonthKey()
  const totalBalance = getTotalBalance(state.accounts, state.transactions)
  const weeklyDelta = getWeeklyDelta(state.transactions)
  const sevenDayBars = getSevenDayMoneyBars(state.transactions)
  const debtSummary = getDebtSummary(state.debts)
  const monthPlan = getMonthlyPlan(state.monthlyPlans, currentMonth)
  const projection = getMonthlyPlanProjection(state, currentMonth)
  const monthTotals = getMonthTotals(state.transactions, currentMonth)
  const calmNote = getMoneyCalmNote(state, currentMonth)
  const suggestedActions = getSuggestedMoneyActions(state)
  const recentTransactions = useMemo(() => {
    return state.transactions
      .filter((transaction) => transactionTypeFilter === 'all' || transaction.type === transactionTypeFilter)
      .filter((transaction) => accountFilter === 'all' || transaction.accountId === accountFilter)
      .sort((left, right) => right.transactionDate.localeCompare(left.transactionDate))
      .slice(0, 10)
  }, [accountFilter, state.transactions, transactionTypeFilter])
  const upcomingPayments = [...state.plannedPayments]
    .filter((payment) => payment.status === 'planned' || payment.dueDate.startsWith(currentMonth))
    .sort((left, right) => left.dueDate.localeCompare(right.dueDate))
    .slice(0, 8)

  const showStatus = (message: string) => {
    setStatusMessage(message)
    window.setTimeout(() => setStatusMessage(''), 1800)
    setSheet(null)
  }

  const openSuggestedAction = (action: ReturnType<typeof getSuggestedMoneyActions>[number]) => {
    if (action.action === 'balance_check') {
      setSheet({ mode: 'adjustment', title: 'Проверить баланс счёта' })
      return
    }

    if (action.action === 'add_yesterday_expense') {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      setSheet({
        mode: 'transaction',
        title: 'Записать вчерашние траты',
        transaction: undefined,
      })
      return
    }

    if (action.action === 'plan_debt_payment' || action.action === 'check_payment') {
      setSheet({ mode: 'planned', title: 'Добавить платёж' })
      return
    }

    setSheet({ mode: 'monthPlan', title: monthPlan ? 'Изменить план' : 'Создать план' })
  }

  const renderSheetContent = () => {
    if (!sheet) {
      return null
    }

    switch (sheet.mode) {
      case 'transaction':
        return (
          <TransactionForm
            accounts={activeAccounts}
            transaction={sheet.transaction}
            onDone={showStatus}
          />
        )
      case 'account':
        return <AccountForm account={sheet.account} onDone={showStatus} />
      case 'adjustment':
        return <BalanceAdjustmentForm accounts={activeAccounts} onDone={showStatus} />
      case 'planned':
        return (
          <PlannedPaymentForm
            accounts={activeAccounts}
            payment={sheet.plannedPayment}
            onDone={showStatus}
          />
        )
      case 'debt':
        return <DebtForm debt={sheet.debt} onDone={showStatus} />
      case 'debtPayment':
        return sheet.debt ? (
          <DebtPaymentForm accounts={activeAccounts} debt={sheet.debt} onDone={showStatus} />
        ) : null
      case 'monthPlan':
        return <MonthlyPlanForm month={currentMonth} onDone={showStatus} />
      case 'confirm':
        return sheet.onConfirm ? (
          <ConfirmForm
            text={sheet.confirmText ?? 'Подтвердить действие?'}
            onConfirm={sheet.onConfirm}
            onDone={showStatus}
          />
        ) : null
      default:
        return null
    }
  }

  return (
    <section className="overflow-x-hidden pb-24">
      <ScreenHeader
        title="Деньги"
        subtitle="Спокойная панель контроля денег. Без паники, только ясность и маленькие действия."
      />

      {statusMessage ? (
        <div className="mb-4 rounded-full border border-success/25 bg-success/10 px-4 py-2 text-sm text-success">
          {statusMessage}
        </div>
      ) : null}

      <GlassCard tone="strong" className="mb-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan/80">Баланс</p>
            <p className="mt-3 font-display text-4xl font-bold text-white">
              {formatCurrency(totalBalance)}
            </p>
            <p className={cn('mt-2 text-sm', weeklyDelta >= 0 ? 'text-success' : 'text-warning')}>
              {weeklyDelta >= 0 ? '+' : ''}
              {formatCurrency(weeklyDelta)} за 7 дней
            </p>
          </div>
          <PrimaryButton
            aria-label="Добавить операцию"
            className="shrink-0 px-3"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => setSheet({ mode: 'transaction', title: 'Добавить операцию' })}
          >
            Операция
          </PrimaryButton>
        </div>
        <div className="mt-4">
          <SevenDayBars values={sevenDayBars} />
        </div>
      </GlassCard>

      <GlassCard className="mb-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-primary/80">Счета</p>
            <p className="mt-1 text-sm text-muted">Текущий баланс считается из операций.</p>
          </div>
          <PrimaryButton
            tone="secondary"
            icon={<Wallet className="h-4 w-4" />}
            onClick={() => setSheet({ mode: 'account', title: 'Добавить счёт' })}
          >
            Счёт
          </PrimaryButton>
        </div>
        {activeAccounts.length ? (
          <div className="space-y-3">
            {activeAccounts.map((account) => (
              <div key={account.id} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words font-medium text-white">{account.name}</p>
                    <p className="mt-1 text-sm text-muted">{moneyAccountTypeLabels[account.type]}</p>
                  </div>
                  <p className="shrink-0 font-display text-xl font-bold text-white">
                    {formatCurrency(getAccountBalance(account, state.transactions))}
                  </p>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    className="min-h-11 rounded-2xl border border-white/10 bg-white/5 px-2 text-xs text-muted transition hover:text-white"
                    onClick={() => setSheet({ mode: 'account', title: 'Изменить счёт', account })}
                  >
                    Изменить
                  </button>
                  <button
                    type="button"
                    className="min-h-11 rounded-2xl border border-cyan/20 bg-cyan/10 px-2 text-xs text-cyan transition hover:bg-cyan/15"
                    onClick={() => setSheet({ mode: 'adjustment', title: 'Проверить баланс' })}
                  >
                    Сверить
                  </button>
                  <button
                    type="button"
                    className="min-h-11 rounded-2xl border border-warning/20 bg-warning/10 px-2 text-xs text-warning transition hover:bg-warning/15"
                    onClick={() =>
                      setSheet({
                        mode: 'confirm',
                        title: 'Архивировать счёт',
                        confirmText: `Счёт «${account.name}» исчезнет из основного списка, но операции сохранятся.`,
                        onConfirm: () => {
                          const result = state.archiveAccount(account.id)
                          showStatus(result.ok ? 'Счёт архивирован' : result.reason ?? 'Счёт не найден')
                        },
                      })
                    }
                  >
                    Архив
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState>Добавь первый счёт или наличные, чтобы увидеть реальный баланс.</EmptyState>
        )}
      </GlassCard>

      <GlassCard className="mb-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-warning/80">Долги</p>
            <p className="mt-2 font-display text-3xl font-bold text-white">
              {formatCurrency(debtSummary.remainingDebt)}
            </p>
          </div>
          <PrimaryButton tone="secondary" icon={<Plus className="h-4 w-4" />} onClick={() => setSheet({ mode: 'debt', title: 'Добавить долг' })}>
            Долг
          </PrimaryButton>
        </div>
        <div className="mb-4 flex flex-wrap gap-2">
          <StatusPill tone={debtSummary.remainingDebt === 0 ? 'good' : 'warn'}>
            {formatPercent(debtSummary.progress)} закрыто
          </StatusPill>
          <StatusPill>
            Ближайший платёж: {debtSummary.nextPayment?.nextPaymentDate ? formatDateSafe(debtSummary.nextPayment.nextPaymentDate) : 'не указан'}
          </StatusPill>
        </div>
        {debtSummary.activeDebts.length ? (
          <div className="space-y-3">
            {debtSummary.activeDebts.map((debt) => (
              <div key={debt.id} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words font-medium text-white">{debt.title}</p>
                    <p className="mt-1 text-sm text-muted">
                      Осталось {formatCurrency(debt.remainingAmount)} из {formatCurrency(debt.originalAmount)}
                    </p>
                  </div>
                  <StatusPill tone="warn">{formatPercent(getDebtProgress(debt))}</StatusPill>
                </div>
                <LinearProgress
                  value={getDebtProgress(debt)}
                  className="mt-3"
                  barClassName="bg-gradient-to-r from-warning via-amber-300 to-cyan"
                />
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-muted">
                  <span>Мин. платёж: {debt.minimumPayment ? formatCurrency(debt.minimumPayment) : 'не указан'}</span>
                  <span>Дата: {debt.nextPaymentDate ? formatDateSafe(debt.nextPaymentDate) : 'не указана'}</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    className="min-h-11 rounded-2xl border border-cyan/20 bg-cyan/10 px-2 text-xs text-cyan"
                    onClick={() => setSheet({ mode: 'debtPayment', title: 'Записать платёж', debt })}
                  >
                    Платёж
                  </button>
                  <button
                    type="button"
                    className="min-h-11 rounded-2xl border border-white/10 bg-white/5 px-2 text-xs text-muted"
                    onClick={() => setSheet({ mode: 'debt', title: 'Изменить долг', debt })}
                  >
                    Изменить
                  </button>
                  <button
                    type="button"
                    className="min-h-11 rounded-2xl border border-warning/20 bg-warning/10 px-2 text-xs text-warning"
                    onClick={() =>
                      setSheet({
                        mode: 'confirm',
                        title: 'Удалить долг',
                        confirmText: 'Удаление возможно только если по долгу ещё нет связанных операций.',
                        onConfirm: () => {
                          const result = state.deleteDebt(debt.id)
                          showStatus(result.ok ? 'Долг удалён' : result.reason ?? 'Долг не удалён')
                        },
                      })
                    }
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState>Активных долгов нет.</EmptyState>
        )}
      </GlassCard>

      <GlassCard className="mb-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan/80">План месяца</p>
            <h2 className="mt-2 font-display text-xl font-bold text-white">{getMonthTitle(currentMonth)}</h2>
          </div>
          <PrimaryButton
            tone="secondary"
            icon={<SlidersHorizontal className="h-4 w-4" />}
            onClick={() => setSheet({ mode: 'monthPlan', title: monthPlan ? 'Изменить план' : 'Создать план' })}
          >
            {monthPlan ? 'Изменить' : 'Создать'}
          </PrimaryButton>
        </div>
        {monthPlan ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-xs text-muted">Ожидаемый доход</p>
                <p className="mt-1 font-semibold text-white">{formatCurrency(monthPlan.expectedIncome)}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-xs text-muted">Обязательные расходы</p>
                <p className="mt-1 font-semibold text-white">{formatCurrency(monthPlan.mandatoryExpenses)}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-xs text-muted">Платёж по долгам</p>
                <p className="mt-1 font-semibold text-white">{formatCurrency(monthPlan.debtPaymentTarget)}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-xs text-muted">Цель накоплений</p>
                <p className="mt-1 font-semibold text-white">{formatCurrency(monthPlan.savingsTarget)}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <StatusPill>Всего: {formatCurrency(projection.plannedTotal)}</StatusPill>
              <StatusPill>Обязательства: {formatCurrency(projection.plannedCommitments)}</StatusPill>
              <StatusPill tone={projection.safeToSpend >= 0 ? 'good' : 'warn'}>
                Свободно: {formatCurrency(projection.safeToSpend)}
              </StatusPill>
              <StatusPill>Прогноз: {formatCurrency(projection.estimatedMonthEnd)}</StatusPill>
            </div>
          </>
        ) : (
          <EmptyState>Создай простой план на текущий месяц.</EmptyState>
        )}
      </GlassCard>

      <GlassCard className="mb-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-primary/80">Ближайшие платежи</p>
            <p className="mt-1 text-sm text-muted">Плановые доходы и расходы без автосписаний.</p>
          </div>
          <PrimaryButton tone="secondary" icon={<Plus className="h-4 w-4" />} onClick={() => setSheet({ mode: 'planned', title: 'Добавить платёж' })}>
            Платёж
          </PrimaryButton>
        </div>
        {upcomingPayments.length ? (
          <div className="space-y-3">
            {upcomingPayments.map((payment) => (
              <div key={payment.id} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words font-medium text-white">{payment.title}</p>
                    <p className="mt-1 text-sm text-muted">
                      {formatDateSafe(payment.dueDate)} · {payment.isMandatory ? 'обязательный' : 'необязательный'}
                    </p>
                    {isOverdue(payment) ? <p className="mt-1 text-xs text-warning">Дата платежа прошла</p> : null}
                  </div>
                  <div className="text-right">
                    <p className={cn('font-semibold', payment.type === 'income' ? 'text-success' : 'text-white')}>
                      {payment.type === 'income' ? '+' : '-'}
                      {formatCurrency(payment.amount)}
                    </p>
                    <StatusPill>{payment.status === 'planned' ? 'План' : payment.status === 'completed' ? 'Оплачен' : 'Пропущен'}</StatusPill>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <button
                    type="button"
                    className="min-h-11 rounded-2xl border border-success/20 bg-success/10 px-2 text-xs text-success"
                    disabled={payment.status !== 'planned'}
                    onClick={() => {
                      const result = state.completePlannedPayment(payment.id, getDefaultAccountId(activeAccounts))
                      showStatus(result.ok ? 'Платёж отмечен' : result.reason ?? 'Платёж не завершён')
                    }}
                  >
                    Оплачено
                  </button>
                  <button
                    type="button"
                    className="min-h-11 rounded-2xl border border-white/10 bg-white/5 px-2 text-xs text-muted"
                    disabled={payment.status !== 'planned'}
                    onClick={() => setSheet({ mode: 'planned', title: 'Изменить платёж', plannedPayment: payment })}
                  >
                    Изменить
                  </button>
                  <button
                    type="button"
                    className="min-h-11 rounded-2xl border border-warning/20 bg-warning/10 px-2 text-xs text-warning"
                    disabled={payment.status !== 'planned'}
                    onClick={() => {
                      const result = state.skipPlannedPayment(payment.id)
                      showStatus(result.ok ? 'Платёж пропущен' : result.reason ?? 'Платёж не обновлён')
                    }}
                  >
                    Пропустить
                  </button>
                  <button
                    type="button"
                    className="min-h-11 rounded-2xl border border-white/10 bg-white/5 px-2 text-xs text-muted"
                    onClick={() =>
                      setSheet({
                        mode: 'confirm',
                        title: 'Удалить платёж',
                        confirmText: 'Завершённый платёж со связанной операцией удалить нельзя.',
                        onConfirm: () => {
                          const result = state.deletePlannedPayment(payment.id)
                          showStatus(result.ok ? 'Платёж удалён' : result.reason ?? 'Платёж не удалён')
                        },
                      })
                    }
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState>Запланированных платежей пока нет.</EmptyState>
        )}
      </GlassCard>

      <GlassCard className="mb-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan/80">Последние операции</p>
            <p className="mt-1 text-sm text-muted">
              Месяц: доходы {formatCurrency(monthTotals.income)}, расходы {formatCurrency(monthTotals.expense)}
            </p>
          </div>
          <CircleDollarSign className="h-5 w-5 text-cyan" />
        </div>
        <div className="mb-4 grid grid-cols-2 gap-2">
          <select
            aria-label="Фильтр операций по типу"
            className={inputClass}
            value={transactionTypeFilter}
            onChange={(event) => setTransactionTypeFilter(event.target.value as typeof transactionTypeFilter)}
          >
            <option value="all">Все типы</option>
            <option value="income">Доход</option>
            <option value="expense">Расход</option>
            <option value="adjustment">Корректировка</option>
          </select>
          <select
            aria-label="Фильтр операций по счёту"
            className={inputClass}
            value={accountFilter}
            onChange={(event) => setAccountFilter(event.target.value)}
          >
            <option value="all">Все счета</option>
            {state.accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </div>
        {recentTransactions.length ? (
          <div className="space-y-3">
            {recentTransactions.map((transaction) => (
              <div key={transaction.id} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words font-medium text-white">{transaction.title}</p>
                    <p className="mt-1 text-sm text-muted">
                      {moneyCategoryLabels[transaction.category]} · {getAccountName(state.accounts, transaction.accountId)} · {formatDateSafe(transaction.transactionDate)}
                    </p>
                    {transaction.note ? <p className="mt-2 break-words text-sm text-slate-300">{transaction.note}</p> : null}
                  </div>
                  <p
                    className={cn(
                      'shrink-0 font-semibold',
                      transaction.type === 'income' && 'text-success',
                      transaction.type === 'expense' && 'text-white',
                      transaction.type === 'adjustment' && 'text-cyan',
                    )}
                  >
                    {transaction.type === 'income'
                      ? '+'
                      : transaction.type === 'adjustment' && transaction.adjustmentDirection !== 'decrease'
                        ? '+'
                        : '-'}
                    {formatCurrency(transaction.amount)}
                  </p>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    className="inline-flex min-h-10 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 text-xs text-muted"
                    onClick={() => setSheet({ mode: 'transaction', title: 'Изменить операцию', transaction })}
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Изменить
                  </button>
                  <button
                    type="button"
                    className="inline-flex min-h-10 items-center gap-2 rounded-2xl border border-warning/20 bg-warning/10 px-3 text-xs text-warning"
                    onClick={() =>
                      setSheet({
                        mode: 'confirm',
                        title: 'Удалить операцию',
                        confirmText: 'Связанные операции по долгам и плановым платежам удалять нельзя.',
                        onConfirm: () => {
                          const result = state.deleteTransaction(transaction.id)
                          showStatus(result.ok ? 'Операция удалена' : result.reason ?? 'Операция не удалена')
                        },
                      })
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState>Операций пока нет.</EmptyState>
        )}
      </GlassCard>

      <GlassCard className="mb-5">
        <p className="text-xs uppercase tracking-[0.24em] text-primary/80">Маленькие действия</p>
        <div className="mt-4 space-y-3">
          {suggestedActions.length ? (
            suggestedActions.map((action) => (
              <button
                key={action.id}
                type="button"
                className="flex w-full items-center justify-between gap-3 rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-cyan/30 hover:bg-white/[0.06]"
                onClick={() => openSuggestedAction(action)}
              >
                <div>
                  <p className="font-medium text-white">{action.title}</p>
                  <p className="mt-1 text-sm leading-6 text-muted">{action.description}</p>
                </div>
                <Check className="h-5 w-5 shrink-0 text-cyan" />
              </button>
            ))
          ) : (
            <EmptyState>На сейчас достаточно одного спокойного финансового шага.</EmptyState>
          )}
        </div>
      </GlassCard>

      <GlassCard className="border border-cyan/15 bg-cyan/5">
        <p className="text-xs uppercase tracking-[0.24em] text-cyan/80">Спокойная заметка</p>
        <p className="mt-3 text-sm leading-6 text-slate-200">{calmNote}</p>
      </GlassCard>

      <MoneySheet sheet={sheet} onClose={() => setSheet(null)}>
        {renderSheetContent()}
      </MoneySheet>
    </section>
  )
}
