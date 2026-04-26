import { Router } from 'express'

import { authRouter } from '../modules/auth/auth.routes.js'
import { syncRouter } from '../modules/sync/sync.routes.js'
import { healthRouter } from './health.routes.js'

const router = Router()

router.use('/auth', authRouter)
router.use('/sync', syncRouter)
router.use('/health', healthRouter)

export { router as apiRouter }
