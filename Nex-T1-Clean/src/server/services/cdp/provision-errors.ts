type CdpErrorMeta = {
  readonly statusCode: number | null;
  readonly errorType: string | null;
  readonly message: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function readString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function readNumber(record: Record<string, unknown>, key: string): number | null {
  const value = record[key];
  return typeof value === "number" ? value : null;
}

export function getCdpErrorMeta(error: unknown): CdpErrorMeta {
  const record = asRecord(error);
  if (!record) {
    return {
      statusCode: null,
      errorType: null,
      message: error instanceof Error ? error.message : null,
    };
  }

  const nestedError = asRecord(record.error);

  const statusCode =
    readNumber(record, "statusCode") ??
    readNumber(record, "status") ??
    (nestedError ? readNumber(nestedError, "statusCode") : null) ??
    (nestedError ? readNumber(nestedError, "status") : null);

  const errorType =
    readString(record, "errorType") ??
    readString(record, "type") ??
    readString(record, "code") ??
    (nestedError ? readString(nestedError, "errorType") : null) ??
    (nestedError ? readString(nestedError, "type") : null) ??
    (nestedError ? readString(nestedError, "code") : null);

  const messageParts = [
    readString(record, "errorMessage"),
    readString(record, "message"),
    nestedError ? readString(nestedError, "errorMessage") : null,
    nestedError ? readString(nestedError, "message") : null,
  ].filter((value): value is string => typeof value === "string");

  return {
    statusCode,
    errorType,
    message: messageParts.length > 0
      ? messageParts.join(" | ")
      : error instanceof Error
        ? error.message
        : null,
  };
}

export function isExistingCdpUserConflict(error: unknown): boolean {
  const meta = getCdpErrorMeta(error);
  const normalizedType = meta.errorType?.trim().toLowerCase() ?? "";
  const normalizedMessage = meta.message?.trim().toLowerCase() ?? "";

  if (meta.statusCode === 409) {
    return true;
  }

  if (normalizedType === "already_exists") {
    return true;
  }

  if (normalizedMessage.includes("already associated with another user account")) {
    return true;
  }

  if (
    normalizedMessage.includes("already exists") ||
    normalizedMessage.includes("duplicate")
  ) {
    return true;
  }

  return false;
}
