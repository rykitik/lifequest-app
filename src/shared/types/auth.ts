export type AuthMode = 'local' | 'account'

export type AuthStatus =
  | 'local'
  | 'unauthenticated'
  | 'authenticating'
  | 'authenticated'
  | 'refreshing'
  | 'logging_out'
  | 'error'

export type AuthErrorCode =
  | 'account_exists'
  | 'invalid_credentials'
  | 'refresh_expired'
  | 'session_not_found'
  | 'unauthorized'
  | 'forbidden'
  | 'validation_error'
  | 'migration_failed'
  | 'conflict_detected'
  | 'network_error'
  | 'unknown'

export interface AuthUser {
  id: string
  userId: string
  email: string
  name: string
  title?: string
  timezone?: string
  createdAt?: string
  updatedAt?: string
}

export interface AuthTokens {
  accessToken: string
  expiresAt: string
  tokenType: 'Bearer'
}

export interface AuthSession {
  mode: AuthMode
  status: AuthStatus
  user: AuthUser | null
  deviceId?: string | null
  lastAuthenticatedAt?: string | null
  needsMigration?: boolean
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
}

export interface AuthResponse {
  user: AuthUser
  session: AuthSession
  tokens: AuthTokens
}

export interface RefreshResponse {
  session: AuthSession
  tokens: AuthTokens
}

export interface LogoutResponse {
  success: boolean
  mode: AuthMode
}

export interface MigrateLocalRequest {
  deviceId: string
  strategy: 'backup' | 'sync_payload'
  payload: {
    data?: Record<string, string>
    collections?: Record<string, unknown>
  }
}

export interface MigrateLocalResponse {
  success: boolean
  userId: string
  importedCollections: string[]
  conflicts?: Array<{
    collection: string
    entityId: string
    reason: string
  }>
  latestSyncCursor?: string | null
}
