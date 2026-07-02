
import { OrderState } from "./OrderState";
import DeliveredState from "./DeliveredState";

export default class EscrowState
  implements OrderState
{
  next(): OrderState {
    return new DeliveredState();
  }

  status(): string {
    return "in_escrow";
  }
}
