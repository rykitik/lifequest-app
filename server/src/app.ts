import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'

import { env } from './config/env.js'
import { errorMiddleware } from './middleware/errorMiddleware.js'
import { notFoundMiddleware } from './middleware/notFoundMiddleware.js'
import { requestLogger } from './middleware/requestLogger.js'
import { apiRouter } from './routes/index.js'

export function createApp() {
  const app = express()

  app.disable('x-powered-by')

  app.use(
    cors({
      origin: env.clientOrigin,
      credentials: true,
    }),
  )
  app.use(helmet())
  app.use(express.json())
  app.use(cookieParser())
  app.use(requestLogger)

  app.use('/api', apiRouter)

  app.use(notFoundMiddleware)
  app.use(errorMiddleware)

  return app
}
