export function resolveInitialConversationId(
  searchParams: URLSearchParams | null | undefined,
): string | null {
  if (!searchParams) {
    return null;
  }

  for (const key of ["session", "conversationId"] as const) {
    const value = searchParams.get(key);
    if (typeof value !== "string") {
      continue;
    }

    const trimmed = value.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }

  return null;
}
