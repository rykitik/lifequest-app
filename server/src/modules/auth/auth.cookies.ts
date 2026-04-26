import type { CookieOptions, Request, Response } from 'express'

import { env } from '../../config/env.js'

export const REFRESH_COOKIE_NAME = 'lifequest_refresh'
const REFRESH_COOKIE_PATH = '/api/auth'

function getRefreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSameSite,
    path: REFRESH_COOKIE_PATH,
    maxAge: env.refreshTokenTtlMs,
    ...(env.cookieDomain ? { domain: env.cookieDomain } : {}),
  }
}

export function setRefreshTokenCookie(response: Response, refreshToken: string): void {
  response.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions())
}

export function clearRefreshTokenCookie(response: Response): void {
  response.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSameSite,
    path: REFRESH_COOKIE_PATH,
    ...(env.cookieDomain ? { domain: env.cookieDomain } : {}),
  })
}

export function getRefreshTokenFromRequest(request: Request): string | null {
  const refreshToken = request.cookies?.[REFRESH_COOKIE_NAME]

  return typeof refreshToken === 'string' && refreshToken.trim() ? refreshToken : null
}
