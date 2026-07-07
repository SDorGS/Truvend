export type OrderStatus =
  | "pending"
  | "paid"
  | "in_escrow"
  | "dispatched"
  | "delivered"
  | "completed"
  | "disputed"
  | "cancelled";

export interface Order {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;

  status: OrderStatus;

  amount?: number;
  createdAt?: string;
  // Phase 9: buyer-only field. The backend strips this before returning to
  // a seller-authenticated caller, so `null`/absent is a legitimate value —
  // it does not indicate an error.
  deliveryCode: string | null;
  buyer?: { displayName: string; avatarUrl: string | null };
  seller?: { displayName: string; avatarUrl: string | null };
}
