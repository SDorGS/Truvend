
import ApiClient from "./ApiClient";
import { Order } from "@/types/order";
import { normalizeOrder, normalizeOrders } from "@/lib/normalize";

interface CheckoutResponse {
  checkoutLink: string;
  orderId: string;
}

export default class OrderApi {
  private api = ApiClient.getInstance();

  async getOrders(): Promise<Order[]> {
    const raw = await this.api.get<unknown>("/api/orders");
    return normalizeOrders(raw);
  }

  async getOrder(id: string): Promise<Order> {
    const raw = await this.api.get<Record<string, unknown>>(`/api/orders/${id}`);
    return normalizeOrder(raw);
  }

  checkout(listingId: string) {
    return this.api.post<CheckoutResponse>("/api/orders/checkout", { listingId });
  }

  async confirmDelivery(id: string): Promise<Order> {
    const raw = await this.api.post<Record<string, unknown>>(
      `/api/orders/${id}/confirm-delivery`,
      {}
    );
    return normalizeOrder(raw);
  }

  async dispute(id: string): Promise<Order> {
    const raw = await this.api.post<Record<string, unknown>>(`/api/orders/${id}/dispute`, {});
    return normalizeOrder(raw);
  }
}
