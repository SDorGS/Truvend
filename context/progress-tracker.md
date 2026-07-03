# Progress Tracker — Truvend

## Current phase

All hackathon build work complete. Both `/backend` and `/frontend` shipped. Chat (Phase 7) built for the demo. Awaiting Railway deploy + submission.

## Completed

**Repo & docs**
- `/context` documentation set established.
- Unit 0.1: `.gitignore` at repo root.

**Backend — Phase 1: Storage & Server Foundation**
- Units 1.1–1.4: Supabase schema + client, Express server, auth middleware, standard error handler.

**Backend — Phase 2: Listings & AI Engine**
- Units 2.1–2.3: Listings CRUD, Gemini risk scoring (synchronous), risk fields persisted on create.
- Soft delete chosen (`is_active = false`) — preserves rows for order references.

**Backend — Phase 3: Nomba Payments**
- Units 3.1–3.6: Nomba auth client, checkout, webhook, virtual accounts, order lifecycle, seller dashboard endpoints.
- **Production URL only** (`https://api.nomba.com`) — sandbox non-functional.
- Slack-fix patches: header renamed `nomba-signature`, event field `event_type: "payment_success"`, HMAC-SHA256 signature verification (full docs-format), `subAccountId` handled per-endpoint (checkout: inside `order` object).
- Checkout body wrapped in `order`, amount stringified.
- VA endpoint fixed: `POST /v1/accounts/virtual` with required `currency: "NGN"`, response reads `bankAccountNumber`.

**Backend — Phase 4: Deployment**
- Unit 4.1: Railway deploy — status pending user action (env vars set, webhook URL registration).

**Backend — Phase 5: Chat (demo)**
- Units 5.1–5.2: `messages` table + REST endpoints `GET/POST /api/orders/:id/messages`. Party check resolves order → listing.
- Units 5.3 (WebSocket upgrade) + 5.4 (moderation) deferred as post-hackathon.

**Backend — Audit fixes (post-Phase-5)**
- Added `GET /api/orders` — returns the authenticated user's orders (as buyer). `architecture.md` API table updated to reflect the addition.

**Frontend — Phase 0: Tooling**
- Unit F0.1: shadcn/ui init, primitives installed (`badge`, `card`, `button`, `input`, `separator`, `dialog`). `cn()` helper added, runtime deps installed (`clsx`, `tailwind-merge`, `cva`, `radix-ui`, `lucide-react`).

**Frontend — Phase 1: Listing card + grid**
- Unit F1.1: `ListingCard` — image top with placeholder fallback, absolute-positioned risk badge, truncated title, bold price, hover-shadow.
- Unit F1.2: `ListingsGrid` — 2/3/4 cols responsive; `slice(0,6)` removed from home page.

**Frontend — Phase 2: Marketplace browse**
- Units F2.1–F2.2: `FilterSidebar` (risk checkboxes, price range, sort dropdown), browse-page two-column layout with sidebar + result count + removable filter pills.

**Frontend — Phase 3: Listing detail**
- Unit F3.1: Two-column detail page. Risk display rules implemented per tier (badge / caution collapse / suspicious+high_risk banners). `RiskModal` migrated to shadcn `Dialog` — focus trap + Escape key work. AI Analysis card with colored score bar at bottom.

**Frontend — Phase 4: Navbar**
- Unit F4.1: Two-row Odaplace-style navbar. Row 1: brand + centered search + cart badge + user menu. Row 2: nav links (hamburger on mobile). Cart badge uses `signal-orange`.

**Frontend — Phase 5: Order timeline + seller dashboard**
- Unit F5.1: Vertical `EscrowTimeline` — dots + connecting lines, teal-mid current, dashed future, red-branch for disputed/cancelled.
- Unit F5.2: Seller dashboard — icon stat cards, copyable virtual account card, responsive tables for orders + payouts (grid on desktop, stacked cards on mobile).
- `Order` type extended with optional `amount` + `createdAt`; normalizer picks them up.

**Frontend — Phase 6: Auth**
- Unit F6.1: Centered card layout on login + signup, shadcn `Input`, TRUVEND branding, cross-page links, segmented buyer/seller role selector.
- AuthContext.signup extended to accept role and return `hasSession` — SignupForm auto-redirects when email confirmation is disabled.

**Frontend — Phase 7: Chat (demo)**
- Units F7.3–F7.4: `MessageApi`, `useMessages` (3-second polling), `ChatThread` component. Embedded on order detail page with buyer/seller counterparty label auto-derived. WebSocket upgrade deferred (see backend Unit 5.3).

**Frontend — Audit fixes**
- `SearchBar` migrated to shadcn `Input` (drops last `common/Input` importer).

## In progress

- Nothing coded. Railway deploy (backend Unit 4.1) is the only remaining action item.

## Next up (post-hackathon)

- Backend Unit 5.3: WebSocket upgrade for chat (deferred).
- Backend Unit 5.4: Chat moderation decision + implementation (deferred — flagged as ship-blocker for real users).
- Delete orphaned `frontend/components/common/Input.tsx` after confirming no other importers.

## Open questions

- Chat moderation approach (Gemini classifier / denylist / manual flag) — undecided; not needed for hackathon demo, mandatory before public users.

## Architecture decisions log

| Date | Decision | Reasoning |
|---|---|---|
| 2026-06-30 | Monorepo with `/frontend` + `/backend` at root | Single team, simpler coordination |
| 2026-06-30 | Next.js App Router | Team default |
| 2026-06-30 | shadcn/ui + Tailwind for frontend | Accessible primitives for the `high_risk` modal without hand-rolling |
| 2026-06-30 | Plain `fetch` + local state, no React Query | Scope control |
| 2026-06-30 | Synchronous Gemini scoring on listing creation | Simpler for hackathon demo; small volume tolerates the added latency |
| 2026-06-30 | Soft delete listings (`is_active = false`) | Preserves rows referenced by orders |
| 2026-06-30 | Nomba production URL only, no sandbox | Nomba sandbox non-functional per hackathon Slack findings |
| 2026-06-30 | HTTP + 3-second polling for chat, not WebSocket | Same-day deadline; ChatThread's API doesn't leak transport so WebSocket can slot in later |
| 2026-06-30 | Order-scoped chat only | Every conversation tied to a real transaction — safer than open DMs |
| 2026-07-03 | Added buyer `GET /api/orders` endpoint | Frontend was calling a path never listed in `architecture.md` — audit surfaced it, architecture.md updated |

## Session notes

- 2026-06-30: `/context` files established. No code yet.
- 2026-07-03: Added buyer-initiated refund request flow for escrow orders. The backend now calls Nomba's refund endpoint for paid/in-escrow/dispatched orders, updates the order to disputed for review, and exposes the new `POST /api/orders/:id/request-refund` endpoint. The frontend order detail screen now surfaces a refund action for buyers.
- 2026-06-30: Phase 0 complete — `.gitignore` at repo root.
- 2026-06-30: Backend Phases 1–3 complete. Nomba integration + Gemini scoring wired. Production URL decision made.
- 2026-06-30: Phase 3 Slack-fix patches applied — signature verification, header names, event field, sub-account body placement.
- 2026-07-01: Nomba VA endpoint corrected — `/v1/accounts/virtual` (not `/v1/accounts`), required `currency` field added, response shape fixed to `bankAccountNumber`.
- 2026-07-01: Checkout body wrapped in `order` object, amount stringified, `accountId` inside `order` (per Nomba docs).
- 2026-07-01: Webhook `orderReference` now sourced from `data.order.orderReference` first, `data.transaction.merchantTxRef` fallback.
- 2026-07-02: Frontend Phases 0–6 complete. Full visual overhaul with shadcn/ui. `high_risk` gate preserved in both `BuyButton` and `CartCheckoutItem`.
- 2026-07-02: Phase 7 chat shipped — REST + 3s polling for the demo. Backend Units 5.1/5.2 added to `unit_backend.md`. Chat moderation flagged as post-hackathon must-fix.
- 2026-07-03: Auth signup UX fixed — AuthContext.signup returns `hasSession`; SignupForm auto-redirects to `/listings` when Supabase email confirmation is disabled (dashboard toggle required, not a code change).
- 2026-07-03: Audit against six invariants — clean. One bug found: frontend called `GET /api/orders` but backend had no such route. Added `getBuyerOrders(buyerId)` service + `listBuyerOrders` controller + route; `architecture.md` API table updated with the new endpoint. `SearchBar` migrated to shadcn `Input` (removes final `common/Input.tsx` importer — file left in place for now).
