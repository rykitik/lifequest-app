import type {
  ApiError,
  ApiErrorCode,
  ApiRequestCategory,
  RequestIdempotencyMeta,
} from '@/shared/types/http'

type ErrorLike = {
  code?: string | number
  message?: string
  name?: string
  status?: number
  response?: {
    status?: number
    data?: unknown
  }
  requestMeta?: ApiError['requestMeta']
  category?: ApiError['category']
  requestId?: string | null
}

const RETRYABLE_API_ERROR_CODES: ApiErrorCode[] = ['network_error', 'timeout', 'server_error']

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function hasApiErrorShape(value: unknown): value is ApiError {
  return isObject(value) && typeof value.code === 'string' && typeof value.message === 'string'
}

function getStatusCode(error: ErrorLike): number | undefined {
  return error.response?.status ?? error.status
}

function mapStatusCodeToErrorCode(statusCode?: number): ApiErrorCode {
  if (statusCode === 401) {
    return 'unauthorized'
  }

  if (statusCode === 403) {
    return 'forbidden'
  }

  if (statusCode === 409) {
    return 'conflict'
  }

  if (statusCode === 400 || statusCode === 422) {
    return 'validation_error'
  }

  if (typeof statusCode === 'number' && statusCode >= 500) {
    return 'server_error'
  }

  return 'unknown_error'
}

function mapUnknownErrorToCode(error: ErrorLike, statusCode?: number): ApiErrorCode {
  const message = error.message?.toLowerCase() ?? ''
  const code = String(error.code ?? '').toLowerCase()
  const name = error.name?.toLowerCase() ?? ''

  if (code === 'apierror' && hasApiErrorShape(error)) {
    return error.code
  }

  if (code === 'econnaborted' || code === 'etimedout' || name === 'aborterror' || message.includes('timeout')) {
    return 'timeout'
  }

  if (code === 'err_network' || message.includes('network error') || message.includes('failed to fetch')) {
    return 'network_error'
  }

  if (code === 'schema_mismatch' || message.includes('schema mismatch')) {
    return 'schema_mismatch'
  }

  if (code === 'auth_expired' || message.includes('auth expired') || message.includes('session expired')) {
    return 'auth_expired'
  }

  if (code === 'sync_conflict' || message.includes('sync conflict')) {
    return 'sync_conflict'
  }

  if (statusCode) {
    return mapStatusCodeToErrorCode(statusCode)
  }

  return 'unknown_error'
}

function defaultMessageForCode(code: ApiErrorCode): string {
  switch (code) {
    case 'network_error':
      return 'Сеть недоступна. Локальный режим должен оставаться рабочим.'
    case 'timeout':
      return 'Сервер не ответил вовремя.'
    case 'unauthorized':
      return 'Требуется авторизация.'
    case 'forbidden':
      return 'Доступ к этой операции запрещён.'
    case 'validation_error':
      return 'Запрос не прошёл проверку.'
    case 'conflict':
      return 'Обнаружен конфликт данных.'
    case 'schema_mismatch':
      return 'Версия данных не совпадает с ожидаемой схемой.'
    case 'server_error':
      return 'Сервер временно недоступен.'
    case 'auth_expired':
      return 'Сессия истекла. Понадобится обновление входа.'
    case 'sync_conflict':
      return 'Синхронизация обнаружила конфликт изменений.'
    case 'unknown_error':
    default:
      return 'Произошла неизвестная ошибка.'
  }
}

function sanitizeValue(value: string | number | null | undefined): string {
  return String(value ?? '').trim().toLowerCase()
}

function createStablePayload(input: RequestIdempotencyMeta): string {
  return [
    sanitizeValue(input.userId),
    sanitizeValue(input.deviceId),
    sanitizeValue(input.entityType),
    sanitizeValue(input.entityId),
    sanitizeValue(input.operation),
    sanitizeValue(input.sourceId),
    sanitizeValue(input.requestSeed),
  ].join('|')
}

function hashString(value: string): string {
  let hash = 0

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index)
    hash |= 0
  }

  return Math.abs(hash).toString(36)
}

export function normalizeApiError(error: unknown): ApiError {
  if (hasApiErrorShape(error)) {
    return {
      ...error,
      retryable: RETRYABLE_API_ERROR_CODES.includes(error.code),
      source: error.source ?? 'client',
      message: error.message || defaultMessageForCode(error.code),
    }
  }

  const errorLike = (isObject(error) ? error : {}) as ErrorLike
  const statusCode = getStatusCode(errorLike)
  const code = mapUnknownErrorToCode(errorLike, statusCode)

  return {
    code,
    message: errorLike.message?.trim() || defaultMessageForCode(code),
    statusCode,
    retryable: RETRYABLE_API_ERROR_CODES.includes(code),
    category: errorLike.category,
    requestId: errorLike.requestId ?? null,
    source: statusCode ? 'server' : code === 'network_error' || code === 'timeout' ? 'network' : 'client',
    details: isObject(errorLike.response) ? errorLike.response.data : error,
    requestMeta: errorLike.requestMeta,
  }
}

export function isRetryableApiError(error: ApiError | unknown): boolean {
  return normalizeApiError(error).retryable
}

export function shouldTriggerRefresh(error: ApiError | unknown): boolean {
  const normalizedError = normalizeApiError(error)
  const endpoint = normalizedError.requestMeta?.endpoint
  const skipAuthRefresh = normalizedError.requestMeta?.skipAuthRefresh

  if (normalizedError.category === 'public' || normalizedError.category === 'local_only') {
    return false
  }

  if (skipAuthRefresh) {
    return false
  }

  if (endpoint === '/api/auth/refresh') {
    return false
  }

  return normalizedError.code === 'unauthorized' || normalizedError.code === 'auth_expired'
}

export function createRequestIdempotencyKey(input: RequestIdempotencyMeta): string {
  return `lq_${hashString(createStablePayload(input))}`
}

export function isProtectedRequest(category: ApiRequestCategory): boolean {
  return category === 'protected' || category === 'sync'
}
