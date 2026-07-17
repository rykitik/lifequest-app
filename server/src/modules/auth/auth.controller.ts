import type { Request, Response } from 'express'

import { asyncHandler } from '../../shared/utils/asyncHandler.js'
import { AppError } from '../../shared/errors/AppError.js'
import { clearRefreshTokenCookie, getRefreshTokenFromRequest, setRefreshTokenCookie } from './auth.cookies.js'
import { getCurrentUser, login, refreshSession, register } from './auth.service.js'

export const registerController = asyncHandler(async (request: Request, response: Response) => {
  const authResult = await register({
    email: request.body?.email,
    password: request.body?.password,
    name: request.body?.name,
  })

  setRefreshTokenCookie(response, authResult.refreshToken)
  response.status(201).json(authResult.response)
})

export const loginController = asyncHandler(async (request: Request, response: Response) => {
  const authResult = await login({
    email: request.body?.email,
    password: request.body?.password,
  })

  setRefreshTokenCookie(response, authResult.refreshToken)
  response.json(authResult.response)
})

export const refreshController = asyncHandler(async (request: Request, response: Response) => {
  const refreshToken = getRefreshTokenFromRequest(request)

  if (!refreshToken) {
    clearRefreshTokenCookie(response)

    throw new AppError('Refresh token не найден.', 401, {
      code: 'refresh_missing',
    })
  }

  try {
    const authResult = await refreshSession(refreshToken)
    setRefreshTokenCookie(response, authResult.refreshToken)
    response.json(authResult.response)
  } catch (error) {
    clearRefreshTokenCookie(response)
    throw error
  }
})

export const logoutController = asyncHandler(async (_request: Request, response: Response) => {
  clearRefreshTokenCookie(response)
  response.json({ success: true, mode: 'local' })
})

export const meController = asyncHandler(async (request: Request, response: Response) => {
  if (!request.user) {
    throw new AppError('Требуется авторизация.', 401, {
      code: 'unauthorized',
    })
  }

  const currentUser = await getCurrentUser(request.user.id)
  response.json(currentUser)
})
