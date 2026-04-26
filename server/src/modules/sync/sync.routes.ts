import { Router } from 'express'

import { requireAuth } from '../auth/auth.middleware.js'
import { getSyncBootstrapController } from './sync.controller.js'

const syncRouter = Router()

syncRouter.get('/bootstrap', requireAuth, getSyncBootstrapController)

export { syncRouter }
