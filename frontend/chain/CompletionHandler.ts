
import Handler from "./Handler";

export default class CompletionHandler
  extends Handler
{
  protected process(
    request: string
  ): void {
    console.log(
      `Order Completed: ${request}`
    );
  }
}
