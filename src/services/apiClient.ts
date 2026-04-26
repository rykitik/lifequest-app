import axios, { AxiosHeaders, type AxiosRequestConfig } from 'axios'
import {
  createRequestIdempotencyKey,
  isProtectedRequest,
  normalizeApiError,
  shouldTriggerRefresh,
} from '@/services/httpClientContract'
import type { RefreshResponse } from '@/shared/types'
import type { ApiError, ApiRequestCategory, ApiRequestMeta } from '@/shared/types/http'

interface BackendErrorPayload {
  status?: string
  message?: string
  error?: {
    code?: string
    details?: unknown
  }
}

interface LifeQuestRequestOptions {
  accessTokenOverride?: string | null
  requestMeta?: Partial<ApiRequestMeta>
  retryAttempt?: boolean
}

function getDefaultApiUrl() {
  if (typeof window === 'undefined') {
    return 'http://localhost:4000/api'
  }

  const { hostname, origin } = window.location

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:4000/api'
  }

  return `${origin}/api`
}

function getApiBaseUrl() {
  return import.meta.env.VITE_API_URL?.trim() || getDefaultApiUrl()
}

function extractServerMessage(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'data' in error.response &&
    typeof error.response.data === 'object' &&
    error.response.data !== null &&
    'message' in error.response.data &&
    typeof error.response.data.message === 'string'
  ) {
    return error.response.data.message.trim()
  }

  return ''
}

function extractServerDetails(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'data' in error.response &&
    typeof error.response.data === 'object' &&
    error.response.data !== null
  ) {
    return error.response.data
  }

  return undefined
}

function normalizeRequestMeta(
  category: ApiRequestCategory,
  config: AxiosRequestConfig,
  requestMeta?: Partial<ApiRequestMeta>,
): ApiRequestMeta {
  return {
    category,
    endpoint: config.url,
    method: (config.method?.toUpperCase() as ApiRequestMeta['method']) ?? 'GET',
    requestId: requestMeta?.requestId ?? null,
    userId: requestMeta?.userId ?? null,
    deviceId: requestMeta?.deviceId ?? null,
    timeoutMs: requestMeta?.timeoutMs ?? config.timeout,
    skipAuthRefresh: requestMeta?.skipAuthRefresh ?? false,
    idempotency: requestMeta?.idempotency ?? null,
  }
}

function normalizeRequestError(
  error: unknown,
  category: ApiRequestCategory,
  requestMeta: ApiRequestMeta,
): ApiError {
  const serverMessage = extractServerMessage(error)
  const serverDetails = extractServerDetails(error)

  return normalizeApiError({
    ...(typeof error === 'object' && error !== null ? error : {}),
    message: serverMessage || (error instanceof Error ? error.message : ''),
    category,
    requestMeta,
    details: serverDetails,
    response:
      typeof error === 'object' &&
      error !== null &&
      'response' in error &&
      typeof error.response === 'object'
        ? error.response
        : undefined,
  })
}

function buildHeaders(
  headers: AxiosRequestConfig['headers'],
  accessToken: string | null,
  requestMeta: ApiRequestMeta,
) {
  const nextHeaders = new AxiosHeaders()

  if (headers) {
    const source =
      headers instanceof AxiosHeaders
        ? headers.toJSON()
        : (headers as Record<string, unknown>)

    Object.entries(source).forEach(([key, value]) => {
      if (value != null) {
        nextHeaders.set(key, String(value))
      }
    })
  }

  if (accessToken) {
    nextHeaders.set('Authorization', `Bearer ${accessToken}`)
  }

  if (requestMeta.idempotency) {
    nextHeaders.set('X-Idempotency-Key', createRequestIdempotencyKey(requestMeta.idempotency))
  }

  return nextHeaders
}

async function tryRefreshAccessToken() {
  if (refreshPromise) {
    return refreshPromise
  }

  refreshPromise = requestPublic<RefreshResponse>(
    {
      url: '/auth/refresh',
      method: 'POST',
    },
    {
      endpoint: '/auth/refresh',
      method: 'POST',
      skipAuthRefresh: true,
    },
  )
    .then((response) => {
      setApiAccessToken(response.tokens.accessToken)
      return response.tokens.accessToken
    })
    .catch((error) => {
      clearApiAccessToken()
      throw error
    })
    .finally(() => {
      refreshPromise = null
    })

  return refreshPromise
}

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 10_000,
  withCredentials: true,
})

let accessTokenInMemory: string | null = null
let refreshPromise: Promise<string> | null = null

export function setApiAccessToken(accessToken: string | null) {
  accessTokenInMemory = accessToken?.trim() || null
}

export function getApiAccessToken() {
  return accessTokenInMemory
}

export function clearApiAccessToken() {
  accessTokenInMemory = null
}

export async function requestPublic<T>(
  config: AxiosRequestConfig,
  requestMeta?: Partial<ApiRequestMeta>,
) {
  const normalizedRequestMeta = normalizeRequestMeta('public', config, requestMeta)

  try {
    const response = await apiClient.request<T>({
      ...config,
      headers: buildHeaders(config.headers, null, normalizedRequestMeta),
    })

    return response.data
  } catch (error) {
    throw normalizeRequestError(error, 'public', normalizedRequestMeta)
  }
}

export async function requestProtected<T>(
  config: AxiosRequestConfig,
  options: LifeQuestRequestOptions = {},
) {
  const normalizedRequestMeta = normalizeRequestMeta('protected', config, options.requestMeta)
  const activeAccessToken = options.accessTokenOverride ?? getApiAccessToken()

  try {
    const response = await apiClient.request<T>({
      ...config,
      headers: buildHeaders(config.headers, activeAccessToken, normalizedRequestMeta),
    })

    return response.data
  } catch (error) {
    const normalizedError = normalizeRequestError(error, 'protected', normalizedRequestMeta)

    if (
      options.retryAttempt ||
      !isProtectedRequest(normalizedRequestMeta.category) ||
      !shouldTriggerRefresh(normalizedError)
    ) {
      throw normalizedError
    }

    try {
      const refreshedAccessToken = await tryRefreshAccessToken()

      return await requestProtected<T>(config, {
        ...options,
        accessTokenOverride: refreshedAccessToken,
        retryAttempt: true,
      })
    } catch (refreshError) {
      clearApiAccessToken()
      throw normalizeRequestError(refreshError, 'public', {
        category: 'public',
        endpoint: '/auth/refresh',
        method: 'POST',
        requestId: null,
        userId: normalizedRequestMeta.userId,
        deviceId: normalizedRequestMeta.deviceId,
        timeoutMs: normalizedRequestMeta.timeoutMs,
        skipAuthRefresh: true,
        idempotency: null,
      })
    }
  }
}

export type { BackendErrorPayload }
