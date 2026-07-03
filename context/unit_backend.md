# Truvend Backend — Implementation Units

This document breaks down the Truvend backend into isolated, verifiable implementation units. Only one unit should be worked on at a time. Complete one unit fully before starting the next.

Commit format: `feat(U#.#): short description`

---

## Phase 0: Project Setup

- [x] **Unit 0.1: .gitignore**
  - Add `.gitignore` at repo root covering `node_modules`, `.env`, `.env.local`, `.next`, `dist`, `.DS_Store`.
  - Everything else in Phase 0 (repo init, `/context`, `CLAUDE.md`, `README.md`) is already done — do not recreate.
  - Verify: `git status` shows no `node_modules`, `.env`, or build output once dependencies are installed later.

---

## Phase 1: Backend — Storage & Server Foundation

- [x] **Unit 1.1: Supabase Schema & Client**
  - Create a Supabase project and run the following SQL:

    ```sql
    -- Buyer/seller accounts, tied to Supabase Auth
    create table users (
      id              uuid        primary key references auth.users(id),
      role            text        not null check (role in ('buyer', 'seller')),
      display_name    text        not null,
      created_at      timestamptz not null default now()
    );

    -- Seller virtual accounts (one per verified seller)
    create table vendor_virtual_accounts (
      id                  uuid        primary key default gen_random_uuid(),
      seller_id           uuid        not null references users(id),
      nomba_account_ref   text        not null unique,
      account_number      text        not null,
      bank_name           text        not null,
      created_at          timestamptz not null default now()
    );

    -- Listings with attached AI Engine risk data
    create table listings (
      id                uuid        primary key default gen_random_uuid(),
      seller_id         uuid        not null references users(id),
      title             text        not null,
      description       text        not null,
      price             numeric     not null,
      risk_score        integer     null check (risk_score between 0 and 100),
      risk_level        text        null check (risk_level in ('clear', 'caution', 'suspicious', 'high_risk')),
      risk_explanation  text        null,
      is_active         boolean     not null default true,
      created_at        timestamptz not null default now()
    );

    -- Orders / transactions
    create table orders (
      id                  uuid        primary key default gen_random_uuid(),
      listing_id          uuid        not null references listings(id),
      buyer_id            uuid        not null references users(id),
      status              text        not null default 'pending'
                          check (status in ('pending', 'paid', 'in_escrow', 'dispatched', 'delivered', 'completed', 'disputed', 'cancelled')),
      nomba_order_ref     text        null unique,
      checkout_link       text        null,
      amount              numeric     not null,
      created_at          timestamptz not null default now(),
      updated_at          timestamptz not null default now()
    );
    ```

  - Install `@supabase/supabase-js`.
  - Create `backend/src/lib/supabase.ts` — singleton Supabase client using `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`.
  - Create `backend/src/types/index.ts`:
    ```typescript
    export type UserRole = 'buyer' | 'seller'
    export type RiskLevel = 'clear' | 'caution' | 'suspicious' | 'high_risk'
    export type OrderStatus =
      | 'pending' | 'paid' | 'in_escrow' | 'dispatched'
      | 'delivered' | 'completed' | 'disputed' | 'cancelled'

    export interface User {
      id: string
      role: UserRole
      display_name: string
      created_at: string
    }

    export interface VendorVirtualAccount {
      id: string
      seller_id: string
      nomba_account_ref: string
      account_number: string
      bank_name: string
      created_at: string
    }

    export interface Listing {
      id: string
      seller_id: string
      title: string
      description: string
      price: number
      risk_score: number | null
      risk_level: RiskLevel | null
      risk_explanation: string | null
      is_active: boolean
      created_at: string
    }

    export interface Order {
      id: string
      listing_id: string
      buyer_id: string
      status: OrderStatus
      nomba_order_ref: string | null
      checkout_link: string | null
      amount: number
      created_at: string
      updated_at: string
    }

    export interface GeminiRiskAnalysis {
      risk_score: number
      risk_level: RiskLevel
      risk_explanation: string
    }
    ```
  - Verify: test insert and select on all four tables runs without error.

- [x] **Unit 1.2: Express Server Scaffold**
  - Install `express`, `cors`, `dotenv`, `tsx`.
  - Create `backend/src/index.ts` — Express app with `cors()`, `express.json()` middleware.
  - Register `GET /api/health` returning `{ status: 'ok' }`.
  - Add `dev` script: `tsx watch src/index.ts`.
  - Verify: `curl http://localhost:3001/api/health` returns `{"status":"ok"}`.

- [x] **Unit 1.3: Supabase Auth Middleware**
  - Create `backend/src/middleware/auth.middleware.ts`.
  - Export `requireAuth(req, res, next)` — reads `Authorization: Bearer <token>`, verifies it against Supabase Auth, attaches the resolved user to `req.user`.
  - Missing or invalid token → respond `401` using the standard error shape (see `architecture.md`), do not call `next()`.
  - Verify: a route guarded by `requireAuth` returns `401` with no token, and passes through with a valid Supabase session token.

- [x] **Unit 1.4: Standard Error Handler**
  - Create `backend/src/middleware/error.middleware.ts`.
  - Export a typed `AppError` class (`statusCode`, `code`, `message`).
  - Export a central Express error-handling middleware that catches thrown `AppError`s (and unknown errors, defaulting to 500) and shapes the response as:
    ```json
    { "error": true, "code": "SOME_CODE", "message": "Human readable message." }
    ```
  - Wire as the last middleware in `index.ts`.
  - Verify: a route that throws `AppError` returns the correct status and JSON shape. An unhandled exception returns `500` with the same shape, not a stack trace.

---

## Phase 2: Backend — Listings & AI Engine

- [x] **Unit 2.1: Listings Service & CRUD Routes**
  - Create `backend/src/services/listings.service.ts` — `createListing`, `getListing(id)`, `getActiveListings()`, `updateListing(id, sellerId, data)`, `deleteListing(id, sellerId)`.
  - Ownership check: update/delete only succeed if `seller_id` matches the authenticated user — otherwise throw a `403` `AppError`.
  - Create `backend/src/routes/listings.ts` and `backend/src/controllers/listings.controller.ts` implementing the five endpoints from `architecture.md`:
    - `GET /api/listings`
    - `GET /api/listings/:id`
    - `POST /api/listings` (seller only, behind `requireAuth`)
    - `PUT /api/listings/:id` (seller only, behind `requireAuth`)
    - `DELETE /api/listings/:id` (seller only, behind `requireAuth`)
  - Verify: full CRUD works via curl/Postman. A seller cannot edit another seller's listing (403).

- [x] **Unit 2.2: Gemini Risk Analysis Service**
  - Install `@google/generative-ai`.
  - Create `backend/src/services/gemini.service.ts`.
  - Export `analyseListing(title: string, description: string, price: number): Promise<GeminiRiskAnalysis>`.
  - Prompt:
    ```
    You are a fraud-detection analyst for a Nigerian P2P marketplace.
    Evaluate this listing for fraud risk:
    Title: "${title}"
    Description: "${description}"
    Price: ${price}

    Return a JSON object with:
    - risk_score: integer 0-100 (0 = no risk, 100 = certain fraud)
    - risk_level: "clear" (0-29), "caution" (30-54), "suspicious" (55-79), or "high_risk" (80-100)
    - risk_explanation: one plain-language sentence a buyer would understand, explaining the score.
    Return only valid JSON. No markdown, no backticks, no explanation outside the JSON.
    ```
  - Hardcoded fallback if the Gemini call fails:
    ```typescript
    const FALLBACK: GeminiRiskAnalysis = {
      risk_score: 50,
      risk_level: 'caution',
      risk_explanation: 'Automated risk analysis unavailable — proceed carefully and verify the seller directly.'
    }
    ```
  - **Open question, not yet decided** — flag rather than guess: does listing creation block on this call (synchronous scoring before the `POST /api/listings` response returns) or does it run after creation and update the listing row asynchronously? Confirm with the team before wiring Unit 2.3; default to synchronous for the hackathon demo unless told otherwise, since it's simpler and the listing volume is small.
  - Verify: `analyseListing('iPhone 15 Pro, brand new, sealed', 'Selling cheap, urgent, no returns', 15000)` returns a `high_risk`-leaning score given the price/description mismatch.

- [x] **Unit 2.3: Wire AI Engine into Listing Creation**
  - Update `listings.service.ts` `createListing` to call `analyseListing` and persist `risk_score`, `risk_level`, `risk_explanation` on the new row (per the decision made in Unit 2.2).
  - Listing GET endpoints must always return these three fields — never omit them, since the frontend's risk-gating logic depends on `risk_level` being present.
  - Verify: a newly created listing has non-null `risk_score`/`risk_level`/`risk_explanation` when fetched via `GET /api/listings/:id`.

---

## Phase 3: Backend — Nomba Payments Integration

- [x] **Unit 3.1: Nomba Auth & Client**
  - Create `backend/src/lib/nomba.ts` — handles token exchange against `POST /v1/auth/token/issue` (production base URL from env — sandbox is not functional, production only), caches the token until near expiry, exposes an authenticated request helper.
  - Env vars: `NOMBA_BASE_URL` (production: `https://api.nomba.com`), `NOMBA_ACCOUNT_ID`, `NOMBA_CLIENT_ID`, `NOMBA_CLIENT_SECRET`.
  - Verify: calling the helper against the production auth endpoint returns a valid bearer token.

- [x] **Unit 3.2: Checkout Service & Route**
  - Create `backend/src/services/orders.service.ts` — `createOrder(listingId, buyerId)`.
  - Inside `createOrder`: if the listing's `risk_level` is `high_risk`, this is backend-side defense in depth only — the actual gate (warning modal) lives in the frontend per `architecture.md` invariant 6. The backend should still allow the call to proceed (it cannot know whether the buyer saw the modal), but log/flag high-risk checkouts for visibility.
  - Calls Nomba Checkout (`POST /v1/checkout/order` against the configured base URL) with the listing price, gets back `checkoutLink` and `orderReference`.
  - Persists a new `orders` row (`status: 'pending'`, `nomba_order_ref`, `checkout_link`, `amount`).
  - Create `backend/src/routes/orders.ts` and `backend/src/controllers/orders.controller.ts`:
    - `POST /api/orders/checkout` (behind `requireAuth`)
    - `GET /api/orders/:id` (behind `requireAuth`)
  - Verify: hitting checkout returns a `checkoutLink` pointing at the production Nomba checkout domain, and the order row exists with `status: 'pending'`.

- [x] **Unit 3.3: Webhook Receiver**
  - Create `backend/src/routes/webhook.ts` — `POST /webhook/nomba`. Not behind `requireAuth` (Nomba calls this directly, not an authenticated frontend user) — validate the webhook signature per Nomba's docs instead, once that signing mechanism is confirmed.
  - Create `backend/src/controllers/webhook.controller.ts` — parse the `payment.success` event body, match it to the order via `nomba_order_ref`, update `orders.status` to `'paid'`.
  - Respond `200` immediately; do any further processing (e.g. notifying the seller) after responding, not before.
  - This is the URL to submit in the hackathon's webhook-registration Google Doc once deployed: `https://<railway-deployment-url>/webhook/nomba`.
  - Verify: a simulated production webhook payload updates the matching order's status to `paid`.

- [x] **Unit 3.4: Vendor Virtual Accounts**
  - Add `createVirtualAccountForSeller(sellerId)` to a new `backend/src/services/sellers.service.ts` — calls Nomba's virtual account creation endpoint, persists the result into `vendor_virtual_accounts`.
  - Create `GET /api/seller/virtual-account` (behind `requireAuth`) — returns the calling seller's virtual account, creating one on first call if none exists.
  - Verify: first call for a seller with no virtual account creates one and returns its details; subsequent calls return the same record.

- [x] **Unit 3.5: Order Lifecycle Endpoints**
  - Add `confirmDelivery(orderId, buyerId)` and `raiseDispute(orderId, buyerId)` to `orders.service.ts`.
  - Add `requestRefund(orderId, buyerId)` for buyer-initiated escrow refunds, calling Nomba's refund endpoint and recording the request.
  - `confirmDelivery`: only the buyer on the order can call this; moves status `delivered` → `completed` (or `paid`/`in_escrow` → `delivered` → `completed`, confirm exact intermediate states with the team — `architecture.md` lists the full status enum but doesn't pin the exact transition triggered by this one endpoint).
  - `raiseDispute`: only the buyer on the order can call this; moves status to `disputed`.
  - Create the two routes:
    - `POST /api/orders/:id/confirm-delivery` (behind `requireAuth`)
    - `POST /api/orders/:id/dispute` (behind `requireAuth`)
  - Verify: a non-buyer calling either endpoint gets `403`. The buyer succeeds and the order status updates accordingly.

- [x] **Unit 3.6: Seller Dashboard Endpoints**
  - Add `getSellerOrders(sellerId)`, `getSellerPayouts(sellerId)`, `dispatchOrder(orderId, sellerId, trackingInfo?)` to `orders.service.ts` / `sellers.service.ts`.
  - Create the three routes (all behind `requireAuth`, all scoped to the authenticated seller):
    - `GET /api/seller/orders`
    - `GET /api/seller/payouts`
    - `POST /api/seller/orders/:id/dispatch`
  - Verify: a seller only ever sees their own orders/payouts, never another seller's.

---

## Phase 4: Backend — Deployment

- [x] **Unit 4.1: Railway Deployment**
  - Deploy `/backend` to Railway as its own service (monorepo — confirm Railway is configured with the correct root directory / build path).
  - Set all env vars (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `NOMBA_*`, `GEMINI_API_KEY`) in Railway, never committed to the repo.
  - Confirm `GET /api/health` responds on the public Railway URL.
  - Submit the webhook URL (`https://<railway-url>/webhook/nomba`) to the hackathon's webhook-registration form.
  - Verify: public health check passes, and a production webhook fires and hits the deployed endpoint successfully.

---

## Phase 5: Backend — Buyer-Seller Chat

Cross-references `unit_frontend.md` Phase 7. Shipped as REST for the hackathon demo; WebSocket upgrade is post-hackathon work.

- [x] **Unit 5.1: `messages` table**
  - Run this SQL in Supabase (schema comment lives at the top of `backend/src/services/messages.service.ts`):
    ```sql
    CREATE TABLE messages (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id   UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      sender_id  UUID NOT NULL REFERENCES users(id),
      body       TEXT NOT NULL CHECK (char_length(body) > 0 AND char_length(body) <= 2000),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      read_at    TIMESTAMPTZ
    );
    CREATE INDEX idx_messages_order_id ON messages(order_id, created_at);
    ```

- [x] **Unit 5.2: Messages service + routes**
  - `backend/src/services/messages.service.ts` — `getOrderMessages`, `sendMessage`. Both call `assertPartyToOrder` first, which resolves the order → listing chain and rejects with 403 unless the caller is the buyer or the listing's seller.
  - `backend/src/controllers/messages.controller.ts` — thin wrappers.
  - `backend/src/routes/messages.ts` — nested under orders router using `Router({ mergeParams: true })`.
  - Endpoints exposed:
    - `GET /api/orders/:id/messages` (behind `requireAuth`)
    - `POST /api/orders/:id/messages` (behind `requireAuth`, body `{ body: string }`)

- [ ] **Unit 5.3 (post-hackathon): WebSocket upgrade**
  - Add `ws` to `backend/package.json` and attach to the same HTTP server instance Express uses.
  - Connection auth: client sends Supabase JWT on connect, verified same way `auth.middleware.ts` does.
  - Emit `message:new` events on send; keep the REST endpoints as the persistence path so socket is delivery-only.

- [ ] **Unit 5.4 (post-hackathon): Moderation**
  - Unmoderated chat is a risk surface — sellers or buyers could negotiate off-platform, bypassing the risk-scoring system that's the product's whole value prop. Decide: Gemini classifier on `messages.body` before insert? Denylist regex? Manual review flag? Not shippable to real users without a decision.

## Phase 6: Backend — Seller Profile Data (name + avatar on cards/orders)
 
Schema: `users.avatar_url TEXT NULL` added via `reset_schema.sql`. This phase wires that field, plus `display_name`, into every response that currently only returns `seller_id` / `buyer_id`.
 
 - [x] **Unit 6.1: Update `User` type**
  - `backend/src/types/index.ts` — add `avatar_url: string | null` to the `User` interface.
 - [x] **Unit 6.2: Join seller info into listings**
  - `listings.service.ts` — `getActiveListings()` and `getListing(id)` currently `select('*')`. Change to a join:
```typescript
    .select('*, seller:users!listings_seller_id_fkey(display_name, avatar_url)')
```
  - Add `seller?: { display_name: string; avatar_url: string | null }` to the `Listing` type.
  - Verify: `GET /api/listings` response includes a nested `seller` object per listing, not just `seller_id`.
 - [x] **Unit 6.3: Join buyer/seller info into orders**
  - `orders.service.ts` — `getOrder`, `getSellerOrders` need the counterparty's name for the chat UI (`ChatThread` currently only has `buyerId`/raw IDs to label bubbles).
  - Add joined `buyer:users(display_name, avatar_url)` and resolve seller via the listing relation.
  - Verify: `GET /api/orders/:id` response includes both parties' display names.
 - [x] **Unit 6.4: Messages sender info**
  - `messages.service.ts` `getOrderMessages` — join `sender:users(display_name, avatar_url)` so the frontend doesn't have to cross-reference IDs to render "who sent this."
  - Verify: each message in `GET /api/orders/:id/messages` includes sender name/avatar, not just `sender_id`.

---

## Notes on what's intentionally left open

A few specifics in this plan are flagged inline rather than decided unilaterally, per `ai-workflow-rules.md` ("if a request is underspecified in a way that affects the trust/safety logic... stop and ask rather than guessing"):

- Synchronous vs. asynchronous Gemini scoring on listing creation (Unit 2.2).
- Exact Nomba webhook signature verification mechanism (Unit 3.3) — needs the actual Nomba docs/dashboard signing secret once webhook access is granted.
- Exact order status transitions triggered by `confirm-delivery` (Unit 3.5) — the enum is fixed in `architecture.md`, the transition logic isn't.

Resolve these with the team and update this file and `progress-tracker.md` once decided — don't let an agent guess on any of the three.
