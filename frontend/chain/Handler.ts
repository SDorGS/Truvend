
export default abstract class Handler {

  private nextHandler?: Handler;

  setNext(handler: Handler): Handler {
    this.nextHandler = handler;
    return handler;
  }

  handle(request: string): void {
    this.process(request);

    if (this.nextHandler) {
      this.nextHandler.handle(request);
    }
  }

  protected abstract process(
    request: string
  ): void;
}
