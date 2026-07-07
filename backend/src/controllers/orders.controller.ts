import type { Request, Response, NextFunction } from 'express'

import * as ordersService from '../services/orders.service'
import { AppError } from '../middleware/error.middleware'

export async function listBuyerOrders(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const orders = await ordersService.getBuyerOrders(req.user!.id)
    res.json(orders)
  } catch (err) {
    next(err)
  }
}

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

export async function releaseEscrow(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { code } = req.body as { code?: string }
    if (typeof code !== 'string' || code.length === 0) {
      throw new AppError(400, 'INVALID_INPUT', 'code is required.')
    }

    const order = await ordersService.releaseEscrow(req.params.id, req.user!.id, code)
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

export async function requestRefund(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const order = await ordersService.requestRefund(req.params.id, req.user!.id)
    res.json(order)
  } catch (err) {
    next(err)
  }
}
