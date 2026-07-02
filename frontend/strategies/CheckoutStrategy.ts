
export interface CheckoutStrategy {
  checkout(): void;
}

export class EscrowCheckout
  implements CheckoutStrategy
{
  checkout() {
    console.log("Escrow Checkout");
  }
}

export class DirectCheckout
  implements CheckoutStrategy
{
  checkout() {
    console.log("Direct Checkout");
  }
}
