
import Handler from "./Handler";

export default class PaymentHandler
  extends Handler
{
  protected process(
    request: string
  ): void {
    console.log(
      `Payment Processing: ${request}`
    );
  }
}
