import { randomUUID } from 'crypto'

import { supabase } from '../lib/supabase'
import { nombaRequest, SUB_ACCOUNT_ID, verifyNombaTransaction } from '../lib/nomba'
import { AppError } from '../middleware/error.middleware'
import { getListing } from './listings.service'

import type { Order } from '../types'

// Phase 9 (Unit 9.3): the delivery code is buyer-only. A seller who can read
// their own copy of the code from any API response defeats the entire escrow-
// release mechanism, so we scrub it before returning to sellers. Applied in
// getOrder (dual-role), getSellerOrders, getSellerPayouts, and dispatchOrder.
function stripDeliveryCode<T extends Order>(order: T): T {
  return { ...order, delivery_code: null }
}

// -----------------------------------------------------------------------------
// Auto-reconcile helper
// -----------------------------------------------------------------------------
// Uses the shared verifyNombaTransaction() helper (see nomba.ts) so both the
// webhook path and this reconcile path standardize on one requery contract.
// Fixes audit finding #3 (was previously calling /v1/checkout/order/{ref}
// directly with duplicated status-parsing logic).
async function reconcilePendingOrder(order: Order): Promise<Order> {
  if (order.status !== 'pending' || !order.nomba_order_ref) return order

  const verification = await verifyNombaTransaction(order.nomba_order_ref)

  console.log(
    `[reconcile] order=${order.id} nomba_ref=${order.nomba_order_ref} cleared=${verification.cleared} reachable=${verification.reachable} reason=${verification.reason}`
  )

  // Only proceed on an authoritative "cleared" — for reconcile we don't want
  // to flip to in_escrow based on webhook-signature trust because there's no
  // webhook to trust in the reconcile path.
  if (!verification.cleared) return order

  const { transactionId } = verification

  const { data, error } = await supabase
    .from('orders')
    .update({
      status: 'in_escrow',
      nomba_transaction_id: transactionId ?? order.nomba_transaction_id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', order.id)
    .eq('status', 'pending') // idempotency guard — no state regression
    .select()
    .single()

  if (error || !data) {
    console.warn(`[reconcile] failed to update order ${order.id}:`, error)
    return order
  }

  console.log(`[reconcile] order=${order.id} moved to in_escrow via reconcile`)
  return { ...order, ...(data as Order) }
}

// --- Unit 3.2: Checkout ---

interface NombaCheckoutResponse {
  code: string
  data: {
    checkoutLink: string
    orderReference: string
  }
}

export async function createOrder(listingId: string, buyerId: string): Promise<Order> {
  const listing = await getListing(listingId)

  if (listing.risk_level === 'high_risk') {
    // Backend defence-in-depth only — the frontend modal is the real gate.
    // We still allow the order to proceed; we log it for visibility.
    console.warn(`[orders] High-risk checkout initiated — listingId=${listingId} buyerId=${buyerId}`)
  }

  const orderReference = randomUUID()

  // Fetch buyer email from Supabase Auth
  const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(buyerId)
  if (userError || !user) throw new AppError(500, 'DB_ERROR', 'Failed to fetch buyer details.')

  const checkoutAccountId = SUB_ACCOUNT_ID || undefined

  // Create order row first to get the orderId for the callback URL
  const { data: orderData, error: insertError } = await supabase
    .from('orders')
    .insert({
      listing_id: listingId,
      buyer_id: buyerId,
      status: 'pending',
      nomba_order_ref: null,
      checkout_link: null,
      amount: listing.price,
    })
    .select()
    .single()

  if (insertError || !orderData) {
    console.error('[orders] createOrder insert:', insertError)
    throw new AppError(500, 'DB_ERROR', 'Failed to create order.')
  }

  const orderId = orderData.id
  // Redirect users to the order success page on the frontend after payment
  const callbackUrl = `${process.env.FRONTEND_URL}/orders/${orderId}?status=success`

  const checkoutBody = {
    order: {
      orderReference,
      amount: String(listing.price),
      currency: 'NGN',
      customerId: buyerId,
      customerEmail: user.email,
      callbackUrl,
      accountId: checkoutAccountId,
    },
  }

  console.log('[checkout] POST /v1/checkout/order body:', JSON.stringify(checkoutBody))
  const nombaRes = await nombaRequest<NombaCheckoutResponse>('/v1/checkout/order', 'POST', checkoutBody)
  console.log('[checkout] Nomba raw response:', JSON.stringify(nombaRes))

  const checkoutLink = nombaRes.data?.checkoutLink
  const nombaOrderRef = nombaRes.data?.orderReference ?? orderReference

  if (!checkoutLink) {
    throw new AppError(502, 'NOMBA_ERROR', 'Checkout link not returned by Nomba.')
  }

  // Update order with Nomba details
  const { data, error } = await supabase
    .from('orders')
    .update({
      nomba_order_ref: nombaOrderRef,
      checkout_link: checkoutLink,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .select()
    .single()

  if (error || !data) {
    console.error('[orders] createOrder update:', error)
    throw new AppError(500, 'DB_ERROR', 'Failed to update order with checkout details.')
  }

  return data as Order
}

export async function getOrder(orderId: string, userId: string): Promise<Order> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (error || !data) throw new AppError(404, 'NOT_FOUND', 'Order not found.')

  let order = data as Order

  // Only the buyer or the listing's seller may view the order
  if (order.buyer_id !== userId) {
    // If buyer doesn't match, fetch listing seller to check access
    const { data: listing } = await supabase
      .from('listings')
      .select('seller_id')
      .eq('id', order.listing_id)
      .single()

    if (!listing || listing.seller_id !== userId) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have access to this order.')
    }
  }

  // Auto-reconcile with Nomba if still pending — makes the UI self-healing
  // for orders whose webhook never landed (Nomba's routing or delivery gap).
  order = await reconcilePendingOrder(order)

  // Attach buyer display_name/avatar
  try {
    const { data: buyerUser } = await supabase
      .from('users')
      .select('display_name, avatar_url')
      .eq('id', order.buyer_id)
      .single()

    if (buyerUser) {
      ;(order as any).buyer = { display_name: buyerUser.display_name, avatar_url: buyerUser.avatar_url }
    }

    // Resolve seller via listing
    const { data: listing } = await supabase
      .from('listings')
      .select('seller_id')
      .eq('id', order.listing_id)
      .single()

    if (listing && listing.seller_id) {
      const { data: sellerUser } = await supabase
        .from('users')
        .select('display_name, avatar_url')
        .eq('id', listing.seller_id)
        .single()

      if (sellerUser) {
        ;(order as any).seller = { display_name: sellerUser.display_name, avatar_url: sellerUser.avatar_url }
      }
    }
  } catch (e) {
    console.warn('[orders] getOrder: failed to fetch party display names', e)
  }

  // Unit 9.3: only the buyer sees the delivery code. The seller of the listing
  // behind this order can also read this endpoint (see access check above), so
  // strip the code unless the caller is the buyer.
  if (order.buyer_id !== userId) {
    return stripDeliveryCode(order)
  }

  return order
}

// --- Unit 3.5 / Phase 9: Lifecycle ---

// Phase 9 (Unit 9.4): the buyer-initiated `confirmDelivery` flow has been
// removed entirely. Escrow now releases only when the seller submits the
// delivery code the buyer physically hands over (see releaseEscrow below).
export async function releaseEscrow(orderId: string, sellerId: string, code: string): Promise<Order> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, listings(seller_id)')
    .eq('id', orderId)
    .single()

  if (error || !data) throw new AppError(404, 'NOT_FOUND', 'Order not found.')

  const order = data as Order & { listings: { seller_id: string } }

  if (order.listings.seller_id !== sellerId) {
    throw new AppError(403, 'FORBIDDEN', 'Only the seller of this order can release escrow.')
  }

  if (order.status !== 'dispatched') {
    throw new AppError(
      400,
      'INVALID_STATUS',
      `Cannot release escrow for an order with status '${order.status}'.`
    )
  }

  const MAX_ATTEMPTS = 5
  if (order.delivery_code_attempts >= MAX_ATTEMPTS) {
    throw new AppError(
      423,
      'LOCKED',
      'Too many incorrect attempts. Contact support to resolve this order.'
    )
  }

  // Deliberate strict string comparison — the buyer hands over an exact string,
  // and silently trimming/coercing would hide a genuine mismatch.
  if (order.delivery_code !== code) {
    const newAttempts = order.delivery_code_attempts + 1
    const { error: attemptError } = await supabase
      .from('orders')
      .update({ delivery_code_attempts: newAttempts, updated_at: new Date().toISOString() })
      .eq('id', orderId)

    if (attemptError) {
      console.error('[orders] releaseEscrow attempt increment:', attemptError)
      throw new AppError(500, 'DB_ERROR', 'Failed to record attempt.')
    }

    const remaining = Math.max(0, MAX_ATTEMPTS - newAttempts)
    throw new AppError(
      400,
      'INVALID_CODE',
      `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
    )
  }

  // On match: complete the order. Keep delivery_code on the row for audit —
  // it stays hidden from sellers by the response-filter helper above.
  const { data: updated, error: updateError } = await supabase
    .from('orders')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .select()
    .single()

  if (updateError || !updated) {
    console.error('[orders] releaseEscrow update:', updateError)
    throw new AppError(500, 'DB_ERROR', 'Failed to release escrow.')
  }

  return stripDeliveryCode(updated as Order)
}

export async function raiseDispute(orderId: string, buyerId: string): Promise<Order> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (error || !data) throw new AppError(404, 'NOT_FOUND', 'Order not found.')

  const order = data as Order

  if (order.buyer_id !== buyerId) {
    throw new AppError(403, 'FORBIDDEN', 'Only the buyer can raise a dispute.')
  }

  const validStatuses: Order['status'][] = ['paid', 'in_escrow', 'dispatched']
  if (!validStatuses.includes(order.status)) {
    throw new AppError(400, 'INVALID_STATUS', `Cannot dispute an order with status '${order.status}'.`)
  }

  const { data: updated, error: updateError } = await supabase
    .from('orders')
    .update({ status: 'disputed', updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .select()
    .single()

  if (updateError || !updated) {
    console.error('[orders] raiseDispute:', updateError)
    throw new AppError(500, 'DB_ERROR', 'Failed to raise dispute.')
  }

  return updated as Order
}

interface NombaTransactionVerificationResponse {
  code: string
  description?: string
  data?: {
    id?: string
    status?: string
    success?: boolean | string
    message?: string
  }
}

interface NombaRefundResponse {
  code: string
  data?: {
    success?: boolean | string
    message?: string
  }
}

export async function requestRefund(orderId: string, buyerId: string): Promise<Order> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (error || !data) throw new AppError(404, 'NOT_FOUND', 'Order not found.')

  const order = data as Order

  if (order.buyer_id !== buyerId) {
    throw new AppError(403, 'FORBIDDEN', 'Only the buyer can request a refund.')
  }

  if (order.status === 'delivered' || order.status === 'completed') {
    throw new AppError(
      409,
      'REFUND_NOT_ALLOWED',
      'Refund cannot be approved because the order has already been completed and the funds have already been released.'
    )
  }

  const validStatuses: Order['status'][] = ['paid', 'in_escrow', 'dispatched']
  if (!validStatuses.includes(order.status)) {
    throw new AppError(400, 'INVALID_STATUS', `Cannot request a refund for an order with status '${order.status}'.`)
  }

  // The Nomba transactionId is captured on the order row by the webhook when
  // the payment first cleared. If it's missing, the order was either paid
  // before this field was added (manual DB reconcile), or the webhook never
  // fired — in either case there's no way to look it up now, since the
  // /v1/transactions/accounts/single endpoint returns 404 on hackathon accounts.
  const transactionId = order.nomba_transaction_id
  if (!transactionId) {
    throw new AppError(
      409,
      'MISSING_TRANSACTION_ID',
      'No Nomba transaction id is on file for this order. Refund cannot be processed automatically — reconcile it manually.'
    )
  }

  // Audit finding #1 (HIGH — flagged, not fixed):
  // Nomba's docs mark accountNumber (10-digit) and bankCode as required for
  // /v1/checkout/refund on card/checkout transactions. This code sends only
  // transactionId + amount, which is why refunds return 400.
  //
  // Fixing this requires a product/schema decision I cannot make unilaterally:
  //   - Where do we store the buyer's payout bank details?
  //     Options: on the buyer's users row, per-order at checkout time, or
  //     collected on-demand when the refund is initiated.
  //   - Who is authorized to trigger a refund? Buyer, seller, or admin?
  //
  // No column/table currently exists for this data. Do NOT invent one without
  // sign-off — pick the model deliberately, migrate the schema, then wire it
  // through here.
  //
  // Docs mark amount as optional, but Nomba rejects the call with a generic 400
  // when it's omitted for online-checkout transactions. Always send it.
  const refundBody = {
    transactionId,
    amount: Number(order.amount),
    // TODO(audit #1): add accountNumber + bankCode from buyer once schema exists.
  }

  console.log(`[refund] POST /v1/checkout/refund body:`, { ...refundBody, orderId })

  const refundResponse = await nombaRequest<NombaRefundResponse & { description?: string }>(
    '/v1/checkout/refund',
    'POST',
    refundBody
  )

  console.log(`[refund] Nomba raw response for order=${orderId}:`, JSON.stringify(refundResponse))

  const refundSucceeded =
    refundResponse.code === '00' ||
    refundResponse.data?.success === true ||
    refundResponse.data?.success === 'true'

  if (!refundSucceeded) {
    // Surface whatever Nomba actually said so the buyer/dev sees the real reason.
    const nombaMsg =
      refundResponse.data?.message ||
      refundResponse.description ||
      `Nomba refund failed (code=${refundResponse.code ?? 'unknown'})`
    throw new AppError(502, 'NOMBA_REFUND_FAILED', nombaMsg)
  }

  const { data: updated, error: updateError } = await supabase
    .from('orders')
    .update({ status: 'disputed', updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .select()
    .single()

  if (updateError || !updated) {
    console.error('[orders] requestRefund:', updateError)
    throw new AppError(500, 'DB_ERROR', 'Failed to record the refund request.')
  }

  return updated as Order
}

// --- Buyer's orders ---

export async function getBuyerOrders(buyerId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('buyer_id', buyerId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[orders] getBuyerOrders:', error)
    throw new AppError(500, 'DB_ERROR', 'Failed to fetch your orders.')
  }

  const rows = (data ?? []) as Order[]

  // Auto-reconcile any pending rows in parallel — one Nomba call per pending
  // order, capped by the number of pending rows in the list. Completed/paid
  // rows are returned as-is with zero extra work.
  return Promise.all(rows.map((row) => reconcilePendingOrder(row)))
}

// --- Unit 3.6: Seller dashboard ---

export async function getSellerOrders(sellerId: string): Promise<Order[]> {
  const { data: listings, error: listingsError } = await supabase
    .from('listings')
    .select('id')
    .eq('seller_id', sellerId)

  if (listingsError) {
    console.error('[orders] getSellerOrders listings lookup:', listingsError)
    throw new AppError(500, 'DB_ERROR', 'Failed to fetch seller orders.')
  }

  const listingIds = (listings ?? []).map((l: { id: string }) => l.id)
  if (listingIds.length === 0) return []

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .in('listing_id', listingIds)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[orders] getSellerOrders:', error)
    throw new AppError(500, 'DB_ERROR', 'Failed to fetch seller orders.')
  }

  const orders = (data ?? []) as Order[]

  // Attach buyer display info for each order
  try {
    for (const o of orders) {
      const { data: buyerUser } = await supabase
        .from('users')
        .select('display_name, avatar_url')
        .eq('id', o.buyer_id)
        .single()

      if (buyerUser) {
        ;(o as any).buyer = { display_name: buyerUser.display_name, avatar_url: buyerUser.avatar_url }
      }
    }
  } catch (e) {
    console.warn('[orders] getSellerOrders: failed to attach buyer info', e)
  }

  // Unit 9.3: never expose the delivery code to a seller.
  return orders.map(stripDeliveryCode)
}

export async function getSellerPayouts(sellerId: string): Promise<Order[]> {
  // Payouts are represented as completed orders — funds released to the seller's virtual account.
  const { data: listings, error: listingsError } = await supabase
    .from('listings')
    .select('id')
    .eq('seller_id', sellerId)

  if (listingsError) {
    console.error('[orders] getSellerPayouts listings lookup:', listingsError)
    throw new AppError(500, 'DB_ERROR', 'Failed to fetch payouts.')
  }

  const listingIds = (listings ?? []).map((l: { id: string }) => l.id)
  if (listingIds.length === 0) return []

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .in('listing_id', listingIds)
    .eq('status', 'completed')
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('[orders] getSellerPayouts:', error)
    throw new AppError(500, 'DB_ERROR', 'Failed to fetch payouts.')
  }

  // Unit 9.3: payouts belong to sellers — strip the code even here, where the
  // order is already completed. The code is buyer-audit info, not seller info.
  return ((data ?? []) as Order[]).map(stripDeliveryCode)
}

export async function dispatchOrder(orderId: string, sellerId: string): Promise<Order> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, listings(seller_id)')
    .eq('id', orderId)
    .single()

  if (error || !data) throw new AppError(404, 'NOT_FOUND', 'Order not found.')

  const order = data as Order & { listings: { seller_id: string } }

  if (order.listings.seller_id !== sellerId) {
    throw new AppError(403, 'FORBIDDEN', 'You do not have permission to dispatch this order.')
  }

  const validStatuses: Order['status'][] = ['paid', 'in_escrow']
  if (!validStatuses.includes(order.status)) {
    throw new AppError(400, 'INVALID_STATUS', `Cannot dispatch an order with status '${order.status}'.`)
  }

  // Phase 9: generate the 6-digit delivery code at dispatch time — never before.
  // The buyer receives this code out-of-band (their order screen) and hands it
  // to the seller on delivery; the seller submits it via releaseEscrow to
  // complete the order. See Unit 9.3 for the response-filtering rule that
  // hides this code from the seller.
  const deliveryCode = Math.floor(100000 + Math.random() * 900000).toString()

  const { data: updated, error: updateError } = await supabase
    .from('orders')
    .update({
      status: 'dispatched',
      delivery_code: deliveryCode,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .select()
    .single()

  if (updateError || !updated) {
    console.error('[orders] dispatchOrder:', updateError)
    throw new AppError(500, 'DB_ERROR', 'Failed to dispatch order.')
  }

  // The dispatch endpoint is seller-only, so strip the code from the response
  // (defence-in-depth alongside the seller filter in Unit 9.3).
  return stripDeliveryCode(updated as Order)
}
