
import Order from "@/models/Order";
import { Order as OrderType } from "@/types/order";

export default class OrderFactory {
  static create(data: OrderType): Order {
    return new Order(data);
  }
}


====================================================================================================
