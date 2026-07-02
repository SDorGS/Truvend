
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
}
