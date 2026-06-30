import type { Request, Response, NextFunction } from 'express'
import { supabase } from '../lib/supabase'
import { AppError } from './error.middleware'

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

  req.user = user
  next()
}
