/// <reference types="node" />
// Unit 9.3 verification: prove `delivery_code` never appears in any response a
// seller receives. Runs against the real Supabase project using the seed IDs
// from .env, exercising the actual service code path the HTTP controllers wrap
// (controllers do no transformation of their own — see orders.controller.ts).

import 'dotenv/config'
import { supabase } from '../src/lib/supabase'
import { getOrder, getSellerOrders, getSellerPayouts } from '../src/services/orders.service'

const SELLER_ID = process.env.SEED_SELLER_A_ID!
const BUYER_ID = process.env.SEED_BUYER_ID!

if (!SELLER_ID || !BUYER_ID) {
  console.error('SEED_SELLER_A_ID and SEED_BUYER_ID must be set in .env')
  process.exit(1)
}

let failures = 0
function assert(condition: boolean, msg: string): void {
  if (condition) {
    console.log(`  PASS  ${msg}`)
  } else {
    console.log(`  FAIL  ${msg}`)
    failures++
  }
}

async function ensureDispatchedOrderWithCode(): Promise<string> {
  const { data: listings } = await supabase
    .from('listings')
    .select('id')
    .eq('seller_id', SELLER_ID)
    .limit(1)

  if (!listings || listings.length === 0) {
    throw new Error(`No listings found for seller ${SELLER_ID}. Run the seed script first.`)
  }
  const listingId = listings[0].id

  const { data: existing } = await supabase
    .from('orders')
    .select('id, delivery_code, status')
    .eq('buyer_id', BUYER_ID)
    .eq('listing_id', listingId)
    .eq('status', 'dispatched')
    .limit(1)

  if (existing && existing.length > 0 && existing[0].delivery_code) {
    return existing[0].id
  }

  const testCode = Math.floor(100000 + Math.random() * 900000).toString()
  const { data: created, error } = await supabase
    .from('orders')
    .insert({
      listing_id: listingId,
      buyer_id: BUYER_ID,
      status: 'dispatched',
      amount: 100,
      delivery_code: testCode,
      delivery_code_attempts: 0,
      nomba_order_ref: `verify-9-3-${Date.now()}`,
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error || !created) throw new Error(`Failed to create test order: ${error?.message}`)
  return created.id as string
}

void (async () => {
  console.log('Unit 9.3 verification — delivery_code exposure to sellers\n')

  const orderId = await ensureDispatchedOrderWithCode()
  console.log(`Using dispatched test order id=${orderId}\n`)

  console.log('1) getOrder(orderId, sellerId) — seller-authenticated caller')
  const sellerOrder = await getOrder(orderId, SELLER_ID)
  assert(sellerOrder.delivery_code === null, 'delivery_code is null in seller-scoped getOrder')
  assert(
    !('delivery_code' in sellerOrder) || sellerOrder.delivery_code === null,
    'no leaked delivery_code value'
  )

  console.log('\n2) getOrder(orderId, buyerId) — buyer-authenticated caller (should still see code)')
  const buyerOrder = await getOrder(orderId, BUYER_ID)
  assert(
    typeof buyerOrder.delivery_code === 'string' && buyerOrder.delivery_code.length === 6,
    'buyer receives a 6-digit delivery_code'
  )

  console.log('\n3) getSellerOrders(sellerId) — seller-authenticated caller')
  const sellerOrders = await getSellerOrders(SELLER_ID)
  const anyLeaked = sellerOrders.some((o) => o.delivery_code !== null)
  assert(!anyLeaked, `no delivery_code leaked across ${sellerOrders.length} seller orders`)

  console.log('\n4) getSellerPayouts(sellerId) — completed-orders lookup')
  const payouts = await getSellerPayouts(SELLER_ID)
  const anyLeakedPayout = payouts.some((o) => o.delivery_code !== null)
  assert(!anyLeakedPayout, `no delivery_code leaked across ${payouts.length} payouts`)

  console.log('')
  if (failures > 0) {
    console.log(`RESULT: ${failures} FAILURE(S)`)
    process.exit(1)
  } else {
    console.log('RESULT: ALL PASS')
    process.exit(0)
  }
})().catch((err) => {
  console.error('Verification script crashed:', err)
  process.exit(1)
})
