# Truvend Backend — Implementation Units

This document breaks down the Truvend backend into isolated, verifiable implementation units. Only one unit should be worked on at a time. Complete one unit fully before starting the next.

Commit format: `feat(U#.#): short description`

---

## Phase 0: Project Setup

- [x] **Unit 0.1: .gitignore**

---

## Phase 1: Backend — Storage & Server Foundation

- [x] **Unit 1.1: Supabase Schema & Client**
- [x] **Unit 1.2: Express Server Scaffold**
- [x] **Unit 1.3: Supabase Auth Middleware**
- [x] **Unit 1.4: Standard Error Handler**

---

## Phase 2: Backend — Listings & AI Engine

- [x] **Unit 2.1: Listings Service & CRUD Routes**
- [x] **Unit 2.2: Gemini Risk Analysis Service**
- [x] **Unit 2.3: Wire AI Engine into Listing Creation**

---

## Phase 3: Backend — Nomba Payments Integration

- [x] **Unit 3.1: Nomba Auth & Client**
- [x] **Unit 3.2: Checkout Service & Route**
- [x] **Unit 3.3: Webhook Receiver**
- [x] **Unit 3.4: Vendor Virtual Accounts**
- [x] **Unit 3.5: Order Lifecycle Endpoints**
- [x] **Unit 3.6: Seller Dashboard Endpoints**

---

## Phase 4: Backend — Deployment

- [x] **Unit 4.1: Railway Deployment**

---

## Phase 5: Backend — Buyer-Seller Chat

- [x] **Unit 5.1: `messages` table**
- [x] **Unit 5.2: Messages service + routes**
- [ ] **Unit 5.3 (post-hackathon): WebSocket upgrade**
- [ ] **Unit 5.4 (post-hackathon): Moderation**

---

## Phase 6: Backend — Seller Profile Data (name + avatar on cards/orders)

Schema: `users.avatar_url TEXT NULL` added via `reset_schema.sql`. This phase wires that field, plus `display_name`, into every response that currently only returns `seller_id` / `buyer_id`.

- [ ] **Unit 6.1: Update `User` type**
  - `backend/src/types/index.ts` — add `avatar_url: string | null` to the `User` interface.

- [ ] **Unit 6.2: Join seller info into listings**
  - `listings.service.ts` — `getActiveListings()` and `getListing(id)` currently `select('*')`. Change to a join:
    ```typescript
    .select('*, seller:users!listings_seller_id_fkey(display_name, avatar_url)')
    ```
  - Add `seller?: { display_name: string; avatar_url: string | null }` to the `Listing` type.
  - Verify: `GET /api/listings` response includes a nested `seller` object per listing, not just `seller_id`.

- [ ] **Unit 6.3: Join buyer/seller info into orders**
  - `orders.service.ts` — `getOrder`, `getSellerOrders` need the counterparty's name for the chat UI (`ChatThread` currently only has `buyerId`/raw IDs to label bubbles).
  - Add joined `buyer:users(display_name, avatar_url)` and resolve seller via the listing relation.
  - Verify: `GET /api/orders/:id` response includes both parties' display names.

- [ ] **Unit 6.4: Messages sender info**
  - `messages.service.ts` `getOrderMessages` — join `sender:users(display_name, avatar_url)` so the frontend doesn't have to cross-reference IDs to render "who sent this."
  - Verify: each message in `GET /api/orders/:id/messages` includes sender name/avatar, not just `sender_id`.

---

## Phase 9: Delivery Confirmation Code (Chowdeck-style escrow release)

Replaces the buyer-initiated "Confirm Delivery" flow entirely. Escrow now releases only when the seller enters a code that the buyer physically hands over at the point of delivery. This is a decided architecture change (confirmed by product owner, not an assumption): `POST /api/orders/:id/confirm-delivery` is deprecated and removed, not kept as a parallel path.

- [x] **Unit 9.1: Schema — delivery code fields on `orders`**
  ```sql
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_code TEXT NULL;
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_code_attempts INTEGER NOT NULL DEFAULT 0;
  ```
  - `delivery_code`: 6-digit numeric string, generated when the order is dispatched, not before.
  - `delivery_code_attempts`: increments on every failed seller entry, used for lockout.
  - Update `Order` type in `backend/src/types/index.ts`: add `delivery_code: string | null` (never returned to the seller — see Unit 9.3), `delivery_code_attempts: number`.

- [x] **Unit 9.2: Generate code on dispatch**
  - Update `dispatchOrder` in `orders.service.ts` (currently just flips status to `dispatched`): generate a random 6-digit numeric string (`Math.floor(100000 + Math.random() * 900000).toString()`), persist to `delivery_code` alongside the existing status update.
  - Verify: after a seller calls `POST /api/seller/orders/:id/dispatch`, the order row has a non-null `delivery_code`.

- [x] **Unit 9.3: Response filtering — buyer sees the code, seller never does**
  - `getOrder(orderId, userId)` in `orders.service.ts` — after fetching, strip `delivery_code` from the returned object unless `userId === order.buyer_id`. The seller must never receive this field in any response, including `getSellerOrders`.
  - This is a security requirement, not a UX preference — a seller who can read the code from their own API response defeats the entire feature.
  - Verify: `GET /api/orders/:id` as the buyer includes `delivery_code`. The same call as the seller does not.

- [x] **Unit 9.4: Escrow release endpoint (replaces confirm-delivery)**
  - Remove `POST /api/orders/:id/confirm-delivery` route and its controller/service function entirely — do not leave it as a dead alternate path.
  - Add `releaseEscrow(orderId, sellerId, code)` in `orders.service.ts`:
    - Confirm caller is the seller of the listing behind this order (403 otherwise).
    - Confirm order status is `dispatched` (400 `INVALID_STATUS` otherwise — nothing to release before dispatch, nothing left to release after completion).
    - Lockout check: if `delivery_code_attempts >= 5`, reject with 423 `LOCKED`, `"Too many incorrect attempts. Contact support to resolve this order."` Do not auto-unlock — this needs a human path, flagged as an open question below.
    - Compare submitted code to stored `delivery_code` (string equality — do not trim/coerce silently, a mismatched code is a mismatched code).
    - On mismatch: increment `delivery_code_attempts`, return 400 `INVALID_CODE` with the message including attempts remaining (e.g. `"Incorrect code. 3 attempts remaining."`).
    - On match: set status to `completed`, `updated_at` to now. Do not clear `delivery_code` — keep it for audit/dispute reference.
  - New route: `POST /api/orders/:id/release-escrow` (behind `requireAuth`, body `{ code: string }`).
  - Verify: seller with correct code completes the order. Seller with wrong code gets a 400 and the attempt counter increments. 6th wrong attempt gets 423 regardless of code correctness.

- [x] **Unit 9.5: Update `raiseDispute` valid-status check**
  - `raiseDispute` currently allows disputing from `['paid', 'in_escrow', 'dispatched']`. Confirm this still makes sense given delivery-code completion only fires from `dispatched` — a buyer who never received the item and was never given a code (or the seller lost/mistyped it) still needs the dispute path from `dispatched`. No change needed if the enum already includes `dispatched` — verify it does.

## Phase 10: Backend — Seller Listing Management (photo upload + own-listings endpoint)
 
- [x] **Unit 10.1: Supabase Storage bucket**
  - Create a bucket named `listing-photos` in Supabase Storage. Public read access (listing photos need to be publicly viewable in the marketplace). Insert/delete restricted to service role — the backend uploads on the seller's behalf using `SUPABASE_SERVICE_KEY`, so no RLS policy changes are needed for write access.
  - Verify: bucket exists, a manually uploaded test file is reachable via its public URL.
- [x] **Unit 10.2: Multipart upload handling**
  - Install `multer`. Configure with memory storage (not disk — files go straight to Supabase Storage, never touch the container's filesystem), `limits: { fileSize: 5 * 1024 * 1024 }` (5MB cap), and a file filter accepting only `image/jpeg`, `image/png`, `image/webp`.
  - Verify: a non-image file or a file over 5MB is rejected with a clear error before it reaches any handler.
- [x] **Unit 10.3: Photo upload service**
  - `backend/src/services/uploads.service.ts` — `uploadListingPhoto(fileBuffer: Buffer, mimeType: string, sellerId: string): Promise<string>`.
  - Upload path convention: `listings/${sellerId}/${randomUUID()}.${ext}` — avoids collisions, keeps a seller's uploads grouped.
  - Use `supabase.storage.from('listing-photos').upload(...)`, then `getPublicUrl(...)` to return the final URL string.
  - Verify: calling this with a real image buffer returns a working public URL.
- [x] **Unit 10.4: Upload route**
  - `POST /api/listings/photo` (behind `requireAuth`, `multer` middleware reading field name `photo`).
  - Controller: call `uploadListingPhoto`, return `{ photo_url: string }`.
  - This is a standalone endpoint, not folded into listing create/update — the frontend uploads the photo first, gets the URL back, then submits the listing form with that URL already in hand. Keeps `createListing`/`updateListing` JSON-only, no multipart handling needed in those paths.
  - Verify: uploading a real image via this endpoint while authenticated as a seller returns a working `photo_url`. Unauthenticated request gets 401.
- [x] **Unit 10.5: Seller's own listings endpoint**
  - `GET /api/listings` currently returns only `is_active: true` listings across all sellers — not suitable for a seller's own management view, since a seller needs to see their listings including ones they've soft-deleted (`is_active: false`), to know what happened to them.
  - Add `getSellerListings(sellerId)` to `listings.service.ts` — no `is_active` filter, scoped to `seller_id = sellerId`, ordered newest first.
  - New route: `GET /api/seller/listings` (behind `requireAuth`).
  - Verify: a seller sees all their own listings including inactive ones. A different seller's listings never appear in this response.


---

## Notes on what's intentionally left open

- Synchronous vs. asynchronous Gemini scoring on listing creation (Unit 2.2).
- Exact Nomba webhook signature verification mechanism (Unit 3.3).
- What happens after 5 failed code attempts locks an order (Unit 9.4) — no automated unlock path exists yet. Needs a decision: manual admin override? Buyer-initiated code regeneration? Not shippable to real users without one, acceptable to leave locked-with-no-recovery for the hackathon demo only.