import type { Request, Response, NextFunction } from 'express'

import * as messagesService from '../services/messages.service'
import { AppError } from '../middleware/error.middleware'

export async function getMessages(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const messages = await messagesService.getOrderMessages(req.params.id, req.user!.id)
    res.json(messages)
  } catch (err) {
    next(err)
  }
}

export async function postMessage(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { body } = req.body as { body?: string }

    if (typeof body !== 'string') {
      throw new AppError(400, 'INVALID_INPUT', 'body is required.')
    }

    const message = await messagesService.sendMessage(req.params.id, req.user!.id, body)
    res.status(201).json(message)
  } catch (err) {
    next(err)
  }
}
