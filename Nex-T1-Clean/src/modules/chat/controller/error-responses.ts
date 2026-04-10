function getStructuredErrorCode(message: string): string | null {
  return /^[a-z0-9_]+$/.test(message) ? message : null;
}

export function createErrorResponse(status: number, message: string): Response {
  const code = getStructuredErrorCode(message);
  return new Response(
    JSON.stringify({
      success: false,
      error: code ? { message, code } : { message },
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}
