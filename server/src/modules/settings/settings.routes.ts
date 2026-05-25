import { Router } from 'express'

import { requireAuth } from '../auth/auth.middleware.js'
import { getSettingsProfileController, updateSettingsProfileController } from './settings.controller.js'

const router = Router()

router.get('/profile', requireAuth, getSettingsProfileController)
router.put('/profile', requireAuth, updateSettingsProfileController)

export { router as settingsRouter }
