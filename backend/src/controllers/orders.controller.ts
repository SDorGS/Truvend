import type { Request, Response, NextFunction } from 'express'

import * as ordersService from '../services/orders.service'
import { AppError } from '../middleware/error.middleware'

export async function checkout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { listingId } = req.body as { listingId?: string }
    if (!listingId) throw new AppError(400, 'INVALID_INPUT', 'listingId is required.')

    const order = await ordersService.createOrder(listingId, req.user!.id)
    res.status(201).json(order)
  } catch (err) {
    next(err)
  }
}

export async function getOrderById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const order = await ordersService.getOrder(req.params.id, req.user!.id)
    res.json(order)
  } catch (err) {
    next(err)
  }
}

export async function confirmDelivery(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const order = await ordersService.confirmDelivery(req.params.id, req.user!.id)
    res.json(order)
  } catch (err) {
    next(err)
  }
}

export async function raiseDispute(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const order = await ordersService.raiseDispute(req.params.id, req.user!.id)
    res.json(order)
  } catch (err) {
    next(err)
  }
}
