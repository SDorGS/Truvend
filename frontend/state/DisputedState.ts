
import { OrderState } from "./OrderState";

export default class DisputedState
  implements OrderState
{
  next(): OrderState {
    return this;
  }

  status(): string {
    return "disputed";
  }
}
