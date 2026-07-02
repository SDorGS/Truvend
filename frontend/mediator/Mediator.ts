
export interface Mediator {
  notify(
    sender: string,
    event: string,
    data?: unknown
  ): void;
}
