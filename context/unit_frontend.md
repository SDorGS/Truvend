# Truvend Frontend — Implementation Units

Commit format: `feat(UF#.#): short description`

---

## Phase 0–6: Complete

Tooling, listing card redesign, browse page, listing detail, navbar, order tracking, seller dashboard, auth pages — all shipped. See git history for `feat(UF0.1)` through `feat(UF6.1)`.

---

## Phase 7: Buyer-Seller Chat

- [ ] **Unit F7.1 (backend, post-hackathon): WebSocket server** — belongs in `unit_backend.md` Phase 5.
- [ ] **Unit F7.2 (backend, post-hackathon): messages table and events** — done as REST for the demo (`unit_backend.md` 5.1/5.2), WebSocket deferred.
- [x] **Unit F7.3: Frontend — messages hook + API client** *(HTTP polling, not WebSocket, for the demo)*
- [x] **Unit F7.4: Frontend — Chat UI**
  - Entry point is `app/orders/[id]/page.tsx` only. No listing-page "Message Seller" button — an order must exist first. This is intentional scope, not a bug: if that needs to change, it's a new unit (F7.6 below).
- [ ] **Unit F7.5: Moderation and safety** — still open, not shippable to real users without a decision.

---

## Phase 8: Seller/Buyer Profile Display (name + avatar)

Depends on `unit_backend.md` Phase 6 (backend joins must ship first — these units will render blank/broken if the backend still only returns raw IDs).

- [ ] **Unit F8.1: Update `Listing` type + normalizer**
  - `types/listing.ts` — add `seller?: { displayName: string; avatarUrl: string | null }`.
  - `lib/normalize.ts` `normalizeListing` — map `raw.seller` (snake_case fields inside: `display_name`, `avatar_url`) into the camelCase shape above. Follow the existing `pick()` pattern already used for every other field — don't hardcode a different access style for this one.

- [ ] **Unit F8.2: Render seller name + avatar on ListingCard**
  - `components/listings/ListingCard.tsx` currently has no seller row at all. Add: small circular avatar (fallback to initials on a colored circle if `avatarUrl` is null) + `seller.displayName`, placed under the title, above or beside the price.

- [ ] **Unit F8.3: Render seller name + avatar on listing detail page**
  - `app/listings/[id]/page.tsx` currently renders `listing.sellerId.slice(0, 8) + "…"` under "Seller" — replace with avatar + `seller.displayName`. Delete the truncated-ID fallback entirely; if `seller` is missing from the API response, that's a backend bug to surface, not something to paper over with a truncated UUID.

- [ ] **Unit F8.4: Update `Order`/`Message` types + normalizers**
  - `types/order.ts` — add `buyer?: { displayName: string; avatarUrl: string | null }`, `seller?: { displayName: string; avatarUrl: string | null }`.
  - `types/message.ts` — add `sender?: { displayName: string; avatarUrl: string | null }`.
  - Update `normalizeOrder` and `normalizeMessage` in `lib/normalize.ts` accordingly.

- [ ] **Unit F8.5: Render names in ChatThread**
  - `components/chat/ChatThread.tsx` currently labels bubbles generically ("Seller"/"Buyer" derived from ID comparison per the F7.4 note). Replace with the actual `sender.displayName` + small avatar next to each bubble.

- [ ] **Unit F8.6: Render names on order tracking + seller dashboard**
  - `app/orders/[id]/page.tsx` — show buyer/seller name near the `EscrowTimeline`.
  - `app/seller/page.tsx` — orders table gets a buyer name column instead of/alongside the truncated order ID.

---

## Phase 9: Delivery Confirmation Code UI

Depends on `unit_backend.md` Phase 9. Do not start until 9.1–9.4 are deployed — this UI has nothing to call otherwise.

- [x] **Unit F9.1: Remove buyer "Confirm Delivery" button**
  - Locate the existing confirm-delivery action on `app/orders/[id]/page.tsx` (buyer view) and delete it along with its API call — the backend endpoint it hit no longer exists per `unit_backend.md` 9.4.

- [x] **Unit F9.2: Buyer — display the delivery code**
  - On `app/orders/[id]/page.tsx`, when `order.status === "dispatched"`, show the code prominently: large monospace digits, a short instruction line ("Give this code to the seller when your item is delivered — this releases payment to them"), and nothing else competing for attention in that section.
  - Before `dispatched`, no code exists — don't render an empty/placeholder code.
  - `types/order.ts` — add `deliveryCode: string | null` (buyer-only field, will be `null`/absent when the API response is scoped to a seller per backend Unit 9.3 — do not treat its absence as an error).

- [x] **Unit F9.3: Seller — enter code to release escrow**
  - On the seller's order detail/row (wherever `dispatchOrder` is triggered from — likely `app/seller/page.tsx` or an order detail equivalent), add an "Enter Delivery Code" control visible only when `order.status === "dispatched"`: a 6-digit input + submit button.
  - On submit, call the new `POST /api/orders/:id/release-escrow` endpoint with `{ code }`.
  - On success: order status flips to `completed`, update the UI immediately (refetch or optimistic update).
  - On 400 (wrong code): show the exact backend message, which includes remaining attempts — display it as-is, don't reword it.
  - On 423 (locked): show a static message directing the seller to contact support. Do not offer a retry input once locked.

- [x] **Unit F9.4: Update `EscrowTimeline`**
  - `components/orders/EscrowTimeline.tsx` currently has a `delivered` step before `completed`. With code-based release, `dispatched` moves straight to `completed` — there is no intermediate `delivered` state anyone triggers. Remove the `delivered` step from the visual timeline, or relabel it clearly as skipped/unused so it doesn't look like a stalled order.

- [x] **Unit F9.5: API client + normalizer updates**
  - `services/api/OrderApi.ts` — remove `confirmDelivery()` method, add `releaseEscrow(orderId: string, code: string)`.
  - `lib/normalize.ts` `normalizeOrder` — add `deliveryCode` mapping (`delivery_code` → `deliveryCode`), same `pick()` pattern as everything else.

---

## Notes

- No logic changes outside what's listed above. Phase 8 is additive rendering only — it does not touch auth, checkout, risk gating, or payment flow.
- Phase 8 cannot ship ahead of `unit_backend.md` Phase 6. Confirm the backend join units are done and deployed before starting F8.1 — otherwise `seller`/`buyer`/`sender` will be `undefined` on every response and the normalizer will silently fall through to defaults, hiding the fact that nothing is wired yet.
- Avatar fallback: initials-on-colored-circle, not a broken `<img>` tag, consistent with how `photo_url` null-handling already works on `ListingCard`.
- Phase 9 is a breaking change to the order lifecycle UI — the buyer loses the ability to unilaterally mark an order complete. Confirm with the team this tradeoff is understood (a dishonest or unresponsive buyer could withhold the code indefinitely; the dispute path exists for this but has no automated resolution either, per `unit_backend.md`'s open question).