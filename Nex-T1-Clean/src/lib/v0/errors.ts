import "server-only";

export type V0ErrorCode =
  | "CONFIGURATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "PAYLOAD_TOO_LARGE"
  | "UNPROCESSABLE_ENTITY"
  | "UPSTREAM_ERROR";

export class V0ClientError extends Error {
  readonly code: V0ErrorCode;
  readonly status: number;
  readonly retryable: boolean;

  constructor(options: {
    code: V0ErrorCode;
    message: string;
    retryable?: boolean;
    status?: number;
  }) {
    super(options.message);
    this.name = "V0ClientError";
    this.code = options.code;
    this.status = options.status ?? 500;
    this.retryable = options.retryable ?? false;
  }
}

export function createV0HttpError(status: number): V0ClientError {
  if (status === 401) {
    return new V0ClientError({
      code: "UNAUTHORIZED",
      message: "The v0 API credentials are not authorized.",
      status,
    });
  }

  if (status === 403) {
    return new V0ClientError({
      code: "FORBIDDEN",
      message: "The v0 API request was rejected.",
      status,
    });
  }

  if (status === 404) {
    return new V0ClientError({
      code: "NOT_FOUND",
      message: "The requested v0 resource was not found.",
      status,
    });
  }

  if (status === 409) {
    return new V0ClientError({
      code: "CONFLICT",
      message: "The v0 resource is in a conflicting state.",
      status,
    });
  }

  if (status === 413) {
    return new V0ClientError({
      code: "PAYLOAD_TOO_LARGE",
      message: "The request payload is too large for v0.",
      status,
    });
  }

  if (status === 422) {
    return new V0ClientError({
      code: "UNPROCESSABLE_ENTITY",
      message: "v0 could not process this request.",
      status,
    });
  }

  if (status === 429) {
    return new V0ClientError({
      code: "RATE_LIMITED",
      message: "v0 rate limited the request. Please try again shortly.",
      retryable: true,
      status,
    });
  }

  return new V0ClientError({
    code: "UPSTREAM_ERROR",
    message: "v0 is temporarily unavailable.",
    retryable: status >= 500,
    status,
  });
}

export function normalizeV0Error(error: unknown): V0ClientError {
  if (error instanceof V0ClientError) {
    return error;
  }

  const message =
    error instanceof Error && error.message
      ? error.message
      : "v0 is temporarily unavailable.";

  return new V0ClientError({
    code: "UPSTREAM_ERROR",
    message,
    retryable: true,
    status: 500,
  });
}
