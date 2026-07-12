import { describe, expect, it } from 'vitest'
import { parseSberPdfStatement, parseSberStatementText } from '@/services/moneyImport/sberStatementParser'

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
    expect(preview.totals.transfer).toBe(400)
  })

  it('считает дубли по существующим importHash', () => {
    const firstPreview = parseSberStatementText(sampleSberText)
    const secondPreview = parseSberStatementText(sampleSberText, firstPreview.transactions)

    expect(secondPreview.totals.duplicates).toBe(firstPreview.transactions.length)
    expect(secondPreview.totals.newTransactions).toBe(0)
  })

  it('возвращает спокойный fallback для PDF без локального text extractor', async () => {
    const file = new File(['%PDF-1.7'], 'statement.pdf', { type: 'application/pdf' })
    const preview = await parseSberPdfStatement(file)

    expect(preview.transactions).toHaveLength(0)
    expect(preview.warnings).toContain('Не удалось прочитать PDF. Попробуй вставить текст выписки вручную.')
  })
})
