import { Router } from 'express'

import { env } from '../config/env.js'
import { getMongoStatus } from '../db/mongoose.js'

const router = Router()

function getHealthMongoStatus(): 'connected' | 'disconnected' {
  return getMongoStatus() === 'connected' ? 'connected' : 'disconnected'
}

router.get('/', (_request, response) => {
  response.json({
    status: 'ok',
    service: env.serviceName,
    timestamp: new Date().toISOString(),
    mongo: getHealthMongoStatus(),
  })
})

router.get('/ready', (_request, response) => {
  const mongoConnected = getMongoStatus() === 'connected'

  response.status(mongoConnected ? 200 : 503).json({
    status: mongoConnected ? 'ok' : 'degraded',
    service: env.serviceName,
    timestamp: new Date().toISOString(),
    mongo: mongoConnected ? 'connected' : 'disconnected',
  })
})

export { router as healthRouter }
