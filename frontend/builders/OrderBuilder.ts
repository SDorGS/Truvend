
import { Order } from "@/types/order";

export default class OrderBuilder {
  private order: Partial<Order> = {};

  setBuyer(id: string) {
    this.order.buyerId = id;
    return this;
  }

  setSeller(id: string) {
    this.order.sellerId = id;
    return this;
  }

  setStatus(status: Order["status"]) {
    this.order.status = status;
    return this;
  }

  build(): Order {
    return this.order as Order;
  }
}


====================================================================================================
