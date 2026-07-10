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
        return text.slice(startIndex, index + 1)
      }
    }
  }

  return null
}

function collectJsonCandidates(rawText: string) {
  const candidates: string[] = []
  const trimmed = rawText.trim()

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    candidates.push(trimmed)
  }

  const codeBlockPattern = /```(?:json)?\s*([\s\S]*?)```/gi
  let codeBlockMatch: RegExpExecArray | null

  while ((codeBlockMatch = codeBlockPattern.exec(rawText))) {
    const candidate = codeBlockMatch[1]?.trim()

    if (candidate?.startsWith('{')) {
      candidates.push(candidate)
    }
  }

  const lifequestMarkerIndex = rawText.lastIndexOf('"lifequest"')
  const preferredStart =
    lifequestMarkerIndex === -1 ? -1 : rawText.lastIndexOf('{', lifequestMarkerIndex)

  if (preferredStart !== -1) {
    const candidate = extractBalancedJson(rawText, preferredStart)

    if (candidate) {
      candidates.push(candidate)
    }
  }

  for (let index = rawText.lastIndexOf('{'); index >= 0; index = rawText.lastIndexOf('{', index - 1)) {
    const candidate = extractBalancedJson(rawText, index)

    if (candidate) {
      candidates.push(candidate)
    }
  }

  return Array.from(new Set(candidates))
}

export function parsePromptResponse(rawText: string): PromptParseResult {
  const candidates = collectJsonCandidates(rawText)

  if (!candidates.length) {
    return {
      ok: false,
      reason: 'Не удалось найти структурированный JSON-блок.',
    }
  }

  let sawBrokenJson = false

  for (const candidate of candidates) {
    const parsed = tryParseJson(candidate)

    if (!parsed) {
      sawBrokenJson = true
      continue
    }

    const validation = validateLifeQuestResponse(parsed)

    if (validation.ok) {
      return {
        ok: true,
        data: validation.data,
        rawJson: candidate,
      }
    }

    return validation
  }

  return {
    ok: false,
    reason: sawBrokenJson ? 'JSON-блок найден, но его не удалось разобрать.' : 'JSON-блок не найден.',
  }
}
