import type { Request, Response, NextFunction } from 'express'

import * as listingsService from '../services/listings.service'
import { uploadListingPhoto } from '../services/uploads.service'
import { AppError } from '../middleware/error.middleware'

export async function getListings(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const listings = await listingsService.getActiveListings()
    res.json(listings)
  } catch (err) {
    next(err)
  }
}

export async function getListingById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const listing = await listingsService.getListing(req.params.id)
    res.json(listing)
  } catch (err) {
    next(err)
  }
}

export async function createListing(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { title, description, price, photo_url } = req.body as {
      title?: string
      description?: string
      price?: number
      photo_url?: string | null
    }

    if (!title || !description || price === undefined || price === null) {
      throw new AppError(400, 'INVALID_INPUT', 'title, description, and price are required.')
    }

    const listing = await listingsService.createListing(req.user!.id, {
      title,
      description,
      price,
      photo_url,
    })
    res.status(201).json(listing)
  } catch (err) {
    next(err)
  }
}

export async function updateListing(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { title, description, price, photo_url } = req.body as {
      title?: string
      description?: string
      price?: number
      photo_url?: string | null
    }

    const listing = await listingsService.updateListing(req.params.id, req.user!.id, {
      title,
      description,
      price,
      photo_url,
    })
    res.json(listing)
  } catch (err) {
    next(err)
  }
}

export async function deleteListing(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await listingsService.deleteListing(req.params.id, req.user!.id)
    res.status(204).send()
  } catch (err) {
    next(err)
  }
}

// Phase 10 Unit 10.4: standalone photo upload. The frontend uploads first,
// receives { photo_url }, then submits the listing form JSON with that URL
// already in hand — so createListing/updateListing stay JSON-only.
export async function uploadPhoto(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.file) {
      throw new AppError(400, 'MISSING_FILE', 'No photo was uploaded. Attach a "photo" field.')
    }

    const photoUrl = await uploadListingPhoto(req.file.buffer, req.file.mimetype, req.user!.id)
    res.status(201).json({ photo_url: photoUrl })
  } catch (err) {
    next(err)
  }
}
