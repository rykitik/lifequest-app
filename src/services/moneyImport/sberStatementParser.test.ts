import { describe, expect, it } from 'vitest'
import { parseSberPdfStatement, parseSberStatementText } from '@/services/moneyImport/sberStatementParser'
import debitBasicFixture from '@/services/moneyImport/__fixtures__/sber-debit-basic.txt?raw'
import creditBasicFixture from '@/services/moneyImport/__fixtures__/sber-credit-basic.txt?raw'
import transfersHeavyFixture from '@/services/moneyImport/__fixtures__/sber-transfers-heavy.txt?raw'
import multilineOperationFixture from '@/services/moneyImport/__fixtures__/sber-multiline-operation.txt?raw'
import pdfExtractedLayoutFixture from '@/services/moneyImport/__fixtures__/sber-pdf-extracted-layout.txt?raw'

const sampleSberText = `
СберБанк
Выписка по платёжному счёту
Карта **** 6128
За период 01.07.2026 — 12.07.2026
Остаток на начало периода 10 000,00 ₽
Пополнение 2 000,00 ₽
Списание 1 250,50 ₽
Остаток на конец периода 10 749,50 ₽

01.07.2026 Продукты Пятерочка -700,00 ₽ 9 300,00 ₽
02.07.2026 Зарплата ООО Ромашка +2 000,00 ₽ 11 300,00 ₽
03.07.2026 Транспорт Метро -150,50 ₽ 11 149,50 ₽
04.07.2026 Перевод между своими счетами -400,00 ₽ 10 749,50 ₽
`

describe('parseSberStatementText', () => {
  it('распознаёт период выписки', () => {
    const preview = parseSberStatementText(sampleSberText)

    expect(preview.periodStart).toBe('2026-07-01')
    expect(preview.periodEnd).toBe('2026-07-12')
  })

  it('распознаёт операции и последние 4 цифры счёта', () => {
    const preview = parseSberStatementText(sampleSberText)

    expect(preview.accounts[0]).toMatchObject({
      last4: '6128',
      openingBalance: 10_000,
      source: 'sber',
    })
    expect(preview.transactions).toHaveLength(4)
  })

  it('сумма с плюсом становится income, сумма без плюса становится expense', () => {
    const preview = parseSberStatementText(sampleSberText)
    const income = preview.transactions.find((transaction) => transaction.type === 'income')
    const expense = preview.transactions.find((transaction) => transaction.rawDescription?.includes('Пятерочка'))

    expect(income).toMatchObject({
      amount: 2000,
      category: 'salary',
      type: 'income',
    })
    expect(expense).toMatchObject({
      amount: 700,
      category: 'food',
      rawDescription: 'Продукты Пятерочка',
      type: 'expense',
    })
  })

  it('создаёт importHash и считает transfer total', () => {
    const preview = parseSberStatementText(sampleSberText)

    expect(preview.transactions.every((transaction) => transaction.importHash)).toBe(true)
    expect(preview.transactions.every((transaction) => transaction.importFingerprint)).toBe(true)
    expect(preview.totals.transfer).toBe(400)
  })

  it('считает дубли по существующим importHash', () => {
    const firstPreview = parseSberStatementText(sampleSberText)
    const secondPreview = parseSberStatementText(sampleSberText, firstPreview.transactions)

    expect(secondPreview.totals.duplicates).toBe(firstPreview.transactions.length)
    expect(secondPreview.totals.newTransactions).toBe(0)
  })

  it('возвращает спокойный fallback для нечитаемого PDF', async () => {
    const file = new File(['%PDF-1.7'], 'statement.pdf', { type: 'application/pdf' })
    const preview = await parseSberPdfStatement(file)

    expect(preview.transactions).toHaveLength(0)
    expect(preview.warnings).toContain('Не удалось прочитать PDF. Попробуй вставить текст выписки вручную.')
  })

  it('разбирает debit fixture с картами, QR/СБП, переводами и покупкой', () => {
    const preview = parseSberStatementText(debitBasicFixture)

    expect(preview.source).toBe('sber_text')
    expect(preview.periodStart).toBe('2026-07-01')
    expect(preview.periodEnd).toBe('2026-07-12')
    expect(preview.accounts.length).toBeGreaterThanOrEqual(1)
    expect(preview.accounts[0]).toMatchObject({
      last4: '1111',
      openingBalance: 10_000,
      source: 'sber',
    })
    expect(preview.totals.income).toBeGreaterThan(0)
    expect(preview.totals.expense).toBeGreaterThan(0)
    expect(preview.transactions).toHaveLength(4)
    expect(preview.transactions.some((transaction) => transaction.type === 'income')).toBe(true)
    expect(preview.transactions.some((transaction) => transaction.type === 'expense')).toBe(true)
    expect(preview.transactions.every((transaction) => transaction.importHash)).toBe(true)
  })

  it('разбирает credit fixture с лимитом, задолженностью и расходами', () => {
    const preview = parseSberStatementText(creditBasicFixture)
    const account = preview.accounts[0]

    expect(account).toMatchObject({
      last4: '3333',
      creditLimit: 120_000,
      debt: 8450,
    })
    expect(preview.transactions).toHaveLength(4)
    expect(preview.transactions.filter((transaction) => transaction.type === 'expense')).toHaveLength(3)
    expect(preview.transactions.some((transaction) => transaction.type === 'income' && transaction.amount === 3000)).toBe(true)
    expect(preview.warnings).not.toContain('Операции не распознаны. Попробуй вставить текст таблицы из PDF.')
    expect(preview.warnings).not.toContain('Источник похож не на выписку Сбера. Проверь предпросмотр перед импортом.')
  })

  it('разбирает transfers-heavy fixture и стабилизирует importHash', () => {
    const text = transfersHeavyFixture
    const firstPreview = parseSberStatementText(text)
    const secondPreview = parseSberStatementText(text)
    const firstHashes = firstPreview.transactions.map((transaction) => transaction.importHash)
    const secondHashes = secondPreview.transactions.map((transaction) => transaction.importHash)

    expect(firstPreview.totals.transfer).toBe(3700)
    expect(firstPreview.transactions.find((transaction) => transaction.amount === 1000)?.type).toBe('income')
    expect(firstPreview.transactions.find((transaction) => transaction.amount === 300)?.type).toBe('expense')
    expect(firstHashes).toEqual(secondHashes)
  })

  it('разбирает multiline operation без остатка в описании', () => {
    const preview = parseSberStatementText(multilineOperationFixture)
    const transaction = preview.transactions[0]

    expect(preview.transactions).toHaveLength(1)
    expect(transaction).toMatchObject({
      amount: 1234.56,
      rawDescription: 'Покупка MAGNIT TEST',
      type: 'expense',
    })
    expect(transaction?.rawDescription).not.toContain('18 765')
  })

  it('разбирает pdfjs extracted layout без ложных операций из detail-строк', () => {
    const preview = parseSberStatementText(pdfExtractedLayoutFixture)

    expect(preview.periodStart).toBe('2026-07-01')
    expect(preview.periodEnd).toBe('2026-07-12')
    expect(preview.accounts[0]?.last4).toBe('1111')
    expect(preview.transactions).toHaveLength(4)
    expect(preview.transactions.map((transaction) => transaction.amount)).toEqual([
      400,
      18.48,
      200,
      12612.49,
    ])
    expect(preview.transactions.filter((transaction) => transaction.type === 'income')).toHaveLength(2)
    expect(preview.transactions.filter((transaction) => transaction.type === 'expense')).toHaveLength(2)
    expect(preview.transactions.some((transaction) => transaction.rawDescription?.includes('699060'))).toBe(false)
    expect(preview.transactions.every((transaction) => transaction.importFingerprint)).toBe(true)
  })
})
