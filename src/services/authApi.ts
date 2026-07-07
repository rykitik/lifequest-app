import { requestProtected, requestPublic } from '@/services/apiClient'
import type {
  AuthResponse,
  LoginRequest,
  LogoutResponse,
  RefreshResponse,
  RegisterRequest,
} from '@/shared/types'

interface AuthMeResponse {
  user: AuthResponse['user']
  session: AuthResponse['session']
}

function normalizeAuthUser(user: AuthResponse['user']): AuthResponse['user'] {
  return {
    ...user,
    userId: user.userId ?? user.id,
  }
}

function normalizeAuthResponse(response: AuthResponse): AuthResponse {
  return {
    ...response,
    user: normalizeAuthUser(response.user),
    session: {
      ...response.session,
      user: response.session.user ? normalizeAuthUser(response.session.user) : response.session.user,
    },
  }
}

function normalizeAuthMeResponse(response: AuthMeResponse): AuthMeResponse {
  return {
    ...response,
    user: normalizeAuthUser(response.user),
    session: {
      ...response.session,
      user: response.session.user ? normalizeAuthUser(response.session.user) : response.session.user,
    },
  }
}

export function register(input: RegisterRequest) {
  return requestPublic<AuthResponse>(
    {
      url: '/auth/register',
      method: 'POST',
      data: input,
    },
    {
      endpoint: '/auth/register',
      method: 'POST',
    },
  ).then(normalizeAuthResponse)
}

export function login(input: LoginRequest) {
  return requestPublic<AuthResponse>(
    {
      url: '/auth/login',
      method: 'POST',
      data: input,
    },
    {
      endpoint: '/auth/login',
      method: 'POST',
    },
  ).then(normalizeAuthResponse)
}

export function refresh() {
  return requestPublic<RefreshResponse>(
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
}

export function logout() {
  return requestPublic<LogoutResponse>(
    {
      url: '/auth/logout',
      method: 'POST',
    },
    {
      endpoint: '/auth/logout',
      method: 'POST',
      skipAuthRefresh: true,
    },
  )
}

export function me(accessToken?: string | null) {
  return requestProtected<AuthMeResponse>(
    {
      url: '/auth/me',
      method: 'GET',
    },
    {
      accessTokenOverride: accessToken,
      requestMeta: {
        endpoint: '/auth/me',
        method: 'GET',
      },
    },
  ).then(normalizeAuthMeResponse)
}
