
// The backend guide shows camelCase field names, but real API responses
// commonly come back snake_case from Express/Postgres unless explicitly
// transformed. These normalizers accept either shape so the frontend
// doesn't silently break on a naming mismatch — pick whichever key is
// actually present, falling back to a safe default rather than undefined.

import { Listing, RiskLevel } from "@/types/listing";
import { Order, OrderStatus } from "@/types/order";
import { Payout, VirtualAccount } from "@/types/seller";
import { Message } from "@/types/message";

function pick<T>(obj: Record<string, unknown>, ...keys: string[]): T | undefined {
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) {
      return obj[key] as T;
    }
  }
  return undefined;
}

const VALID_RISK_LEVELS: RiskLevel[] = ["clear", "caution", "suspicious", "high_risk"];

export function normalizeListing(raw: Record<string, unknown>): Listing {
  const riskLevel = pick<string>(raw, "riskLevel", "risk_level");
  const safeRiskLevel: RiskLevel = VALID_RISK_LEVELS.includes(riskLevel as RiskLevel)
    ? (riskLevel as RiskLevel)
    : "clear";

  return {
    id: String(pick(raw, "id") ?? ""),
    sellerId: String(pick(raw, "sellerId", "seller_id") ?? ""),
    seller: (function () {
      const s = pick(raw, 'seller', 'seller') as Record<string, unknown> | undefined
      if (!s) return undefined
      return {
        displayName: String(pick(s, 'display_name', 'displayName') ?? ''),
        avatarUrl: String(pick(s, 'avatar_url', 'avatarUrl') ?? null) as string | null,
      }
    })(),
    title: String(pick(raw, "title") ?? "Untitled listing"),
    description: String(pick(raw, "description") ?? ""),
    image: String(pick(raw, "image", "image_url", "imageUrl", "photo_url", "photoUrl") ?? ""),
    price: Number(pick(raw, "price") ?? 0),
    riskScore: Number(pick(raw, "riskScore", "risk_score") ?? 0),
    riskLevel: safeRiskLevel,
    riskExplanation: String(
      pick(raw, "riskExplanation", "risk_explanation") ?? "No fraud analysis available yet."
    ),
  };
}

export function normalizeListings(raw: unknown): Listing[] {
  return Array.isArray(raw) ? raw.map((item) => normalizeListing(item)) : [];
}

const VALID_ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "paid",
  "in_escrow",
  "dispatched",
  "delivered",
  "completed",
  "disputed",
  "cancelled",
];

export function normalizeOrder(raw: Record<string, unknown>): Order {
  const status = pick<string>(raw, "status");
  const safeStatus: OrderStatus = VALID_ORDER_STATUSES.includes(status as OrderStatus)
    ? (status as OrderStatus)
    : "pending";

  const amountRaw = pick(raw, "amount");
  const createdAtRaw = pick(raw, "createdAt", "created_at");
  const deliveryCodeRaw = pick(raw, "deliveryCode", "delivery_code");

  return {
    id: String(pick(raw, "id") ?? ""),
    listingId: String(pick(raw, "listingId", "listing_id") ?? ""),
    buyerId: String(pick(raw, "buyerId", "buyer_id") ?? ""),
    sellerId: String(pick(raw, "sellerId", "seller_id") ?? ""),
    status: safeStatus,
    amount: amountRaw !== undefined ? Number(amountRaw) : undefined,
    createdAt: createdAtRaw !== undefined ? String(createdAtRaw) : undefined,
    deliveryCode: deliveryCodeRaw !== undefined ? String(deliveryCodeRaw) : null,
    buyer: (function () {
      const b = pick(raw, 'buyer', 'buyer') as Record<string, unknown> | undefined
      if (!b) return undefined
      return {
        displayName: String(pick(b, 'display_name', 'displayName') ?? ''),
        avatarUrl: String(pick(b, 'avatar_url', 'avatarUrl') ?? null) as string | null,
      }
    })(),
    seller: (function () {
      const s = pick(raw, 'seller', 'seller') as Record<string, unknown> | undefined
      if (!s) return undefined
      return {
        displayName: String(pick(s, 'display_name', 'displayName') ?? ''),
        avatarUrl: String(pick(s, 'avatar_url', 'avatarUrl') ?? null) as string | null,
      }
    })(),
  };
}

export function normalizeOrders(raw: unknown): Order[] {
  return Array.isArray(raw) ? raw.map((item) => normalizeOrder(item)) : [];
}

export function normalizePayout(raw: Record<string, unknown>): Payout {
  return {
    id: String(pick(raw, "id") ?? ""),
    amount: Number(pick(raw, "amount") ?? 0),
    status: String(pick(raw, "status") ?? "pending"),
    createdAt: String(pick(raw, "createdAt", "created_at") ?? new Date().toISOString()),
  };
}

export function normalizePayouts(raw: unknown): Payout[] {
  return Array.isArray(raw) ? raw.map((item) => normalizePayout(item)) : [];
}

export function normalizeVirtualAccount(raw: Record<string, unknown>): VirtualAccount {
  return {
    accountNumber: String(pick(raw, "accountNumber", "account_number") ?? ""),
    bankName: String(pick(raw, "bankName", "bank_name") ?? ""),
    accountName: String(pick(raw, "accountName", "account_name") ?? ""),
  };
}

export function normalizeMessage(raw: Record<string, unknown>): Message {
  return {
    id: String(pick(raw, "id") ?? ""),
    orderId: String(pick(raw, "orderId", "order_id") ?? ""),
    senderId: String(pick(raw, "senderId", "sender_id") ?? ""),
    body: String(pick(raw, "body") ?? ""),
    createdAt: String(pick(raw, "createdAt", "created_at") ?? new Date().toISOString()),
    sender: (function () {
      const s = pick(raw, 'sender', 'sender') as Record<string, unknown> | undefined
      if (!s) return undefined
      return {
        displayName: String(pick(s, 'display_name', 'displayName') ?? ''),
        avatarUrl: String(pick(s, 'avatar_url', 'avatarUrl') ?? null) as string | null,
      }
    })(),
  };
}

export function normalizeMessages(raw: unknown): Message[] {
  return Array.isArray(raw) ? raw.map((item) => normalizeMessage(item)) : [];
}
