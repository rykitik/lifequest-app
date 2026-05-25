import type { Request, Response } from 'express'

import { AppError } from '../../shared/errors/AppError.js'
import { asyncHandler } from '../../shared/utils/asyncHandler.js'
import { getOrCreateSettingsProfile, updateSettingsProfile } from './settings.service.js'

export const getSettingsProfileController = asyncHandler(async (request: Request, response: Response) => {
  if (!request.user?.id) {
    throw new AppError('Требуется авторизация.', 401, {
      code: 'unauthorized',
    })
  }

  const profile = await getOrCreateSettingsProfile(request.user.id)
  response.json({ profile })
})

export const updateSettingsProfileController = asyncHandler(async (request: Request, response: Response) => {
  if (!request.user?.id) {
    throw new AppError('Требуется авторизация.', 401, {
      code: 'unauthorized',
    })
  }

  const profile = await updateSettingsProfile(
    request.user.id,
    typeof request.body === 'object' && request.body !== null ? request.body : {},
  )

  response.json({ profile })
})
