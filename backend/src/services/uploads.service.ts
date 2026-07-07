import { randomUUID } from 'crypto'

import { supabase } from '../lib/supabase'
import { AppError } from '../middleware/error.middleware'

const BUCKET = 'listing-photos'

// Phase 10 Unit 10.3: uploads a listing photo to Supabase Storage and returns
// the public URL. Path convention `listings/{sellerId}/{uuid}.{ext}` keeps a
// seller's uploads grouped and avoids collisions across sellers.
const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export async function uploadListingPhoto(
  fileBuffer: Buffer,
  mimeType: string,
  sellerId: string
): Promise<string> {
  const ext = EXTENSIONS[mimeType]
  if (!ext) {
    // The multer file filter should have caught this already — this branch
    // exists to keep the service self-contained against callers that bypass
    // the middleware (tests, direct calls).
    throw new AppError(400, 'INVALID_FILE_TYPE', 'Only JPEG, PNG, or WebP images are allowed.')
  }

  const path = `listings/${sellerId}/${randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, fileBuffer, {
    contentType: mimeType,
    upsert: false,
  })

  if (uploadError) {
    console.error('[uploads] uploadListingPhoto upload:', uploadError)
    throw new AppError(500, 'UPLOAD_FAILED', 'Could not upload photo. Please try again.')
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  if (!data?.publicUrl) {
    throw new AppError(500, 'UPLOAD_FAILED', 'Uploaded photo but could not resolve its URL.')
  }

  return data.publicUrl
}
