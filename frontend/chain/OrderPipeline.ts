
import RiskHandler from "./RiskHandler";
import VerificationHandler from "./VerificationHandler";
import PaymentHandler from "./PaymentHandler";
import EscrowHandler from "./EscrowHandler";
import DeliveryHandler from "./DeliveryHandler";
import CompletionHandler from "./CompletionHandler";

export default class OrderPipeline {

  static execute(orderId: string): void {

    const risk = new RiskHandler();

    const verification =
      new VerificationHandler();

    const payment =
      new PaymentHandler();

    const escrow =
      new EscrowHandler();

    const delivery =
      new DeliveryHandler();

    const completion =
      new CompletionHandler();

    risk
      .setNext(verification)
      .setNext(payment)
      .setNext(escrow)
      .setNext(delivery)
      .setNext(completion);

    risk.handle(orderId);
  }
}
