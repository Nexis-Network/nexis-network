export function extractCorrelationId(response: Response): string | undefined {
  try {
    return response.headers.get("X-Correlation-Id") ?? undefined;
  } catch {
    return undefined;
  }
}

export function getActiveOrgId(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith("org_active_account="));
  return match ? decodeURIComponent(match.split("=")[1] ?? "") : null;
}
