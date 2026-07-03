import { Router } from 'express'

import { requireAuth } from '../middleware/auth.middleware'
import * as ordersController from '../controllers/orders.controller'
import messagesRouter from './messages'

const router = Router()

router.get('/', requireAuth, ordersController.listBuyerOrders)
router.post('/checkout', requireAuth, ordersController.checkout)
router.get('/:id', requireAuth, ordersController.getOrderById)
router.post('/:id/confirm-delivery', requireAuth, ordersController.confirmDelivery)
router.post('/:id/dispute', requireAuth, ordersController.raiseDispute)
router.post('/:id/request-refund', requireAuth, ordersController.requestRefund)

// Order-scoped chat: /api/orders/:id/messages
router.use('/:id/messages', messagesRouter)

export default router
