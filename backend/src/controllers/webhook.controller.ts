import crypto from 'crypto'

import type { Request, Response } from 'express'

interface WebhookRequest extends Request {
  rawBody?: string
}

import { supabase } from '../lib/supabase'
import { verifyNombaTransaction } from '../lib/nomba'

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

// -----------------------------------------------------------------------------
// Debug logging
// -----------------------------------------------------------------------------
// Every log line is prefixed with [webhook:<stage>] <correlationId> so you can
// filter one webhook run out of noisy production logs with a single grep, e.g.
//   grep "abc-123" render.log
//
// Correlation id preference order:
//   1. Nomba's own payload.requestId (best — same value repeats across retries)
//   2. A locally-generated short id (fallback when the body is unparseable)
// -----------------------------------------------------------------------------

function shortId(): string {
  return Math.random().toString(36).slice(2, 10)
}

function log(stage: string, cid: string, msg: string, extra?: unknown): void {
  const line = `[webhook:${stage}] ${cid} ${msg}`
  if (extra !== undefined) {
    console.log(line, typeof extra === 'string' ? extra : JSON.stringify(extra))
  } else {
    console.log(line)
  }
}

function warn(stage: string, cid: string, msg: string, extra?: unknown): void {
  const line = `[webhook:${stage}] ${cid} ${msg}`
  if (extra !== undefined) {
    console.warn(line, typeof extra === 'string' ? extra : JSON.stringify(extra))
  } else {
    console.warn(line)
  }
}

function error(stage: string, cid: string, msg: string, extra?: unknown): void {
  const line = `[webhook:${stage}] ${cid} ${msg}`
  if (extra !== undefined) {
    console.error(line, typeof extra === 'string' ? extra : JSON.stringify(extra))
  } else {
    console.error(line)
  }
}

// -----------------------------------------------------------------------------

function verifySignature(
  payload: NombaWebhookPayload,
  receivedSig: string,
  nombaTimestamp: string,
  secret: string,
  cid: string
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

  log('sig', cid, 'hash input:', hashPayload)

  const computed = crypto
    .createHmac('sha256', secret)
    .update(hashPayload)
    .digest('base64')

  const matched = computed.toLowerCase() === receivedSig.toLowerCase()

  log('sig', cid, `computed=${computed}`)
  log('sig', cid, `received=${receivedSig}`)
  log('sig', cid, `match=${matched}`)

  return matched
}

export async function handleNombaWebhook(req: WebhookRequest, res: Response): Promise<void> {
  const cid = (req.body as Partial<NombaWebhookPayload> | undefined)?.requestId ?? shortId()

  // Stage 1 — receipt. Confirms Nomba's request even reached your process.
  log('incoming', cid, `${req.method} ${req.originalUrl} from ${req.ip}`)

  // Stage 2 — headers. Nomba-specific headers are how signature verification works.
  const nombaHeaders = {
    'nomba-signature': req.headers['nomba-signature'],
    'nomba-sig-value': req.headers['nomba-sig-value'],
    'nomba-signature-algorithm': req.headers['nomba-signature-algorithm'],
    'nomba-signature-version': req.headers['nomba-signature-version'],
    'nomba-timestamp': req.headers['nomba-timestamp'],
    'content-type': req.headers['content-type'],
    'user-agent': req.headers['user-agent'],
  }
  log('headers', cid, 'nomba headers:', nombaHeaders)

  // Stage 3 — payload envelope. Log event_type and known refs, not the whole body
  // (webhooks include PAN masks and other things it's better not to spray in logs).
  const payload = req.body as NombaWebhookPayload | undefined
  if (payload) {
    log('payload', cid, 'envelope:', {
      event_type: payload.event_type,
      requestId: payload.requestId,
      transactionType: payload.data?.transaction?.type,
      transactionId: payload.data?.transaction?.transactionId,
      transactionAmount: payload.data?.transaction?.transactionAmount,
      orderReference: payload.data?.order?.orderReference,
      merchantTxRef: payload.data?.transaction?.merchantTxRef,
    })
  } else {
    warn('payload', cid, 'req.body is empty — check express.json() body parser is registered')
  }

  const receivedSig = req.headers['nomba-signature'] as string | undefined
  const nombaTimestamp = req.headers['nomba-timestamp'] as string | undefined
  const secret = process.env.NOMBA_WEBHOOK_SECRET

  // Stage 4 — signature verification (only when secret is configured).
  if (secret) {
    if (!receivedSig || !nombaTimestamp) {
      warn('sig', cid, 'missing signature headers — rejecting 401')
      res
        .status(401)
        .json({ error: true, code: 'MISSING_SIGNATURE', message: 'Missing Nomba signature headers.' })
      return
    }
    if (!payload) {
      warn('sig', cid, 'cannot verify without payload — rejecting 401')
      res.status(401).json({ error: true, code: 'INVALID_SIGNATURE', message: 'Empty webhook body.' })
      return
    }
    const valid = verifySignature(payload, receivedSig, nombaTimestamp, secret, cid)
    if (!valid) {
      warn('sig', cid, 'signature invalid — rejecting 401')
      res
        .status(401)
        .json({ error: true, code: 'INVALID_SIGNATURE', message: 'Webhook signature verification failed.' })
      return
    }
  } else {
    warn('sig', cid, 'NOMBA_WEBHOOK_SECRET not set — skipping verification (unsafe outside dev)')
  }

  // Stage 5 — acknowledge receipt fast so Nomba doesn't retry.
  res.status(200).json({ received: true })
  log('ack', cid, '200 sent, continuing async processing')

  if (!payload) return

  // Resolve order reference upfront (used by most event types).
  const orderRef = payload.data?.order?.orderReference ?? payload.data?.transaction?.merchantTxRef

  // Stage 6 — dispatch by event type (audit finding #4).
  // Every branch acks with 200 at line 202 above, so Nomba never retries the
  // handled events; the branches below just decide whether/how to update DB state.
  switch (payload.event_type) {
    case 'payment_success':
      await handlePaymentSuccess(payload, orderRef, cid)
      return

    case 'payment_failed':
      // Log for forensics; leave order at 'pending' so a subsequent successful
      // retry can still flip it. Marking as 'cancelled' here would race with
      // Nomba's own retry mechanism.
      warn('event', cid, `payment_failed noted — order left pending`, {
        orderRef,
        transactionId: payload.data?.transaction?.transactionId,
        responseCode: payload.data?.transaction?.responseCode,
      })
      return

    case 'payment_reversal':
      // Reversal of a previously successful payment — flag but don't
      // auto-mutate state (product/ops decision needed on cancel vs disputed).
      warn('event', cid, `payment_reversal noted — manual reconciliation needed`, {
        orderRef,
        transactionId: payload.data?.transaction?.transactionId,
      })
      return

    case 'payout_refund':
    case 'payout_success':
    case 'payout_failed':
      // Payout-side events are informational for now — the escrow model
      // means we care about payment inflows, not outflows.
      log('event', cid, `payout event noted: ${payload.event_type}`, {
        transactionId: payload.data?.transaction?.transactionId,
      })
      return

    default:
      log('event', cid, `ignoring unknown event_type=${payload.event_type}`)
      return
  }
}

// -----------------------------------------------------------------------------
// Event handlers
// -----------------------------------------------------------------------------

async function handlePaymentSuccess(
  payload: NombaWebhookPayload,
  orderRef: string | undefined,
  cid: string
): Promise<void> {
  if (!orderRef) {
    warn('dispatch', cid, 'no order reference in payload — cannot correlate to a local order', {
      order: payload.data?.order,
      transaction: payload.data?.transaction,
    })
    return
  }

  log('dispatch', cid, `resolved orderRef=${orderRef}`)

  // Stage 7 — post-signature transaction requery (audit finding #2).
  // The HMAC signature check already proves the webhook is authentic, but a
  // separate lookup against Nomba's transactions API adds defence-in-depth
  // against secret compromise or replay of a signed payload. Graceful fallback:
  //   - cleared + reachable  → proceed (belt-and-braces confirmed)
  //   - !cleared + reachable → BLOCK (Nomba explicitly says the payment failed)
  //   - !reachable           → proceed on signature trust only (Nomba's endpoint
  //                            is known to 404 for hackathon sub-accounts)
  const verification = await verifyNombaTransaction(orderRef)
  log('verify', cid, `verification: cleared=${verification.cleared} reachable=${verification.reachable} reason=${verification.reason}`)

  if (verification.reachable && !verification.cleared) {
    warn('verify', cid, 'Nomba requery says NOT cleared — refusing to update order')
    return
  }
  if (!verification.reachable) {
    warn('verify', cid, 'Nomba requery unreachable — trusting webhook signature alone')
  }

  // Stage 8 — DB update. Idempotency guard (.eq('status', 'pending')) means
  // a Nomba retry lands as a no-op, not a state regression.
  try {
    const nowIso = new Date().toISOString()
    // Prefer the requery's transactionId if we got one; otherwise use the
    // webhook payload's copy. Either way this fixes stuck-refund cases.
    const nombaTransactionId =
      verification.transactionId ?? payload.data?.transaction?.transactionId ?? null

    log('update', cid, `flipping orders.status pending→in_escrow where nomba_order_ref=${orderRef}`, {
      nombaTransactionId,
      requeryReason: verification.reason,
    })

    const { data, error: dbError } = await supabase
      .from('orders')
      .update({
        status: 'in_escrow',
        nomba_transaction_id: nombaTransactionId,
        updated_at: nowIso,
      })
      .eq('nomba_order_ref', orderRef)
      .eq('status', 'pending')
      .select('id, status')

    if (dbError) {
      error('update', cid, 'supabase error:', dbError)
      return
    }

    if (!data || data.length === 0) {
      warn(
        'update',
        cid,
        `no pending row matched — either already processed (idempotent no-op) or the ref isn't in orders yet`
      )
      return
    }

    log('update', cid, `success: ${data.length} row(s) moved to in_escrow`, data)
  } catch (err) {
    error('update', cid, 'threw during processing:', err instanceof Error ? err.message : err)
  }
}
