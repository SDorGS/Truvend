import { Router } from 'express'

import { requireAuth } from '../middleware/auth.middleware'
import { uploadListingPhoto } from '../middleware/upload.middleware'
import * as listingsController from '../controllers/listings.controller'

const router = Router()

router.get('/', listingsController.getListings)
// Photo upload registered before `/:id` so it can't be shadowed by a future
// `GET /:id` variant, even though POST vs GET makes the collision inert today.
router.post('/photo', requireAuth, uploadListingPhoto, listingsController.uploadPhoto)
router.get('/:id', listingsController.getListingById)
router.post('/', requireAuth, listingsController.createListing)
router.put('/:id', requireAuth, listingsController.updateListing)
router.delete('/:id', requireAuth, listingsController.deleteListing)

export default router
