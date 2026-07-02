
import ApiClient from "./ApiClient";
import { Order } from "@/types/order";
import { Payout, VirtualAccount } from "@/types/seller";
import { normalizeOrders, normalizePayouts, normalizeVirtualAccount } from "@/lib/normalize";

export default class SellerApi {
  private api = ApiClient.getInstance();

  async getOrders(): Promise<Order[]> {
    const raw = await this.api.get<unknown>("/api/seller/orders");
    return normalizeOrders(raw);
  }

  async getPayouts(): Promise<Payout[]> {
    const raw = await this.api.get<unknown>("/api/seller/payouts");
    return normalizePayouts(raw);
  }

  async dispatchOrder(id: string, trackingNumber?: string): Promise<Order> {
    const raw = await this.api.post<Record<string, unknown>>(`/api/seller/orders/${id}/dispatch`, {
      trackingNumber,
    });
    return { ...({} as Order), ...raw } as Order;
  }

  async getVirtualAccount(): Promise<VirtualAccount> {
    const raw = await this.api.get<Record<string, unknown>>("/api/seller/virtual-account");
    return normalizeVirtualAccount(raw);
  }
}
