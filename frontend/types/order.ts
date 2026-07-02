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
  buyer?: { displayName: string; avatarUrl: string | null };
  seller?: { displayName: string; avatarUrl: string | null };
}
