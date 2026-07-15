import type { WeeklyReviewSummary } from '@/shared/types'

export interface WeeklyReviewDetailRow {
  label: string
  value: string
}

export interface WeeklyReviewDetailModel {
  id: string
  periodStart: string
  periodEnd: string
  createdAt: string
  dataQuality?: string
  rows: WeeklyReviewDetailRow[]
  actionsLabel: string
}

const dataQualityLabels: Record<string, string> = {
  low: 'мало данных',
  medium: 'средне',
  good: 'достаточно',
}

function cleanText(value: string | undefined) {
  return value?.replace(/\s+/g, ' ').trim() ?? ''
}

function addOptionalRow(rows: WeeklyReviewDetailRow[], label: string, value: string | undefined) {
  const text = cleanText(value)

  if (text) {
    rows.push({ label, value: text })
  }
}

export function buildWeeklyReviewDetailModel(
  summary: WeeklyReviewSummary,
): WeeklyReviewDetailModel {
  const rows: WeeklyReviewDetailRow[] = []

  addOptionalRow(rows, 'Главный вывод', summary.summary)
  addOptionalRow(rows, 'Тело', summary.bodyFocus)
  addOptionalRow(rows, 'Деньги', summary.moneyFocus)
  addOptionalRow(rows, 'Риск', summary.risk)
  addOptionalRow(rows, 'Сообщение Ядра', summary.coreMessage)

  return {
    id: summary.id,
    periodStart: summary.weekStart || summary.periodStart,
    periodEnd: summary.weekEnd || summary.periodEnd,
    createdAt: summary.createdAt,
    dataQuality: summary.dataQuality ? dataQualityLabels[summary.dataQuality] : undefined,
    rows,
    actionsLabel: `${summary.appliedActionsCount} из ${summary.suggestedActionsCount}`,
  }
}

export function getWeeklyReviewDetailById(
  summaries: WeeklyReviewSummary[],
  id: string | null,
): WeeklyReviewDetailModel | null {
  if (!id) {
    return null
  }

  const summary = summaries.find((item) => item.id === id)

  return summary ? buildWeeklyReviewDetailModel(summary) : null
}
