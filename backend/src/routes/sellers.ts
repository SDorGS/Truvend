import { Router } from 'express'

import { requireAuth } from '../middleware/auth.middleware'
import * as sellersController from '../controllers/sellers.controller'

const router = Router()

router.get('/virtual-account', requireAuth, sellersController.getVirtualAccount)
router.get('/orders', requireAuth, sellersController.listSellerOrders)
router.get('/payouts', requireAuth, sellersController.listSellerPayouts)
router.post('/orders/:id/dispatch', requireAuth, sellersController.dispatch)

export default router
