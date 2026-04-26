import { Router } from 'express'

import { loginController, logoutController, meController, refreshController, registerController } from './auth.controller.js'
import { requireAuth } from './auth.middleware.js'

const router = Router()

router.post('/register', registerController)
router.post('/login', loginController)
router.post('/refresh', refreshController)
router.post('/logout', logoutController)
router.get('/me', requireAuth, meController)

export { router as authRouter }
