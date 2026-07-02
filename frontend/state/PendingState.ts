import { OrderState } from "./OrderState";
import PaidState from "./PaidState";

export default class PendingState
  implements OrderState
{
  next(): OrderState {
    return new PaidState();
  }

  status(): string {
    return "pending";
  }
}

