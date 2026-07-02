import { randomUUID } from 'crypto'

import { supabase } from '../lib/supabase'
import { nombaRequest, SUB_ACCOUNT_ID } from '../lib/nomba'
import { AppError } from '../middleware/error.middleware'
import { getListing } from './listings.service'

import type { Order } from '../types'

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
  const callbackUrl = `${process.env.BACKEND_URL}/webhook/nomba`

  // Fetch buyer email from Supabase Auth
  const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(buyerId)
  if (userError || !user) throw new AppError(500, 'DB_ERROR', 'Failed to fetch buyer details.')

  const nombaRes = await nombaRequest<NombaCheckoutResponse>('/v1/checkout/order', 'POST', {
    order: {
      orderReference,
      amount: String(listing.price),
      currency: 'NGN',
      customerId: buyerId,
      customerEmail: user.email,
      callbackUrl,
      accountId: SUB_ACCOUNT_ID,
    },
  })

console.log('[checkout] Nomba raw response:', JSON.stringify(nombaRes))

  const checkoutLink = nombaRes.data?.checkoutLink
  const nombaOrderRef = nombaRes.data?.orderReference ?? orderReference

  if (!checkoutLink) {
    throw new AppError(502, 'NOMBA_ERROR', 'Checkout link not returned by Nomba.')
  }

  const { data, error } = await supabase
    .from('orders')
    .insert({
      listing_id: listingId,
      buyer_id: buyerId,
      status: 'pending',
      nomba_order_ref: nombaOrderRef,
      checkout_link: checkoutLink,
      amount: listing.price,
    })
    .select()
    .single()

  if (error || !data) {
    console.error('[orders] createOrder insert:', error)
    throw new AppError(500, 'DB_ERROR', 'Failed to create order.')
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

  const order = data as Order

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

  return order
}

// --- Unit 3.5: Lifecycle ---

export async function confirmDelivery(orderId: string, buyerId: string): Promise<Order> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (error || !data) throw new AppError(404, 'NOT_FOUND', 'Order not found.')

  const order = data as Order

  if (order.buyer_id !== buyerId) {
    throw new AppError(403, 'FORBIDDEN', 'Only the buyer can confirm delivery.')
  }

  const validStatuses: Order['status'][] = ['paid', 'in_escrow', 'dispatched', 'delivered']
  if (!validStatuses.includes(order.status)) {
    throw new AppError(400, 'INVALID_STATUS', `Cannot confirm delivery for an order with status '${order.status}'.`)
  }

  const { data: updated, error: updateError } = await supabase
    .from('orders')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .select()
    .single()

  if (updateError || !updated) {
    console.error('[orders] confirmDelivery:', updateError)
    throw new AppError(500, 'DB_ERROR', 'Failed to confirm delivery.')
  }

  return updated as Order
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

  return (data ?? []) as Order[]
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

  return orders
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

  return (data ?? []) as Order[]
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

  const { data: updated, error: updateError } = await supabase
    .from('orders')
    .update({ status: 'dispatched', updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .select()
    .single()

  if (updateError || !updated) {
    console.error('[orders] dispatchOrder:', updateError)
    throw new AppError(500, 'DB_ERROR', 'Failed to dispatch order.')
  }

  return updated as Order
}
