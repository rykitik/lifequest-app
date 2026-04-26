export interface AppErrorOptions {
  code?: string
  expose?: boolean
  details?: unknown
}

export class AppError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly expose: boolean
  public readonly details?: unknown

  constructor(message: string, statusCode = 500, options: AppErrorOptions = {}) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = options.code ?? 'internal_error'
    this.expose = options.expose ?? statusCode < 500
    this.details = options.details
  }
}
