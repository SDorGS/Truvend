
import Handler from "./Handler";

export default class VerificationHandler
  extends Handler
{
  protected process(
    request: string
  ): void {
    console.log(
      `Seller Verification: ${request}`
    );
  }
}



====================================================================================================
