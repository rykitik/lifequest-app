import type { NextFunction, Request, Response } from 'express'

import { AppError } from '../shared/errors/AppError.js'

export function notFoundMiddleware(request: Request, _response: Response, next: NextFunction): void {
  next(
    new AppError(`Маршрут ${request.method} ${request.originalUrl} не найден.`, 404, {
      code: 'route_not_found',
    }),
  )
}
