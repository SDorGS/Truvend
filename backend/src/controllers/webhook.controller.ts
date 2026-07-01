import crypto from 'crypto'

import type { Request, Response } from 'express'

import { supabase } from '../lib/supabase'

interface NombaWebhookPayload {
  event_type: string
  requestId: string
  data: {
    merchant: { walletId: string; walletBalance: number; userId: string }
    terminal: Record<string, unknown>
    transaction: {
      transactionId: string
      type: string
      time: string
      responseCode: string
      transactionAmount?: number
      merchantTxRef?: string
    }
    // Present on checkout webhooks — orderReference lives here, not in transaction
    order?: {
      orderReference?: string
      amount?: number
      accountId?: string
    }
    customer: Record<string, unknown>
  }
}

function verifySignature(
  payload: NombaWebhookPayload,
  receivedSig: string,
  nombaTimestamp: string,
  secret: string
): boolean {
  const { event_type, requestId, data } = payload
  const { merchant, transaction } = data

  // Treat "null" string and missing responseCode as empty string — per Nomba docs
  const responseCode =
    !transaction.responseCode || transaction.responseCode === 'null'
      ? ''
      : transaction.responseCode

  const hashPayload = [
    event_type,
    requestId,
    merchant.userId,
    merchant.walletId,
    transaction.transactionId,
    transaction.type,
    transaction.time,
    responseCode,
    nombaTimestamp,
  ].join(':')

  const computed = crypto
    .createHmac('sha256', secret)
    .update(hashPayload)
    .digest('base64')

  // Case-insensitive comparison per Nomba docs
  return computed.toLowerCase() === receivedSig.toLowerCase()
}

export async function handleNombaWebhook(req: Request, res: Response): Promise<void> {
  // HTTP header names are case-insensitive — read in lowercase (Express normalises them)
  const receivedSig = req.headers['nomba-signature'] as string | undefined
  const nombaTimestamp = req.headers['nomba-timestamp'] as string | undefined
  const secret = process.env.NOMBA_WEBHOOK_SECRET

  // Verify signature when the secret is configured
  if (secret) {
    if (!receivedSig || !nombaTimestamp) {
      res.status(401).json({ error: true, code: 'MISSING_SIGNATURE', message: 'Missing Nomba signature headers.' })
      return
    }
    const valid = verifySignature(req.body as NombaWebhookPayload, receivedSig, nombaTimestamp, secret)
    if (!valid) {
      res.status(401).json({ error: true, code: 'INVALID_SIGNATURE', message: 'Webhook signature verification failed.' })
      return
    }
  }

  // Acknowledge receipt immediately — Nomba retries on non-2XX (up to 5 times, exponential backoff)
  res.status(200).json({ received: true })

  // All further processing is async after the response
  const payload = req.body as NombaWebhookPayload

  if (payload.event_type !== 'payment_success') return

  // For checkout payments, orderReference lives in data.order.orderReference.
  // For VA transfers, fall back to transaction.merchantTxRef.
  const orderRef =
    payload.data?.order?.orderReference ??
    payload.data?.transaction?.merchantTxRef

  if (!orderRef) {
    console.warn('[webhook] payment_success received — no order reference in payload:', JSON.stringify(payload.data))
    return
  }

  const { error } = await supabase
    .from('orders')
    .update({ status: 'paid', updated_at: new Date().toISOString() })
    .eq('nomba_order_ref', orderRef)
    .eq('status', 'pending')

  if (error) {
    console.error(`[webhook] Failed to update order ${orderRef}:`, error)
  } else {
    console.log(`[webhook] Order ${orderRef} marked as paid`)
  }
}
