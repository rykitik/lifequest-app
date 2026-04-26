import type { ErrorRequestHandler } from 'express'

import { env } from '../config/env.js'
import { AppError } from '../shared/errors/AppError.js'

export const errorMiddleware: ErrorRequestHandler = (error, _request, response, next) => {
  void next

  const normalizedError =
    error instanceof AppError
      ? error
      : new AppError('Внутренняя ошибка сервера.', 500, {
          code: 'internal_error',
          expose: false,
          details: error,
        })

  const message = normalizedError.expose ? normalizedError.message : 'Внутренняя ошибка сервера.'
  const details = env.nodeEnv === 'development' ? normalizedError.details : undefined

  response.status(normalizedError.statusCode).json({
    status: 'error',
    message,
    error: {
      code: normalizedError.code,
      ...(details ? { details } : {}),
    },
  })
}
