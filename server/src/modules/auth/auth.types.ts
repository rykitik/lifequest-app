import type { JwtPayload } from 'jsonwebtoken'

import type { PublicUser, UserRole } from '../users/user.types.js'

export type AuthUser = PublicUser

export interface AuthSessionInfo {
  mode: 'account'
  status: 'authenticated'
}

export interface AuthTokenInfo {
  accessToken: string
  expiresAt: string
  tokenType: 'Bearer'
}

export interface AuthResponse {
  user: AuthUser
  session: AuthSessionInfo
  tokens: AuthTokenInfo
}

export interface RefreshResponse {
  session: AuthSessionInfo
  tokens: AuthTokenInfo
}

export interface AuthenticatedRequestUser {
  id: string
  email: string
  role: UserRole
}

export interface JwtAccessPayload extends JwtPayload {
  sub: string
  email: string
  role: UserRole
  type: 'access'
}

export interface JwtRefreshPayload extends JwtPayload {
  sub: string
  tokenVersion?: number
  type: 'refresh'
}
