import ApiClient, { ApiError } from "./ApiClient";
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

  // The backend returns the whole Order row (snake_case: checkout_link, id, ...).
  // Callers only need the pieces they use, so we translate here — without this,
  // `checkoutLink` comes back undefined and `window.location.href = undefined`
  // navigates to the string "undefined" (relative), landing on /listings/undefined.
  async checkout(listingId: string): Promise<CheckoutResponse> {
    const raw = await this.api.post<Record<string, unknown>>(
      "/api/orders/checkout",
      { listingId }
    );

    const checkoutLink = String(raw.checkoutLink ?? raw.checkout_link ?? "");
    const orderId = String(raw.orderId ?? raw.id ?? "");

    if (!checkoutLink) {
      throw new ApiError(502, "NO_CHECKOUT_LINK", "Checkout did not return a payment link.");
    }

    return { checkoutLink, orderId };
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
