import { describe, expect, it } from 'vitest'
import {
  buildWeeklyReviewDetailModel,
  getWeeklyReviewDetailById,
} from '@/services/weeklyReviewDetail'
import type { WeeklyReviewSummary } from '@/shared/types'

function weeklySummary(overrides: Partial<WeeklyReviewSummary> = {}): WeeklyReviewSummary {
  return {
    id: 'review-1',
    createdAt: '2026-07-15T10:00:00.000Z',
    periodStart: '2026-07-06',
    periodEnd: '2026-07-12',
    weekStart: '2026-07-06',
    weekEnd: '2026-07-12',
    dataQuality: 'medium',
    summary: 'Неделя стала понятнее.',
    bodyFocus: 'Держать воду и движение.',
    moneyFocus: 'Проверять безопасный остаток.',
    risk: 'Усталость может сбить режим.',
    coreMessage: 'Система спокойна.',
    suggestedActionsCount: 2,
    appliedActionsCount: 1,
    suggestedActions: [
      {
        title: 'Выпить воды',
        domain: 'body',
        difficulty: 'easy',
        xp: 10,
      },
    ],
    source: 'weekly_review',
    ...overrides,
  }
}

describe('weekly review detail model', () => {
  it('можно выбрать weekly review для просмотра по id', () => {
    const detail = getWeeklyReviewDetailById(
      [weeklySummary({ id: 'old' }), weeklySummary({ id: 'target', summary: 'Нужный итог.' })],
      'target',
    )

    expect(detail).toMatchObject({
      id: 'target',
      periodStart: '2026-07-06',
      periodEnd: '2026-07-12',
    })
    expect(detail?.rows.some((row) => row.value === 'Нужный итог.')).toBe(true)
  })

  it('возвращает null, если выбранной записи больше нет', () => {
    expect(getWeeklyReviewDetailById([weeklySummary({ id: 'review-1' })], 'deleted')).toBeNull()
  })

  it('detail не содержит приватных полей', () => {
    const summaryWithPrivateFields = {
      ...weeklySummary(),
      prompt: 'FULL PROMPT',
      rawDescription: 'Операция по карте 1234567890123456',
      pdfText: 'PDF statement content',
      transactions: [{ rawDescription: 'private transaction' }],
    } as WeeklyReviewSummary & Record<string, unknown>

    const detail = buildWeeklyReviewDetailModel(summaryWithPrivateFields)
    const serialized = JSON.stringify(detail)

    expect(serialized).not.toContain('FULL PROMPT')
    expect(serialized).not.toContain('rawDescription')
    expect(serialized).not.toContain('1234567890123456')
    expect(serialized).not.toContain('PDF statement content')
    expect(serialized).not.toContain('private transaction')
  })

  it('empty optional fields не ломают detail model', () => {
    const detail = buildWeeklyReviewDetailModel(
      weeklySummary({
        bodyFocus: '',
        moneyFocus: '',
        risk: '',
        coreMessage: '',
        dataQuality: undefined,
      }),
    )

    expect(detail.rows).toEqual([{ label: 'Главный вывод', value: 'Неделя стала понятнее.' }])
    expect(detail.dataQuality).toBeUndefined()
    expect(detail.actionsLabel).toBe('1 из 2')
  })
})
