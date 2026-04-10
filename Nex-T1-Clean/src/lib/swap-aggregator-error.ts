export class SwapAggregatorError extends Error {
  constructor(message: string, public readonly details?: UntypedJson) {
    super(message);
    this.name = "SwapAggregatorError";
  }
}
