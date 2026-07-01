import type { Request, Response, NextFunction } from 'express'

import { getOrCreateVirtualAccount } from '../services/sellers.service'
import {
  getSellerOrders,
  getSellerPayouts,
  dispatchOrder,
} from '../services/orders.service'

export async function getVirtualAccount(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const account = await getOrCreateVirtualAccount(req.user!.id)
    res.json(account)
  } catch (err) {
    next(err)
  }
}

export async function listSellerOrders(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const orders = await getSellerOrders(req.user!.id)
    res.json(orders)
  } catch (err) {
    next(err)
  }
}

export async function listSellerPayouts(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const payouts = await getSellerPayouts(req.user!.id)
    res.json(payouts)
  } catch (err) {
    next(err)
  }
}

export async function dispatch(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const order = await dispatchOrder(req.params.id, req.user!.id)
    res.json(order)
  } catch (err) {
    next(err)
  }
}
