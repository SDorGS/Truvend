import multer from 'multer'
import type { Request, Response, NextFunction } from 'express'

import { AppError } from './error.middleware'

// Unit 10.2: memory storage only. Uploaded files go straight to Supabase
// Storage from the buffer — nothing hits the container's filesystem, which
// matters on Railway where the container is ephemeral and read-only outside
// /tmp anyway.
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024 // 5 MB

const storage = multer.memoryStorage()

export const uploadListingPhotoMiddleware = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      // Multer wraps thrown/passed errors into a MulterError-like shape. We
      // pass an AppError so the central error handler formats it into the
      // standard { error, code, message } contract instead of leaking a raw
      // multer message string to the frontend.
      cb(new AppError(400, 'INVALID_FILE_TYPE', 'Only JPEG, PNG, or WebP images are allowed.'))
      return
    }
    cb(null, true)
  },
}).single('photo')

// Wrap multer so its size-limit and internal errors surface through our normal
// error middleware with a friendly message the frontend can render as-is.
export function uploadListingPhoto(req: Request, res: Response, next: NextFunction): void {
  uploadListingPhotoMiddleware(req, res, (err: unknown) => {
    if (!err) {
      next()
      return
    }

    if (err instanceof AppError) {
      next(err)
      return
    }

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        next(new AppError(400, 'FILE_TOO_LARGE', 'Image is too large. Maximum size is 5 MB.'))
        return
      }
      next(new AppError(400, 'UPLOAD_ERROR', err.message))
      return
    }

    next(err)
  })
}
