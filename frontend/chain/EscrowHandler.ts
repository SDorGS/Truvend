
import Handler from "./Handler";

export default class EscrowHandler
  extends Handler
{
  protected process(
    request: string
  ): void {
    console.log(
      `Escrow Created: ${request}`
    );
  }
}
