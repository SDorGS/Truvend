
import { Mediator } from "./Mediator";

export default class MarketplaceMediator
  implements Mediator
{
  notify(
    sender: string,
    event: string,
    data?: unknown
  ): void {

    console.log(
      `[Mediator] ${sender} -> ${event}`,
      data
    );

    switch (event) {

      case "listing_created":
        console.log(
          "Notify buyers of new listing."
        );
        break;

      case "payment_completed":
        console.log(
          "Create escrow order."
        );
        break;

      case "order_disputed":
        console.log(
          "Notify administrator."
        );
        break;

      case "seller_verified":
        console.log(
          "Update seller profile."
        );
        break;

      default:
        console.log(
          "Unhandled event."
        );
    }
  }
}
