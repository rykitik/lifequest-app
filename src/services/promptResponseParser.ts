import type {
  LifeQuestPromptResponse,
  LifeQuestSuggestedAction,
  PromptImportDifficulty,
  PromptImportDomain,
} from '@/shared/types'

export type PromptParseResult =
  | {
      ok: true
      data: LifeQuestPromptResponse
      rawJson: string
    }
  | {
      ok: false
      reason: string
    }

type ValidationResult =
  | {
      ok: true
      data: LifeQuestPromptResponse
    }
  | {
      ok: false
      reason: string
    }

const responseKeys = [
  'summary',
  'todayMainQuest',
  'quickWin',
  'recoveryAction',
  'bodyFocus',
  'moneyFocus',
  'risk',
  'coreMessage',
  'suggestedActions',
] as const

const actionKeys = ['title', 'domain', 'difficulty', 'xp'] as const
const domains: PromptImportDomain[] = ['today', 'plan', 'body', 'money', 'rescue', 'core']
const difficulties: PromptImportDifficulty[] = ['easy', 'medium', 'hard']
const MAX_JSON_CANDIDATE_LENGTH = 100_000

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function hasOnlyKnownKeys(record: Record<string, unknown>, keys: readonly string[]) {
  return Object.keys(record).every((key) => keys.includes(key))
}

function readString(record: Record<string, unknown>, key: keyof LifeQuestPromptResponse) {
  const value = record[key]

  if (typeof value !== 'string') {
    return null
  }

  return value.trim()
}

function validateSuggestedAction(value: unknown): LifeQuestSuggestedAction | null {
  if (!isRecord(value) || !hasOnlyKnownKeys(value, actionKeys)) {
    return null
  }

  const title = typeof value.title === 'string' ? value.title.trim() : ''
  const domain = value.domain
  const difficulty = value.difficulty
  const xp = value.xp

  if (
    !title ||
    !domains.includes(domain as PromptImportDomain) ||
    !difficulties.includes(difficulty as PromptImportDifficulty) ||
    typeof xp !== 'number' ||
    !Number.isFinite(xp)
  ) {
    return null
  }

  return {
    title,
    domain: domain as PromptImportDomain,
    difficulty: difficulty as PromptImportDifficulty,
    xp: Math.max(0, Math.round(xp)),
  }
}

export function validateLifeQuestResponse(data: unknown): ValidationResult {
  if (!isRecord(data)) {
    return {
      ok: false,
      reason: 'JSON должен быть объектом.',
    }
  }

  if (!hasOnlyKnownKeys(data, ['lifequest'])) {
    return {
      ok: false,
      reason: 'В корневом JSON есть неизвестные поля.',
    }
  }

  const lifequest = data.lifequest

  if (!isRecord(lifequest)) {
    return {
      ok: false,
      reason: 'Поле lifequest должно быть объектом.',
    }
  }

  if (!hasOnlyKnownKeys(lifequest, responseKeys)) {
    return {
      ok: false,
      reason: 'В lifequest есть неизвестные поля.',
    }
  }

  const summary = readString(lifequest, 'summary')
  const todayMainQuest = readString(lifequest, 'todayMainQuest')
  const quickWin = readString(lifequest, 'quickWin')
  const recoveryAction = readString(lifequest, 'recoveryAction')
  const bodyFocus = readString(lifequest, 'bodyFocus')
  const moneyFocus = readString(lifequest, 'moneyFocus')
  const risk = readString(lifequest, 'risk')
  const coreMessage = readString(lifequest, 'coreMessage')

  if (
    summary === null ||
    todayMainQuest === null ||
    quickWin === null ||
    recoveryAction === null ||
    bodyFocus === null ||
    moneyFocus === null ||
    risk === null ||
    coreMessage === null
  ) {
    return {
      ok: false,
      reason: 'Некоторые обязательные поля должны быть строками.',
    }
  }

  if (!Array.isArray(lifequest.suggestedActions)) {
    return {
      ok: false,
      reason: 'Поле suggestedActions должно быть массивом.',
    }
  }

  const suggestedActions = lifequest.suggestedActions.map(validateSuggestedAction)

  if (suggestedActions.some((action) => action === null)) {
    return {
      ok: false,
      reason: 'Некоторые suggestedActions имеют неверный формат.',
    }
  }

  return {
    ok: true,
    data: {
      summary,
      todayMainQuest,
      quickWin,
      recoveryAction,
      bodyFocus,
      moneyFocus,
      risk,
      coreMessage,
      suggestedActions: suggestedActions as LifeQuestSuggestedAction[],
    },
  }
}

function tryParseJson(rawJson: string) {
  try {
    return JSON.parse(rawJson)
  } catch {
    return null
  }
}

function extractBalancedJson(text: string, startIndex: number) {
  let depth = 0
  let inString = false
  let escaped = false

  for (let index = startIndex; index < text.length; index += 1) {
    if (index - startIndex > MAX_JSON_CANDIDATE_LENGTH) {
      return {
        ok: false,
        reason: 'JSON-блок слишком длинный. Вставь только финальный JSON-блок lifequest.',
      } as const
    }

    const char = text[index]

    if (inString) {
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === '"') {
        inString = false
      }

      continue
    }

    if (char === '"') {
      inString = true
      continue
    }

    if (char === '{') {
      depth += 1
    }

    if (char === '}') {
      depth -= 1

      if (depth === 0) {
        return {
          ok: true,
          candidate: text.slice(startIndex, index + 1),
        } as const
      }
    }
  }

  return {
    ok: false,
    reason: 'JSON-блок найден, но фигурные скобки не закрыты.',
  } as const
}

function extractJsonCodeBlock(rawText: string) {
  let searchIndex = 0
  let firstJsonCandidate:
    | {
        ok: true
        candidate: string
      }
    | {
        ok: false
        reason: string
      }
    | null = null

  while (searchIndex < rawText.length) {
    const fenceStart = rawText.indexOf('```', searchIndex)

    if (fenceStart === -1) {
      return firstJsonCandidate
    }

    const headerStart = fenceStart + 3
    const headerEnd = rawText.indexOf('\n', headerStart)

    if (headerEnd === -1) {
      return null
    }

    const language = rawText.slice(headerStart, headerEnd).trim().toLowerCase()
    const fenceEnd = rawText.indexOf('```', headerEnd + 1)

    if (fenceEnd === -1) {
      return null
    }

    if (language === 'json' || language === '') {
      const candidate = rawText.slice(headerEnd + 1, fenceEnd).trim()

      if (candidate.length > MAX_JSON_CANDIDATE_LENGTH) {
        return {
          ok: false,
          reason: 'JSON-блок слишком длинный. Вставь только финальный JSON-блок lifequest.',
        } as const
      }

      if (candidate.startsWith('{')) {
        const jsonCandidate = {
          ok: true,
          candidate,
        } as const

        if (candidate.includes('"lifequest"')) {
          return jsonCandidate
        }

        firstJsonCandidate ??= jsonCandidate
      }
    }

    searchIndex = fenceEnd + 3
  }

  return null
}

function extractPromptJsonCandidate(rawText: string) {
  const trimmed = rawText.trim()

  const codeBlock = extractJsonCodeBlock(trimmed)

  if (codeBlock) {
    return codeBlock
  }

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    if (trimmed.length > MAX_JSON_CANDIDATE_LENGTH) {
      return {
        ok: false,
        reason: 'JSON-блок слишком длинный. Вставь только финальный JSON-блок lifequest.',
      } as const
    }

    return {
      ok: true,
      candidate: trimmed,
    } as const
  }

  const lifequestMarkerIndex = trimmed.lastIndexOf('"lifequest"')
  const preferredStart =
    lifequestMarkerIndex === -1 ? -1 : trimmed.lastIndexOf('{', lifequestMarkerIndex)

  if (preferredStart === -1) {
    return {
      ok: false,
      reason: 'Не удалось разобрать ответ. Попробуй вставить только JSON-блок lifequest из ответа ChatGPT.',
    } as const
  }

  return extractBalancedJson(trimmed, preferredStart)
}

export function parsePromptResponse(rawText: string): PromptParseResult {
  const extracted = extractPromptJsonCandidate(rawText)

  if (!extracted.ok) {
    return {
      ok: false,
      reason: extracted.reason,
    }
  }

  const parsed = tryParseJson(extracted.candidate)

  if (!parsed) {
    return {
      ok: false,
      reason: 'JSON-блок найден, но его не удалось разобрать.',
    }
  }

  const validation = validateLifeQuestResponse(parsed)

  if (!validation.ok) {
    return validation
  }

  return {
    ok: true,
    data: validation.data,
    rawJson: extracted.candidate,
  }
}
