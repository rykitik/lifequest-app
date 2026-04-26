import type { NextFunction, Request, Response } from 'express'

import { AppError } from '../../shared/errors/AppError.js'
import { verifyAccessToken } from './auth.tokens.js'

export function requireAuth(request: Request, _response: Response, next: NextFunction): void {
  const authorizationHeader = request.headers.authorization

  if (!authorizationHeader?.startsWith('Bearer ')) {
    next(
      new AppError('Требуется авторизация.', 401, {
        code: 'unauthorized',
      }),
    )
    return
  }

  const token = authorizationHeader.slice('Bearer '.length).trim()

  if (!token) {
    next(
      new AppError('Access token не передан.', 401, {
        code: 'unauthorized',
      }),
    )
    return
  }

  const payload = verifyAccessToken(token)

  request.user = {
    id: payload.sub,
    email: payload.email,
    role: payload.role,
  }

  next()
}
