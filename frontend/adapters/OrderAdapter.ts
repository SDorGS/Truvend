
import Order from "@/models/Order";
import { Order as OrderType } from "@/types/order";

export default class OrderAdapter {
  static adapt(data: OrderType): Order {
    return new Order(data);
  }

  static adaptMany(data: OrderType[]): Order[] {
    return data.map((item) => this.adapt(item));
  }
}


====================================================================================================
