import { Router } from 'express'

import { requireAuth } from '../middleware/auth.middleware'
import * as ordersController from '../controllers/orders.controller'

const router = Router()

router.post('/checkout', requireAuth, ordersController.checkout)
router.get('/:id', requireAuth, ordersController.getOrderById)
router.post('/:id/confirm-delivery', requireAuth, ordersController.confirmDelivery)
router.post('/:id/dispute', requireAuth, ordersController.raiseDispute)

export default router
