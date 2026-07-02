
import { OrderState } from "./OrderState";
import EscrowState from "./EscrowState";

export default class PaidState
  implements OrderState
{
  next(): OrderState {
    return new EscrowState();
  }

  status(): string {
    return "paid";
  }
}
