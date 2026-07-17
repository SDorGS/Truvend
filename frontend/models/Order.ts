import { Order as OrderType } from "@/types/order";

export default class Order implements OrderType {
  id!: string;

  listingId!: string;

  buyerId!: string;

  sellerId!: string;

  status!: OrderType["status"];

  amount?: number;

  createdAt?: string;

  deliveryCode!: string | null;

  buyer?: {
    displayName: string;
    avatarUrl: string | null;
  };

  seller?: {
    displayName: string;
    avatarUrl: string | null;
  };

  constructor(data: OrderType) {
    Object.assign(this, data);
  }

  clone(): Order {
    return new Order({
      ...this,
    });
  }
}
