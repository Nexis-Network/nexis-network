export class CreateServiceError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: UntypedJson;

  constructor(options: {
    code: string;
    message: string;
    status?: number;
    details?: UntypedJson;
  }) {
    super(options.message);
    this.name = "CreateServiceError";
    this.code = options.code;
    this.status = options.status ?? 400;
    this.details = options.details;
  }
}
