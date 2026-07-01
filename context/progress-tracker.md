# Progress Tracker — Truvend

## Current phase

Phase 3 code complete. All backend units done. Next: Phase 4 (Railway deployment).

## Completed

- Product brief finalized (problem, solution, Nomba integration points, tech stack, transaction flow, demo plan).
- Backend architecture guide written for frontend developers (endpoints, auth model, risk display rules, error shape, checkout flow, frontend/backend boundary).
- `/context` documentation set established (this file and its five siblings).
- **Unit 0.1**: `.gitignore` added at repo root (covers `node_modules`, `.env`, `.env.local`, `.next`, `dist`, `.DS_Store`).
- **Units 1.1–1.4**: Backend scaffolded — `backend/` initialized, all Phase 1 source files written, 98 packages installed. Awaiting Supabase project + schema to fully verify Unit 1.1.
- **Units 2.1–2.3**: Listings CRUD + Gemini risk scoring implemented. `@google/generative-ai@0.24.1` installed. Scoring is synchronous on `createListing` (decision: simpler for hackathon demo scope — revisit if volume grows). `deleteListing` is a soft delete (`is_active = false`) to preserve rows for order references.

## In progress

- Nothing. Phase 0 complete, ready to begin Phase 1.

## Next up

- [ ] Initialize monorepo structure (`/frontend`, `/backend`) at repo root.
- [ ] Backend: scaffold Express + TypeScript project, Supabase connection, auth middleware.
- [ ] Backend: implement listings endpoints (GET/POST/PUT/DELETE).
- [ ] Backend: integrate Gemini for risk scoring, attach `riskScore`/`riskLevel`/`riskExplanation` to listing responses.
- [ ] Backend: integrate Nomba Checkout API for `/api/orders/checkout`.
- [ ] Backend: integrate Nomba Virtual Accounts for seller payouts.
- [ ] Backend: implement webhook receiver for `payment.success`.
- [ ] Backend: order status lifecycle + dispute/confirm-delivery endpoints.
- [ ] Frontend: scaffold Next.js 15 App Router project, install Tailwind + shadcn/ui.
- [ ] Frontend: Supabase Auth integration (login/signup UI, token attached to backend requests).
- [ ] Frontend: marketplace browse/listing detail pages with risk badge display.
- [ ] Frontend: `high_risk` warning modal (hard gate before checkout — see `architecture.md` invariant 6).
- [ ] Frontend: checkout flow (open Nomba `checkoutLink`, poll order status).
- [ ] Frontend: seller dashboard (orders, payouts, virtual account display).
- [ ] Fill in `ui-context.md` (currently a skeleton — color tokens, typography, icon library confirmation).

## Open questions

- Brand palette / typography not yet defined (blocks final UI polish, not blocking backend or scaffolding work).
- Icon library defaulting to `lucide-react` pending confirmation.
- Exact Supabase schema/migrations not yet written — `architecture.md` storage model section describes invariant shapes only, not final DDL.
- Async vs. sync risk scoring on listing creation (does Gemini scoring block the create response, or run after and update the listing) — not yet decided, affects backend service design.

## Architecture decisions log

| Date | Decision | Reasoning |
|---|---|---|
| 2026-06-30 | Monorepo with `/frontend` + `/backend` at root | Single team, simpler coordination for a 5-week hackathon timeline |
| 2026-06-30 | `/context` + `CLAUDE.md` live at repo root | Shared by whole team, not owned by one side |
| 2026-06-30 | Next.js 15 App Router (not Pages Router) | Team default, current Next.js convention |
| 2026-06-30 | shadcn/ui + Tailwind for frontend components | Speed of building accessible primitives (esp. the high_risk modal) without hand-rolling |
| 2026-06-30 | Plain `fetch` + local state, no React Query/global state lib | Scope control for hackathon timeline — revisit only if data-fetching complexity actually demands it |
| 2026-06-30 | "Verid" brand name dropped from product brief, AI engine referred to generically | Per project decision — branding not finalized for hackathon submission |

## Session notes

- 2026-06-30: Established all six `/context` files and `CLAUDE.md` from the Truvend Product Brief and Backend Architecture Guide. No code exists yet — this is the starting point for the build.
- 2026-06-30: Phase 0 complete — `.gitignore` added (Unit 0.1). Phase 1 begins next.
- 2026-06-30: Phase 1 backend scaffold complete (Units 1.1–1.4). All source files written, npm install succeeded. Unit 1.1 verification pending Supabase project creation and SQL schema run by the team.
- 2026-06-30: Phase 2 complete (Units 2.1–2.3). Decided synchronous Gemini scoring on listing creation (open question from unit_backend.md resolved: synchronous, per default). Soft delete chosen for listings. `GEMINI_API_KEY` added to `.env.example`.
- 2026-06-30: Phase 3 complete (Units 3.1–3.6). All Nomba integration wired. **Decision: production URL only** (`https://api.nomba.com`) — sandbox non-functional, unit_backend.md updated to reflect this. Order lifecycle: webhook → `paid`, seller dispatch → `dispatched`, buyer confirm → `completed`. Payouts are completed orders (no separate payouts table in schema). Webhook signature verification left as a TODO pending Nomba docs confirmation.
- 2026-06-30: Phase 3 patched with hackathon Slack findings: (1) `subAccountId` now auto-injected into all Nomba POST request bodies via `nombaRequest` — parent `accountId` stays in the header (Joseph Ajibodu fix). (2) Webhook header corrected to `nomba-signature` (was `x-nomba-signature` — Peter's 401 issue). (3) Webhook event field corrected to `event_type: "payment_success"` (was `event: "payment.success"`). (4) Full HMAC-SHA256 verification implemented using the exact string format from Nomba docs: `eventType:requestId:userId:walletId:transactionId:transactionType:transactionTime:responseCode:nombaTimestamp`. (5) Added `NOMBA_SUB_ACCOUNT_ID` and `NOMBA_WEBHOOK_SECRET` env vars.
