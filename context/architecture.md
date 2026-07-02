# Architecture — Truvend

## Stack

| Layer | Technology |
|---|---|
| Frontend framework | Next.js 15, App Router |
| Frontend styling | TailwindCSS + shadcn/ui |
| Frontend data fetching | Plain `fetch` + `useState`/`useEffect` — no React Query |
| Backend runtime | Node.js + Express + TypeScript |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (JWT) |
| Payments | Nomba API — Checkout, Virtual Accounts, Transfers, Webhooks |
| AI Engine | Google Gemini 1.5 Flash (+ Gemini Vision where needed) |
| Backend deployment | Railway |
| Frontend deployment | Vercel |

## Repo structure

Monorepo. Single repo, root-level `/frontend` and `/backend` folders.

```
/truvend
  /context              ← this folder, shared by whole team
  CLAUDE.md
  /frontend             ← Next.js 15 App Router app
    /app
    /components
    /lib
  /backend              ← Express + TypeScript API
    /src
      /routes
      /controllers
      /services
      /middleware
```

Exact internal folder conventions for each side are defined in `code-standards.md`.

## System boundaries

**The frontend never talks to Nomba or Gemini directly.** This is the single hardest boundary in the system. Every payment action and every fraud check goes through the backend. The backend holds all third-party API keys and secrets — none are ever exposed to the browser or committed to frontend code.

Three logical systems sit behind the backend API:

1. **Marketplace API** — listings, sellers, buyers, orders. Powers most screens.
2. **AI Engine (fraud detection)** — runs server-side against Gemini, returns a risk score + plain-language explanation attached to listing objects. Frontend only ever reads `riskScore` / `riskLevel` / `riskExplanation` off the listing — it never calls Gemini.
3. **Nomba (payments)** — checkout, virtual accounts, payouts. Backend talks to Nomba; frontend only ever opens the `checkoutLink` Nomba returns and polls order status.

## Storage model (Supabase Postgres)

Core entities implied by the brief and backend guide (exact schema/migrations owned by backend, but these are the invariant shapes the frontend can rely on):

- **users** — buyer/seller accounts, tied to Supabase Auth.
- **listings** — `id`, `title`, `price`, seller reference, `riskScore` (0–100), `riskLevel` (`clear` | `caution` | `suspicious` | `high_risk`), `riskExplanation` (string).
- **orders** — `id`, listing reference, buyer reference, `status` (`pending` | `paid` | `in_escrow` | `dispatched` | `delivered` | `completed` | `disputed` | `cancelled`).
- **vendor virtual accounts** — one Nomba Virtual Account per verified seller.

## API routes (backend, as defined for frontend consumption)

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/listings` | All active listings |
| GET | `/api/listings/:id` | One listing, including current risk score |
| POST | `/api/listings` | Create listing (seller only) |
| PUT | `/api/listings/:id` | Edit listing (seller only) |
| DELETE | `/api/listings/:id` | Remove listing (seller only) |
| GET | `/api/orders` | All orders for the logged-in buyer |
| POST | `/api/orders/checkout` | Create order, returns Nomba `checkoutLink` |
| GET | `/api/orders/:id` | Fetch order status |
| POST | `/api/orders/:id/confirm-delivery` | Buyer confirms receipt, releases escrow |
| POST | `/api/orders/:id/dispute` | Buyer raises dispute, holds escrow |
| GET | `/api/seller/orders` | All orders for logged-in seller |
| GET | `/api/seller/payouts` | Payout history |
| POST | `/api/seller/orders/:id/dispatch` | Seller marks order shipped |
| GET | `/api/seller/virtual-account` | Seller's Nomba virtual account details |

All requests require `Authorization: Bearer <supabase_access_token>`. Missing/invalid token → `401`, frontend redirects to login.

## Error shape (backend → frontend contract)

```json
{
  "error": true,
  "code": "INSUFFICIENT_FUNDS",
  "message": "Payment could not be completed."
}
```

| Status | Meaning |
|---|---|
| 400 | Invalid/missing data from frontend |
| 401 | Not logged in or token expired |
| 403 | Logged in but not authorized for this action |
| 404 | Resource doesn't exist |
| 500 | Server-side failure |

One error handler on the frontend is sufficient — the shape is constant across all endpoints.

## Invariants the code must never violate

1. No Nomba API keys, secrets, or webhook signatures anywhere in frontend code.
2. No direct Gemini calls from the frontend — risk data always arrives pre-attached on the listing object.
3. No webhook handling in the frontend — Nomba talks to the backend only.
4. No escrow math in the frontend — status display only, all calculation is backend-owned.
5. No raw card numbers, OTPs, or bank details ever touch frontend or backend code — Nomba's hosted checkout page collects these directly.
6. For `riskLevel: "high_risk"` listings, the frontend must not open the Nomba checkout flow until the buyer has explicitly seen and dismissed the warning modal. This is a hard rule, treated as the product's core safety feature — never bypass it for convenience or demo speed.
