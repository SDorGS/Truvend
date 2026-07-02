
import MarketplaceMediator from "./MarketplaceMediator";

export default class OrderComponent {

  constructor(
    private mediator: MarketplaceMediator
  ) {}

  disputeOrder() {

    this.mediator.notify(
      "OrderComponent",
      "order_disputed"
    );
  }
}
