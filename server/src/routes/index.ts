import { Router } from 'express'

import { authRouter } from '../modules/auth/auth.routes.js'
import { healthRouter } from './health.routes.js'

const router = Router()

router.use('/auth', authRouter)
router.use('/health', healthRouter)

export { router as apiRouter }
