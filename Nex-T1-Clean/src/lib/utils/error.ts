/**
 * Safe error message extraction
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && typeof error.message === "string") {
    return error.message;
  }
  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as Record<string, UntypedJson>).message === "string"
  ) {
    return (error as Record<string, UntypedJson>).message as string;
  }
  return fallback;
}
