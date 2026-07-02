
import Handler from "./Handler";

export default class RiskHandler
  extends Handler
{
  protected process(
    request: string
  ): void {
    console.log(
      `Risk Check: ${request}`
    );
  }
}
