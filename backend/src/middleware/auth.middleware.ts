import type { Request, Response, NextFunction } from 'express'
import { supabase } from '../lib/supabase'
import { AppError } from './error.middleware'

// Lazy-provision the app's `users` row for a Supabase auth user on first
// authenticated request. Supabase Auth manages auth.users but our foreign
// keys (orders.buyer_id, listings.seller_id) reference our own users table.
// Without this, a fresh signup 500s on the first order/listing insert.
async function ensureUserRow(
  id: string,
  metadata: Record<string, unknown>
): Promise<void> {
  const rawRole = (metadata.role as string | undefined)?.toLowerCase()
  const role = rawRole === 'seller' ? 'seller' : 'buyer'

  const rawName = (metadata.name as string | undefined)
    ?? (metadata.display_name as string | undefined)
    ?? (metadata.full_name as string | undefined)
    ?? ''
  const displayName = rawName.trim() || 'Truvend User'

  const { error } = await supabase
    .from('users')
    .upsert(
      { id, role, display_name: displayName },
      { onConflict: 'id', ignoreDuplicates: true }
    )

  if (error) {
    // Don't block the request — the FK error downstream is more actionable
    // than a generic 500 here. Log for visibility.
    console.error('[auth] ensureUserRow upsert failed:', error)
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    next(new AppError(401, 'UNAUTHENTICATED', 'Missing or invalid authorization header.'))
    return
  }

  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    next(new AppError(401, 'UNAUTHENTICATED', 'Invalid or expired token.'))
    return
  }

  await ensureUserRow(user.id, user.user_metadata ?? {})

  req.user = user
  next()
}
