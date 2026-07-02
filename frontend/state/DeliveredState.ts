
import { OrderState } from "./OrderState";

export default class DeliveredState
  implements OrderState
{
  next(): OrderState {
    return this;
  }

  status(): string {
    return "delivered";
  }
}
