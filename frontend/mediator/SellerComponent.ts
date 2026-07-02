import MarketplaceMediator from "./MarketplaceMediator";

export default class SellerComponent {

  constructor(
    private mediator: MarketplaceMediator
  ) {}

  verifySeller() {

    this.mediator.notify(
      "SellerComponent",
      "seller_verified"
    );
  }
}


