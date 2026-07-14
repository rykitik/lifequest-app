import type { MoneyImportPreview } from '@/features/money/lib/money'
import type { MoneyTransaction } from '@/shared/types'
import {
  parseSberStatementText,
  parseSberStatementTextWithSource,
} from '@/services/moneyImport/sberStatementParser'

interface PdfTextItem {
  str?: string
  transform?: number[]
}

function emptyPdfPreview(warnings: string[]): MoneyImportPreview {
  return {
    source: 'sber_pdf',
    accounts: [],
    transactions: [],
    totals: {
      income: 0,
      expense: 0,
      transfer: 0,
      newTransactions: 0,
      duplicates: 0,
    },
    warnings,
  }
}

function extractPdfTextLines(items: PdfTextItem[]) {
  const groupedLines = new Map<number, Array<{ x: number; text: string }>>()

  items.forEach((item) => {
    const text = item.str?.trim()
    const transform = item.transform

    if (!text || !Array.isArray(transform)) {
      return
    }

    const x = Number(transform[4] ?? 0)
    const y = Math.round(Number(transform[5] ?? 0) * 2) / 2

    groupedLines.set(y, [...(groupedLines.get(y) ?? []), { x, text }])
  })

  return Array.from(groupedLines.entries())
    .sort((left, right) => right[0] - left[0])
    .map(([, lineItems]) =>
      lineItems
        .sort((left, right) => left.x - right.x)
        .map((item) => item.text)
        .join(' '),
    )
    .join('\n')
}

async function extractTextFromPdf(file: File) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')

  if (typeof window !== 'undefined') {
    const pdfWorkerModule = await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')

    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerModule.default
  }

  const pdf = await pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
  }).promise
  const pageTexts: string[] = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const textContent = await page.getTextContent()

    pageTexts.push(extractPdfTextLines(textContent.items as PdfTextItem[]))
  }

  return pageTexts.join('\n')
}

export async function parseSberPdfStatement(
  file: File,
  existingTransactions: MoneyTransaction[] = [],
): Promise<MoneyImportPreview> {
  if (file.type.startsWith('text/') || file.name.toLowerCase().endsWith('.txt')) {
    return parseSberStatementText(await file.text(), existingTransactions)
  }

  try {
    const extractedText = await extractTextFromPdf(file)

    if (!extractedText.trim()) {
      return emptyPdfPreview([
        'PDF прочитан, но текст выписки не найден. Попробуй вставить текст выписки вручную.',
      ])
    }

    return parseSberStatementTextWithSource(extractedText, existingTransactions, 'sber_pdf')
  } catch {
    return emptyPdfPreview(['Не удалось прочитать PDF. Попробуй вставить текст выписки вручную.'])
  }
}
