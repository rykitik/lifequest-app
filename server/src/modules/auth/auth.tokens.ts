import jwt, { type SignOptions } from 'jsonwebtoken'

import { env } from '../../config/env.js'
import { AppError } from '../../shared/errors/AppError.js'
import type { PublicUser } from '../users/user.types.js'
import type {
  AuthTokenInfo,
  JwtAccessPayload,
  JwtRefreshPayload,
} from './auth.types.js'

function assertJwtObject(payload: string | JwtAccessPayload | JwtRefreshPayload): JwtAccessPayload | JwtRefreshPayload {
  if (typeof payload === 'string') {
    throw new AppError('Невалидный формат токена.', 401, {
      code: 'invalid_token',
    })
  }

  return payload
}

export function createAccessTokenInfo(user: Pick<PublicUser, 'id' | 'email' | 'role'>): AuthTokenInfo {
  const payload: Omit<JwtAccessPayload, 'iat' | 'exp'> = {
    sub: user.id,
    email: user.email,
    role: user.role,
    type: 'access',
  }

  const accessToken = jwt.sign(payload, env.jwtAccessSecret, {
    expiresIn: env.accessTokenTtl as SignOptions['expiresIn'],
  })

  return {
    accessToken,
    expiresAt: new Date(Date.now() + env.accessTokenTtlMs).toISOString(),
    tokenType: 'Bearer',
  }
}

export function createRefreshToken(userId: string): string {
  const payload: Omit<JwtRefreshPayload, 'iat' | 'exp'> = {
    sub: userId,
    type: 'refresh',
  }

  return jwt.sign(payload, env.jwtRefreshSecret, {
    expiresIn: env.refreshTokenTtl as SignOptions['expiresIn'],
  })
}

export function verifyAccessToken(token: string): JwtAccessPayload {
  try {
    const payload = assertJwtObject(jwt.verify(token, env.jwtAccessSecret) as string | JwtAccessPayload)

    if (payload.type !== 'access' || !payload.sub || !payload.email || !payload.role) {
      throw new AppError('Невалидный access token.', 401, {
        code: 'invalid_access_token',
      })
    }

    return payload as JwtAccessPayload
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }

    throw new AppError('Access token недействителен или истёк.', 401, {
      code: 'invalid_access_token',
      details: error,
    })
  }
}

export function verifyRefreshToken(token: string): JwtRefreshPayload {
  try {
    const payload = assertJwtObject(jwt.verify(token, env.jwtRefreshSecret) as string | JwtRefreshPayload)

    if (payload.type !== 'refresh' || !payload.sub) {
      throw new AppError('Невалидный refresh token.', 401, {
        code: 'invalid_refresh_token',
      })
    }

    return payload as JwtRefreshPayload
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }

    throw new AppError('Refresh token недействителен или истёк.', 401, {
      code: 'invalid_refresh_token',
      details: error,
    })
  }
}
