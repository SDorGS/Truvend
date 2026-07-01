import { Router } from 'express'

import { handleNombaWebhook } from '../controllers/webhook.controller'

const router = Router()

// Not behind requireAuth — Nomba calls this directly.
// Signature verification to be wired once Nomba confirms the signing mechanism.
router.post('/nomba', handleNombaWebhook)

export default router
