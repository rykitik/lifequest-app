import {
  countImportDuplicates,
  createId,
  moneyCategoryLabels,
  type MoneyImportPreview,
  normalizeMoneyValue,
} from '@/features/money/lib/money'
import type {
  MoneyAccount,
  MoneyCategory,
  MoneyTransaction,
  MoneyTransactionSource,
} from '@/shared/types'

interface ParsedStatementMeta {
  accountLast4?: string
  creditLimit?: number
  debt?: number
  endBalance?: number
  openingBalance?: number
  periodEnd?: string
  periodStart?: string
}

interface ParsedAmount {
  amount: number
  hasCurrency: boolean
  isIncome: boolean
  isSigned: boolean
  raw: string
}

const amountPattern = /([+-]?\s*\d[\d\s\u00a0]*(?:[,.]\d{1,2})?)\s*(₽|руб\.?|RUB)?/gi
const operationDatePattern = /^(\d{2}\.\d{2}(?:\.\d{4})?)\s+(.+)$/

function normalizeText(text: string) {
  return text
    .replace(/\u00a0/g, ' ')
    .replace(/[−–—]/g, '-')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
}

function dateFromRu(value: string, fallbackYear?: string) {
  const parts = value.split('.')
  const [day, month, year = fallbackYear] = parts

  if (!day || !month || !year) {
    return null
  }

  const dateKey = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  const time = Date.parse(`${dateKey}T12:00:00`)

  return Number.isFinite(time) ? dateKey : null
}

function parseMoneyValue(value: string) {
  const normalized = value.replace(/\s/g, '').replace(',', '.').replace(/^\+/, '')

  return normalizeMoneyValue(normalized)
}

function extractAmountTokens(text: string) {
  const tokens: ParsedAmount[] = []
  let match: RegExpExecArray | null

  amountPattern.lastIndex = 0

  while ((match = amountPattern.exec(text))) {
    const raw = match[1] ?? ''
    const amount = parseMoneyValue(raw)

    if (amount !== null && amount > 0) {
      const trimmedRaw = raw.trim()

      tokens.push({
        amount,
        hasCurrency: Boolean(match[2]),
        isIncome: trimmedRaw.startsWith('+'),
        isSigned: /^[+-]/.test(trimmedRaw),
        raw,
      })
    }
  }

  return tokens
}

function extractSignedAmountToken(text: string): ParsedAmount | null {
  const match = text.match(/([+-]\s*\d[\d\s\u00a0]*(?:[,.]\d{1,2})?)\s*(₽|руб\.?|RUB)?/i)
  const raw = match?.[1] ?? ''
  const amount = raw ? parseMoneyValue(raw) : null

  if (amount === null || amount === 0) {
    return null
  }

  return {
    amount: Math.abs(amount),
    hasCurrency: Boolean(match?.[2]),
    isIncome: raw.trim().startsWith('+'),
    isSigned: true,
    raw,
  }
}

function extractLabelAmount(text: string, labels: string[]) {
  for (const label of labels) {
    const regex = new RegExp(`${label}[^\\d+-]*([+-]?\\s*\\d[\\d\\s\\u00a0]*(?:[,.]\\d{1,2})?)`, 'i')
    const match = text.match(regex)
    const amount = match?.[1] ? parseMoneyValue(match[1]) : null

    if (amount !== null && amount >= 0) {
      return amount
    }
  }

  return undefined
}

function extractMeta(text: string): ParsedStatementMeta {
  const periodMatch = text.match(/За период\s+(\d{2}\.\d{2}\.\d{4})\s*-\s*(\d{2}\.\d{2}\.\d{4})/i)
  const maskedCardLast4Match = text.match(
    /(?:карта|карты|карт[аеы]|MIR|МИР|Visa|Mastercard)[^\n]{0,120}?(?:\*{2,}|•{1,}|[xXхХ]{2,})\s*(\d{4})/i,
  )
  const accountLast4Match =
    maskedCardLast4Match ??
    text.match(/(?:карта|карты|сч[её]т|сч[её]та|MIR|МИР|Visa|Mastercard)[^\n\d]{0,40}(?:\*{2,}|[xXхХ]{2,}|№)?\s*(\d{4})/i) ??
    text.match(/(?:\*{4}|[xXхХ]{4}|••••)\s*(\d{4})/)

  return {
    accountLast4: accountLast4Match?.[1],
    creditLimit: extractLabelAmount(text, ['Кредитный лимит']),
    debt: extractLabelAmount(text, ['Задолженность', 'Текущая задолженность']),
    endBalance: extractLabelAmount(text, ['Остаток на конец периода', 'Остаток']),
    openingBalance: extractLabelAmount(text, ['Остаток на начало периода']),
    periodStart: periodMatch?.[1] ? dateFromRu(periodMatch[1]) ?? undefined : undefined,
    periodEnd: periodMatch?.[2] ? dateFromRu(periodMatch[2]) ?? undefined : undefined,
  }
}

function categorize(description: string, isIncome: boolean): MoneyCategory {
  const text = description.toLowerCase()

  if (isIncome) {
    if (/зарплат|salary/.test(text)) {
      return 'salary'
    }

    if (/возврат|refund|отмена/.test(text)) {
      return 'refund'
    }

    if (/подар|gift/.test(text)) {
      return 'gift'
    }

    if (/фриланс|freelance/.test(text)) {
      return 'freelance'
    }

    return 'other_income'
  }

  if (/продукт|супермаркет|пят[её]роч|магнит|перекр[её]ст|еда|food|restaurant|cafe|кафе/.test(text)) {
    return 'food'
  }

  if (/транспорт|такси|метро|автобус|яндекс go|transport|taxi/.test(text)) {
    return 'transport'
  }

  if (/жкх|аренд|квартир|дом|housing/.test(text)) {
    return 'housing'
  }

  if (/аптек|здоров|клиник|health/.test(text)) {
    return 'health'
  }

  if (/обуч|курс|education/.test(text)) {
    return 'education'
  }

  if (/подписк|subscription|spotify|netflix|яндекс плюс/.test(text)) {
    return 'subscriptions'
  }

  if (/кино|театр|игр|развлеч|entertainment/.test(text)) {
    return 'entertainment'
  }

  return 'other'
}

function isTransferDescription(description: string) {
  return /перевод|между своими|между счетами|на свой сч[её]т|со своего сч[её]та/i.test(description)
}

function stableHash(parts: string[]) {
  const input = parts.join('|').toLowerCase().replace(/\s+/g, ' ').trim()
  let hash = 2166136261

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return `imp-${(hash >>> 0).toString(16)}`
}

function normalizeFingerprintText(value: string) {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/[−–—]/g, '-')
    .replace(/операц(?:ия|ии|ию)?\s+по\s+карт[еы]?\s*(?:\*{2,}|•{1,}|x{2,}|х{2,})?\s*\d{4}/gi, ' ')
    .replace(/\b(?:карта|карт[аеы])\s*(?:\*{2,}|•{1,}|x{2,}|х{2,})?\s*\d{4}\b/gi, ' ')
    .replace(/\b(?:₽|руб\.?|rub)\b/gi, ' ')
    .replace(/[.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function normalizeFingerprintAmount(amount: number) {
  const normalized = normalizeMoneyValue(amount)

  return normalized === null ? '0.00' : normalized.toFixed(2)
}

function createImportFingerprint({
  accountLast4,
  amount,
  description,
  transactionDate,
  type,
}: {
  accountLast4?: string
  amount: number
  description: string
  transactionDate: string
  type: MoneyTransaction['type']
}) {
  return stableHash([
    'money-import-v1',
    transactionDate,
    type,
    normalizeFingerprintAmount(amount),
    normalizeFingerprintText(description),
    accountLast4 ?? '',
  ])
}

function createImportAccount(meta: ParsedStatementMeta, source: MoneyTransactionSource): MoneyAccount {
  const now = new Date().toISOString()
  const last4 = meta.accountLast4

  return {
    id: `sber-account-${last4 ?? stableHash([source, meta.periodStart ?? '', meta.periodEnd ?? ''])}`,
    name: last4 ? `Сбер • ${last4}` : 'Сбер',
    type: meta.creditLimit || meta.debt ? 'credit_card' : source === 'sber_pdf' || source === 'sber_text' ? 'debit_card' : 'other',
    openingBalance: meta.creditLimit || meta.debt ? 0 : meta.openingBalance ?? 0,
    createdAt: now,
    updatedAt: now,
    isArchived: false,
    source: 'sber',
    last4,
    creditLimit: meta.creditLimit,
    debt: meta.debt,
  }
}

function stripAmounts(description: string, amount: ParsedAmount) {
  return description
    .replace(amount.raw, ' ')
    .replace(/\s+[+-]?\d[\d\s\u00a0]*(?:[,.]\d{1,2})?\s*(?:₽|руб\.?|RUB)?$/i, ' ')
    .replace(/\s*(?:₽|руб\.?|RUB)\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseOperationLine(
  line: string,
  meta: ParsedStatementMeta,
  source: MoneyTransactionSource,
): MoneyTransaction | null {
  const dateMatch = line.match(operationDatePattern)

  if (!dateMatch) {
    return null
  }

  const fallbackYear = meta.periodEnd?.slice(0, 4) ?? String(new Date().getFullYear())
  const transactionDate = dateFromRu(dateMatch[1] ?? '', fallbackYear)

  if (!transactionDate) {
    return null
  }

  const rest = dateMatch[2] ?? ''
  const hasOperationTime = /\b\d{2}:\d{2}\b/.test(rest)
  const tokens = extractAmountTokens(rest).filter(
    (token) => token.hasCurrency || token.isSigned || hasOperationTime,
  )

  if (!tokens.length) {
    return null
  }

  const signedToken = extractSignedAmountToken(rest)
  const amountToken = signedToken ?? (tokens.length > 1 ? tokens[tokens.length - 2] : tokens[0])

  if (!amountToken) {
    return null
  }

  const rawDescription = stripAmounts(rest, amountToken) || rest
  const isIncome = amountToken.isIncome
  const type = isIncome ? 'income' : 'expense'
  const category = categorize(rawDescription, isIncome)
  const importHash = stableHash([
    source,
    transactionDate,
    String(amountToken.amount),
    rawDescription,
    meta.accountLast4 ?? '',
  ])

  return {
    id: createId('import-tx'),
    accountId: `sber-account-${meta.accountLast4 ?? stableHash([source, meta.periodStart ?? '', meta.periodEnd ?? ''])}`,
    type,
    amount: amountToken.amount,
    category,
    title: moneyCategoryLabels[category],
    transactionDate,
    note: rawDescription,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source,
    importHash,
    importFingerprint: createImportFingerprint({
      accountLast4: meta.accountLast4,
      amount: amountToken.amount,
      description: rawDescription,
      transactionDate,
      type,
    }),
    accountLast4: meta.accountLast4,
    rawDescription,
  }
}

function hasOperationAmount(line: string) {
  const dateMatch = line.match(operationDatePattern)
  const rest = dateMatch?.[2] ?? ''

  return extractAmountTokens(rest).length > 0
}

function collectOperationLines(text: string) {
  const collected: string[] = []
  let currentLine = ''

  text.split('\n').forEach((line) => {
    if (operationDatePattern.test(line)) {
      if (currentLine) {
        collected.push(currentLine)
      }

      currentLine = line

      if (hasOperationAmount(currentLine)) {
        collected.push(currentLine)
        currentLine = ''
      }

      return
    }

    if (!currentLine) {
      return
    }

    currentLine = `${currentLine} ${line}`

    if (hasOperationAmount(currentLine)) {
      collected.push(currentLine)
      currentLine = ''
    }
  })

  if (currentLine) {
    collected.push(currentLine)
  }

  return collected
}

function parseOperations(text: string, meta: ParsedStatementMeta, source: MoneyTransactionSource) {
  return collectOperationLines(text)
    .map((line) => parseOperationLine(line, meta, source))
    .filter((transaction): transaction is MoneyTransaction => Boolean(transaction))
}

export function parseSberStatementTextWithSource(
  text: string,
  existingTransactions: MoneyTransaction[] = [],
  detectedSource: Extract<MoneyTransactionSource, 'sber_pdf' | 'sber_text'> = 'sber_text',
): MoneyImportPreview {
  const normalizedText = normalizeText(text)
  const warnings: string[] = []

  if (!normalizedText) {
    return {
      source: 'unknown',
      accounts: [],
      transactions: [],
      totals: {
        income: 0,
        expense: 0,
        transfer: 0,
        newTransactions: 0,
        duplicates: 0,
      },
      warnings: ['Текст выписки пустой.'],
    }
  }

  const isSberStatement = /Сбер|Sber|Выписка по плат[её]жному сч[её]ту|Выписка по сч[её]ту кредитной карты/i.test(normalizedText)
  const source: MoneyTransactionSource = isSberStatement ? detectedSource : 'unknown'
  const meta = extractMeta(normalizedText)
  const transactions = parseOperations(normalizedText, meta, source)
  const account = createImportAccount(meta, source)
  const duplicates = countImportDuplicates(transactions, existingTransactions)
  const transferTotal = transactions
    .filter((transaction) => isTransferDescription(transaction.rawDescription ?? transaction.title))
    .reduce((sum, transaction) => sum + transaction.amount, 0)

  if (!isSberStatement) {
    warnings.push('Источник похож не на выписку Сбера. Проверь предпросмотр перед импортом.')
  }

  if (!meta.periodStart || !meta.periodEnd) {
    warnings.push('Период выписки не распознан.')
  }

  if (!meta.accountLast4) {
    warnings.push('Последние 4 цифры счёта или карты не распознаны.')
  }

  if (!transactions.length) {
    warnings.push('Операции не распознаны. Попробуй вставить текст таблицы из PDF.')
  }

  return {
    source: source === 'sber_text' || source === 'sber_pdf' ? source : 'unknown',
    periodStart: meta.periodStart,
    periodEnd: meta.periodEnd,
    statementEndingBalance: meta.endBalance,
    accounts: transactions.length || meta.accountLast4 ? [account] : [],
    transactions,
    totals: {
      income: transactions
        .filter((transaction) => transaction.type === 'income')
        .reduce((sum, transaction) => sum + transaction.amount, 0),
      expense: transactions
        .filter((transaction) => transaction.type === 'expense')
        .reduce((sum, transaction) => sum + transaction.amount, 0),
      transfer: Number(transferTotal.toFixed(2)),
      newTransactions: Math.max(0, transactions.length - duplicates),
      duplicates,
    },
    warnings,
  }
}

export function parseSberStatementText(
  text: string,
  existingTransactions: MoneyTransaction[] = [],
): MoneyImportPreview {
  return parseSberStatementTextWithSource(text, existingTransactions, 'sber_text')
}
