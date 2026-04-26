export type ApiErrorCode =
  | 'network_error'
  | 'timeout'
  | 'unauthorized'
  | 'forbidden'
  | 'validation_error'
  | 'conflict'
  | 'schema_mismatch'
  | 'server_error'
  | 'unknown_error'
  | 'auth_expired'
  | 'sync_conflict'

export type ApiRequestCategory = 'public' | 'protected' | 'sync' | 'local_only'

export type HttpClientMode = 'local_only' | 'public' | 'protected'

export interface RequestIdempotencyMeta {
  operation: string
  entityType?: string
  entityId?: string
  userId?: string | null
  deviceId?: string | null
  sourceId?: string | null
  requestSeed?: string | null
}

export interface ApiRequestMeta {
  category: ApiRequestCategory
  endpoint?: string
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  requestId?: string | null
  userId?: string | null
  deviceId?: string | null
  timeoutMs?: number
  skipAuthRefresh?: boolean
  idempotency?: RequestIdempotencyMeta | null
}

export interface ApiResponse<T> {
  data: T
  meta?: {
    requestId?: string | null
    receivedAt?: string | null
    source: 'backend' | 'local_stub'
  }
}

export interface ApiError {
  code: ApiErrorCode
  message: string
  statusCode?: number
  retryable: boolean
  category?: ApiRequestCategory
  requestId?: string | null
  source: 'client' | 'network' | 'server'
  details?: unknown
  requestMeta?: ApiRequestMeta
}

export interface RefreshState {
  status: 'idle' | 'refreshing' | 'resolved' | 'failed'
  pendingRequestCount: number
  startedAt?: string | null
  finishedAt?: string | null
  error?: ApiError | null
}
