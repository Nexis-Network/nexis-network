import {
  mergeThemePreferenceIntoMetadata,
  type AppTheme,
} from "@/lib/theme/app-theme";

export async function persistAppThemePreference(
  metadata: Record<string, UntypedJson> | null | undefined,
  theme: AppTheme,
): Promise<void> {
  const response = await fetch("/api/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      metadata: mergeThemePreferenceIntoMetadata(metadata, theme),
    }),
  });

  // The client auth session can report "authenticated" before the server-side
  // cookie/session bootstrap completes. Treat auth failures as a no-op so the
  // boot-time theme sync does not hammer /api/profile in a retry loop.
  if (response.ok || response.status === 401 || response.status === 403) {
    return;
  }

  const payload = await response.json().catch(() => ({}));
  const message =
    typeof payload?.error === "string"
      ? payload.error
      : "Failed to save theme preference";

  throw new Error(message);
}
