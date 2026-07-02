
import MarketplaceMediator from "./MarketplaceMediator";

export default class PaymentComponent {

  constructor(
    private mediator: MarketplaceMediator
  ) {}

  completePayment() {

    this.mediator.notify(
      "PaymentComponent",
      "payment_completed"
    );
  }
}
