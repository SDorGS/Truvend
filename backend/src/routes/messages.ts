import { Router } from 'express'

import { requireAuth } from '../middleware/auth.middleware'
import * as messagesController from '../controllers/messages.controller'

// Nested under /api/orders/:id/messages — chat is order-scoped.
// mergeParams lets this router see :id from the parent path.
const router = Router({ mergeParams: true })

router.get('/', requireAuth, messagesController.getMessages)
router.post('/', requireAuth, messagesController.postMessage)

export default router
