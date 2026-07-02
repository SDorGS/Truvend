
import Handler from "./Handler";

export default class DeliveryHandler
  extends Handler
{
  protected process(
    request: string
  ): void {
    console.log(
      `Delivery Started: ${request}`
    );
  }
}
