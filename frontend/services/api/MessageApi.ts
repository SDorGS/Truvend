import ApiClient from "./ApiClient";
import { Message } from "@/types/message";
import { normalizeMessage, normalizeMessages } from "@/lib/normalize";

export default class MessageApi {
  private api = ApiClient.getInstance();

  async getForOrder(orderId: string): Promise<Message[]> {
    const raw = await this.api.get<unknown>(`/api/orders/${orderId}/messages`);
    return normalizeMessages(raw);
  }

  async send(orderId: string, body: string): Promise<Message> {
    const raw = await this.api.post<Record<string, unknown>>(
      `/api/orders/${orderId}/messages`,
      { body }
    );
    return normalizeMessage(raw);
  }
}
