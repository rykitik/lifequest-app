import type { Request, Response } from 'express'

import { AppError } from '../../shared/errors/AppError.js'
import { asyncHandler } from '../../shared/utils/asyncHandler.js'
import { getSettingsProfile, updateSettingsProfile } from './settings.service.js'

export const getSettingsProfileController = asyncHandler(async (request: Request, response: Response) => {
  if (!request.user?.id) {
    throw new AppError('Требуется авторизация.', 401, {
      code: 'unauthorized',
    })
  }

  const profile = await getSettingsProfile(request.user.id)
  response.status(200).json({ profile })
})

export const updateSettingsProfileController = asyncHandler(async (request: Request, response: Response) => {
  if (!request.user?.id) {
    throw new AppError('Требуется авторизация.', 401, {
      code: 'unauthorized',
    })
  }

  const body =
    request.body && typeof request.body === 'object' && !Array.isArray(request.body)
      ? (request.body as Record<string, unknown>)
      : {}

  const profile = await updateSettingsProfile(request.user.id, {
    userName: body.userName,
    userRole: body.userRole,
    preferredTone: body.preferredTone,
    deviceId: body.deviceId,
    body,
  })

  response.status(200).json({ profile })
})
