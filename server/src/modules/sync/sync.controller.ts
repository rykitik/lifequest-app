import type { Request, Response } from 'express'

import { AppError } from '../../shared/errors/AppError.js'
import { asyncHandler } from '../../shared/utils/asyncHandler.js'
import { getSyncBootstrapState } from './sync.service.js'

export const getSyncBootstrapController = asyncHandler(async (request: Request, response: Response) => {
  if (!request.user?.id) {
    throw new AppError('Требуется авторизация.', 401, {
      code: 'unauthorized',
    })
  }

  const bootstrapState = await getSyncBootstrapState(request.user.id)

  response.status(200).json(bootstrapState)
})
