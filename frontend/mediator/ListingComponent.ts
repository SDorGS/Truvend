
import MarketplaceMediator from "./MarketplaceMediator";

export default class ListingComponent {

  constructor(
    private mediator: MarketplaceMediator
  ) {}

  createListing() {

    this.mediator.notify(
      "ListingComponent",
      "listing_created"
    );
  }
}
