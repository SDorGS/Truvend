
export interface OrderState {
  next(): OrderState;

  status(): string;
}
