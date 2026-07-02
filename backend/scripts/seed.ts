/// <reference types="node" />
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// Auth accounts must already exist in Supabase Auth. This script does not
// create auth users — it only writes to the public tables. Create/confirm
// these three accounts first, then set their UUIDs here or via env.
const SELLER_A_ID = process.env.SEED_SELLER_A_ID ?? '9669729d-586f-44c4-a4f0-055961fc5ff4'
const SELLER_B_ID = process.env.SEED_SELLER_B_ID
const BUYER_ID = process.env.SEED_BUYER_ID ?? '4ca7847c-c04c-4024-b981-51e4e35c9ddf'

if (!SELLER_A_ID || !BUYER_ID) {
  console.error('Missing SEED_SELLER_A_ID / SEED_BUYER_ID. Set in .env or edit the script.')
  process.exit(1)
}

// Deterministic placeholder avatars (DiceBear — no API key, no rate limit issues).
const avatar = (seed: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`

interface ListingSeed {
  seller_id: string
  title: string
  description: string
  price: number
  photo_url: string
  risk_score: number
  risk_level: 'clear' | 'caution' | 'suspicious' | 'high_risk'
  risk_explanation: string
}

async function wipe() {
  console.log('Wiping application tables (auth.users untouched)...')
  const { error } = await supabase.rpc('exec_sql', {
    sql: 'TRUNCATE TABLE messages, orders, listings, vendor_virtual_accounts, users CASCADE;',
  })
  if (error && process.env.WIPE !== 'skip') {
    console.error(
      'Could not truncate via rpc (expected unless you created an exec_sql function).\n' +
      'Run reset_schema.sql manually in the Supabase SQL editor, then re-run this script with:\n' +
      '  WIPE=skip npx tsx scripts/seed_reset.ts'
    )
    process.exit(1)
  }
  console.log('Wipe done.\n')
}

async function upsertUser(id: string, role: 'buyer' | 'seller', displayName: string, avatarSeed: string) {
  const { error } = await supabase
    .from('users')
    .upsert({ id, role, display_name: displayName, avatar_url: avatar(avatarSeed) }, { onConflict: 'id' })
  if (error) throw new Error(`upsertUser ${displayName}: ${error.message}`)
}

async function insertListing(l: ListingSeed): Promise<string> {
  const { data, error } = await supabase
    .from('listings')
    .insert({ ...l, is_active: true })
    .select('id')
    .single()
  if (error || !data) throw new Error(`insertListing "${l.title}": ${error?.message}`)
  return data.id as string
}

async function insertOrder(listingId: string, buyerId: string, status: string, amount: number, ref: string): Promise<string> {
  const { data, error } = await supabase
    .from('orders')
    .insert({ listing_id: listingId, buyer_id: buyerId, status, amount, nomba_order_ref: ref, checkout_link: null, updated_at: new Date().toISOString() })
    .select('id')
    .single()
  if (error || !data) throw new Error(`insertOrder ${ref}: ${error.message}`)
  return data.id as string
}

async function insertMessage(orderId: string, senderId: string, body: string) {
  const { error } = await supabase.from('messages').insert({ order_id: orderId, sender_id: senderId, body })
  if (error) throw new Error(`insertMessage: ${error.message}`)
}

const SELLERS = SELLER_B_ID ? [SELLER_A_ID, SELLER_B_ID] : [SELLER_A_ID]

const LISTING_TEMPLATES: Omit<ListingSeed, 'seller_id'>[] = [
  // --- 4 LOW COST TEST ITEMS (₦100 - ₦250) ---
  { title: '[TEST] Clear Item', description: '100 NGN test item for checkout flow. Should not trigger any risk modal.', price: 100, photo_url: 'https://images.unsplash.com/photo-1555664424-778a1e5e1b48?w=600', risk_score: 5, risk_level: 'clear', risk_explanation: 'Standard test listing.' },
  { title: '[TEST] Caution Item', description: '150 NGN test item. Should show a yellow warning but allow checkout.', price: 150, photo_url: 'https://images.unsplash.com/photo-1555664424-778a1e5e1b48?w=600', risk_score: 40, risk_level: 'caution', risk_explanation: 'Testing caution UI flow.' },
  { title: '[TEST] Suspicious Item', description: '200 NGN test item. Should show an orange banner.', price: 200, photo_url: 'https://images.unsplash.com/photo-1555664424-778a1e5e1b48?w=600', risk_score: 65, risk_level: 'suspicious', risk_explanation: 'Testing suspicious UI flow.' },
  { title: '[TEST] High Risk Item', description: '250 NGN test item. Must trigger the hard-blocking red modal before checkout.', price: 250, photo_url: 'https://images.unsplash.com/photo-1555664424-778a1e5e1b48?w=600', risk_score: 95, risk_level: 'high_risk', risk_explanation: 'Testing high-risk modal barrier.' },

  // --- ORIGINAL 40 REALISTIC ITEMS ---
  { title: 'Samsung Galaxy S24 Ultra', description: 'Brand new, factory sealed. 256GB. Full warranty. Receipt provided.', price: 850000, photo_url: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600', risk_score: 10, risk_level: 'clear', risk_explanation: 'Listing details are consistent with market pricing.' },
  { title: 'MacBook Pro M3 14-inch', description: 'Used 3 months, no scratches. Original box and charger included.', price: 1200000, photo_url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600', risk_score: 15, risk_level: 'clear', risk_explanation: 'Price and description align with used electronics market.' },
  { title: 'iPad Air 5th Gen', description: '64GB WiFi. Excellent condition. Screen protector applied since day one.', price: 420000, photo_url: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600', risk_score: 14, risk_level: 'clear', risk_explanation: 'Consistent pricing and detailed condition report.' },
  { title: 'Sony WH-1000XM5 Headphones', description: 'Noise cancelling, barely used. Comes with case and cables.', price: 220000, photo_url: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=600', risk_score: 11, risk_level: 'clear', risk_explanation: 'Standard resale listing with no risk indicators.' },
  { title: 'Dell XPS 13 Laptop', description: 'Intel i7, 16GB RAM, 512GB SSD. Light use, students edition.', price: 650000, photo_url: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600', risk_score: 20, risk_level: 'clear', risk_explanation: 'Fair market price for specifications listed.' },
  { title: 'Canon EOS R6 Camera', description: 'Mirrorless camera body only. Low shutter count, well maintained.', price: 1450000, photo_url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600', risk_score: 17, risk_level: 'clear', risk_explanation: 'Detailed condition disclosure supports listing legitimacy.' },
  { title: 'Nike Air Jordan 1 Retro', description: 'Size 43. Worn twice. Original box included.', price: 85000, photo_url: 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=600', risk_score: 13, risk_level: 'clear', risk_explanation: 'Typical resale sneaker listing, no anomalies.' },
  { title: 'Ankara Print Maxi Dress', description: 'Handmade by Lagos designer. Sizes S-XL. Ships in 3 days.', price: 25000, photo_url: 'https://images.unsplash.com/photo-1590735213920-68192a487bc2?w=600', risk_score: 8, risk_level: 'clear', risk_explanation: 'Consistent with handmade fashion pricing.' },
  { title: 'Adire Agbada Set', description: 'Traditional hand-dyed fabric. Complete set with cap.', price: 45000, photo_url: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600', risk_score: 16, risk_level: 'clear', risk_explanation: 'Legitimate handmade goods listing.' },
  { title: 'Wooden Dining Table Set', description: '6-seater, solid oak. Minor wear on legs. Lagos pickup only.', price: 380000, photo_url: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=600', risk_score: 19, risk_level: 'clear', risk_explanation: 'Furniture listing with reasonable pricing and pickup terms.' },
  { title: 'AirPods Pro 2nd Gen', description: 'Sealed box, gift duplicate. Selling below retail. No returns.', price: 95000, photo_url: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=600', risk_score: 42, risk_level: 'caution', risk_explanation: 'Price slightly below market and no-returns policy increases risk.' },
  { title: 'Xbox Series X Console', description: 'New seller, first listing. Console with one controller.', price: 480000, photo_url: 'https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=600', risk_score: 38, risk_level: 'caution', risk_explanation: 'New seller account with limited transaction history.' },
  { title: 'Adire Agbada Set — Premium', description: 'Traditional hand-dyed fabric, premium line. New seller account.', price: 55000, photo_url: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600', risk_score: 35, risk_level: 'caution', risk_explanation: 'New seller account, listing itself appears legitimate.' },
  { title: 'Samsung 55" QLED TV', description: 'Slight scratch on back panel, not visible when mounted. Works perfectly.', price: 520000, photo_url: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=600', risk_score: 45, risk_level: 'caution', risk_explanation: 'Cosmetic damage disclosed but pricing is slightly aggressive.' },
  { title: 'Gaming PC — RTX 4070', description: 'Custom built, 3 months old. Selling due to relocation.', price: 1350000, photo_url: 'https://images.unsplash.com/photo-1591405351990-4726e331f141?w=600', risk_score: 48, risk_level: 'caution', risk_explanation: 'Relocation reason is plausible but unverifiable; price is competitive.' },
  { title: 'Leather Office Chair', description: 'Ergonomic, adjustable. Bought 2 months ago, changed jobs.', price: 75000, photo_url: 'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=600', risk_score: 31, risk_level: 'caution', risk_explanation: 'Reasonable listing with minor urgency language.' },
  { title: 'DJI Mini 3 Pro Drone', description: 'Barely flown, 2 batteries included. Selling to fund new gear.', price: 620000, photo_url: 'https://images.unsplash.com/photo-1508614999368-9260051292e5?w=600', risk_score: 40, risk_level: 'caution', risk_explanation: 'New seller with high-value item, moderate risk.' },
  { title: 'Herman Miller Aeron Chair', description: 'Size B, used but well maintained. Price is negotiable.', price: 340000, photo_url: 'https://images.unsplash.com/photo-1592078615290-033ee584e267?w=600', risk_score: 33, risk_level: 'caution', risk_explanation: 'High-value furniture with limited seller history.' },
  { title: 'Rolex Homage Watch', description: 'Automatic movement, not genuine Rolex. Clearly stated replica.', price: 45000, photo_url: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=600', risk_score: 44, risk_level: 'caution', risk_explanation: 'Replica item disclosed but buyer should verify authenticity claims.' },
  { title: 'Bluetooth Speaker JBL Xtreme 3', description: 'Barely used, moving out sale.', price: 110000, photo_url: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600', risk_score: 37, risk_level: 'caution', risk_explanation: 'Moving-out reason with reasonable pricing, slight urgency.' },
  { title: 'Designer Handbag — Limited Edition', description: 'Imported luxury bag. Only 2 left. Price firm. Transfer only, no meetup.', price: 180000, photo_url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600', risk_score: 65, risk_level: 'suspicious', risk_explanation: 'No-refund policy combined with transfer-only payment raises flags.' },
  { title: 'Rolex Submariner (Authentic)', description: 'Genuine Rolex, no box or papers. Cash only, meet in public.', price: 3200000, photo_url: 'https://images.unsplash.com/photo-1526045431048-f857369baa09?w=600', risk_score: 72, risk_level: 'suspicious', risk_explanation: 'High-value luxury item with no verification documents is a strong risk signal.' },
  { title: 'iPhone 14 Pro — Unlocked', description: 'Price is unusually low for the model. Seller reluctant to video call.', price: 280000, photo_url: 'https://images.unsplash.com/photo-1678652197831-2d180705cd2c?w=600', risk_score: 68, risk_level: 'suspicious', risk_explanation: 'Below-market pricing combined with reluctance to verify raises concern.' },
  { title: 'Gucci Belt — Authentic', description: 'Imported directly, no receipt available. Fixed price, no bargaining.', price: 95000, photo_url: 'https://images.unsplash.com/photo-1611923134239-b9be5816e23c?w=600', risk_score: 60, risk_level: 'suspicious', risk_explanation: 'Luxury item with no proof of authenticity and rigid terms.' },
  { title: 'Laptop Bundle — 5 Units', description: 'Bulk deal, corporate liquidation. Serial numbers not provided.', price: 2100000, photo_url: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600', risk_score: 70, risk_level: 'suspicious', risk_explanation: 'Bulk liquidation claim without serial verification is a common fraud pattern.' },
  { title: 'PS5 Digital Edition', description: 'Selling because I need cash urgently. Meet only near bus stop.', price: 320000, photo_url: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=600', risk_score: 63, risk_level: 'suspicious', risk_explanation: 'Urgency language and unusual meeting preference are risk indicators.' },
  { title: 'Diamond Earrings Set', description: 'Certified but certificate not shown in photos. Ask for details.', price: 550000, photo_url: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600', risk_score: 58, risk_level: 'suspicious', risk_explanation: 'Jewelry claims without visible certification are moderately risky.' },
  { title: 'MacBook Air M2 — Bulk Price', description: 'Multiple units available. Discount for cash payment only.', price: 580000, photo_url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600', risk_score: 61, risk_level: 'suspicious', risk_explanation: 'Cash-only bulk offers on electronics are a recurring fraud pattern.' },
  { title: 'Vintage Camera Collection', description: 'Rare collector items. Payment must be completed before viewing.', price: 400000, photo_url: 'https://images.unsplash.com/photo-1495707902641-75cac588d2e9?w=600', risk_score: 66, risk_level: 'suspicious', risk_explanation: 'Requiring payment before viewing is a significant risk signal.' },
  { title: 'Home Theatre System', description: 'Complete set, slightly used. Price negotiable only via bank transfer.', price: 260000, photo_url: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600', risk_score: 55, risk_level: 'suspicious', risk_explanation: 'Restrictive payment method combined with vague condition details.' },
  { title: 'iPhone 15 Pro Max 1TB', description: 'URGENT SALE. Brand new sealed. Way below market price. Pay before seeing. No refunds no returns. DM for bank details.', price: 350000, photo_url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600', risk_score: 91, risk_level: 'high_risk', risk_explanation: 'Price far below market value combined with urgency language and no-refund policy are strong fraud indicators.' },
  { title: 'PS5 + 10 Games Bundle', description: 'Selling everything cheap. Moving abroad next week. First to pay gets it. No questions asked.', price: 200000, photo_url: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=600', risk_score: 85, risk_level: 'high_risk', risk_explanation: 'Extreme urgency and below-market pricing are consistent with scam patterns.' },
  { title: 'MacBook Pro 16" — Half Price', description: 'Company laptop, selling before IT notices. Cash or transfer today only.', price: 600000, photo_url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600', risk_score: 95, risk_level: 'high_risk', risk_explanation: 'Description implies stolen or unauthorized goods — extreme risk.' },
  { title: 'Gold Jewelry Set — Clearance', description: 'Must sell today. Send deposit to reserve. No video call, no meetup, delivery only after full payment.', price: 480000, photo_url: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=600', risk_score: 88, risk_level: 'high_risk', risk_explanation: 'Deposit-first with no verification and no meetup option is a classic fraud pattern.' },
  { title: 'Toyota Camry 2018 — Quick Sale', description: 'Relocating tomorrow, need money now. Price is fixed and final. Full payment before documents transfer.', price: 8500000, photo_url: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=600', risk_score: 93, risk_level: 'high_risk', risk_explanation: 'High-value item with payment-before-documents structure is extremely high risk.' },
  { title: 'iPhone 13 — Wholesale Price', description: 'Getting rid of stock fast. Half of retail price. Serial numbers hidden for privacy. Transfer only.', price: 180000, photo_url: 'https://images.unsplash.com/photo-1632661674596-df8be070a5c5?w=600', risk_score: 82, risk_level: 'high_risk', risk_explanation: 'Hidden serial numbers and wholesale pricing on a single unit are major red flags.' },
  { title: 'Laptop Repair Shop Closing Sale', description: 'Everything must go today. Send payment to secure your item before stock runs out.', price: 150000, photo_url: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600', risk_score: 87, risk_level: 'high_risk', risk_explanation: 'Manufactured urgency and vague inventory description indicate high fraud risk.' },
  { title: 'Bitcoin Mining Rig — Below Cost', description: 'Selling below cost because I need cash urgently. No returns, no warranty, no inspection allowed.', price: 900000, photo_url: 'https://images.unsplash.com/photo-1516245834210-c4c142787335?w=600', risk_score: 90, risk_level: 'high_risk', risk_explanation: 'No inspection allowed combined with below-cost pricing is a severe risk indicator.' },
  { title: 'Designer Watches Collection', description: 'Bulk lot, no authentication provided. Payment secures the lot, no exceptions.', price: 750000, photo_url: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=600', risk_score: 84, risk_level: 'high_risk', risk_explanation: 'Bulk luxury goods with no authentication and rigid payment terms.' },
  { title: 'Solar Panel System — Clearance', description: 'Business closing down. Everything discounted 70%. Pay now to lock in price before it changes.', price: 620000, photo_url: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=600', risk_score: 80, risk_level: 'high_risk', risk_explanation: 'Steep discount with payment pressure and vague closure claim.' },
]

void (async () => {
  if (process.env.WIPE !== 'skip') await wipe()
  else console.log('WIPE=skip — assuming tables already truncated manually.\n')

  console.log('Seeding users...')
  await upsertUser(SELLER_A_ID, 'seller', 'Adewale Electronics', 'adewale-electronics')
  if (SELLER_B_ID) await upsertUser(SELLER_B_ID, 'seller', 'Nneka Fashion Hub', 'nneka-fashion')
  await upsertUser(BUYER_ID, 'buyer', 'Chidi Okafor', 'chidi-okafor')
  console.log(`${SELLERS.length + 1} users seeded.\n`)

  console.log(`Seeding ${LISTING_TEMPLATES.length} listings across ${SELLERS.length} seller(s)...`)
  const insertedIds: string[] = []
  for (let i = 0; i < LISTING_TEMPLATES.length; i++) {
    const seller = SELLERS[i % SELLERS.length]
    const id = await insertListing({ ...LISTING_TEMPLATES[i], seller_id: seller })
    insertedIds.push(id)
  }
  console.log(`${insertedIds.length} listings inserted.\n`)

  console.log('Seeding orders...')
  const runId = Date.now() // Unique timestamp to prevent duplicate key errors

  // These orders now perfectly map to the 4 small test items at the top of the array!
  const orderCompleted = await insertOrder(insertedIds[0], BUYER_ID, 'completed', LISTING_TEMPLATES[0].price, `reset-order-completed-${runId}`)
  const orderDispatched = await insertOrder(insertedIds[1], BUYER_ID, 'dispatched', LISTING_TEMPLATES[1].price, `reset-order-dispatched-${runId}`)
  const orderPaid = await insertOrder(insertedIds[2], BUYER_ID, 'paid', LISTING_TEMPLATES[2].price, `reset-order-paid-${runId}`)
  const orderDisputed = await insertOrder(insertedIds[3], BUYER_ID, 'disputed', LISTING_TEMPLATES[3].price, `reset-order-disputed-${runId}`)
  console.log('4 orders inserted.\n')

  console.log('Seeding sample chat on the paid order (visible without a real checkout)...')
  await insertMessage(orderPaid, BUYER_ID, 'Hi, is this still available? When can you ship?')
  await insertMessage(orderPaid, SELLER_A_ID, 'Yes, still available. I can dispatch tomorrow morning.')
  await insertMessage(orderPaid, BUYER_ID, 'Great, thank you.')
  console.log('3 messages inserted.\n')

  console.log('Seed complete.')
  console.log(`Orders: completed=${orderCompleted} dispatched=${orderDispatched} paid=${orderPaid} disputed=${orderDisputed}`)
})()