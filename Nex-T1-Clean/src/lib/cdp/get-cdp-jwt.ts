/**
 * Client-side helper to fetch a CDP RS256 JWT.
 *
 * This is used as the `customAuth.getJwt` callback in CDPHooksProvider.
 * It calls our JWT bridge endpoint which verifies the Supabase session
 * and returns a short-lived RS256 token that CDP can verify.
 */

let inflight: Promise<string> | null = null;

/**
 * Fetch a CDP JWT from the bridge endpoint.
 *
 * Deduplicates concurrent calls (e.g. when multiple CDP hooks
 * request auth simultaneously) by returning the same in-flight promise.
 */
export async function getCdpJwt(): Promise<string> {
  if (inflight) return inflight;

  inflight = fetchCdpToken().finally(() => {
    inflight = null;
  });

  return inflight;
}

async function fetchCdpToken(): Promise<string> {
  const response = await fetch("/api/auth/cdp/token", {
    method: "POST",
    credentials: "include", // send Supabase session cookies
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message =
      (body as { error?: { message?: string } })?.error?.message ??
      `CDP token request failed (${response.status})`;
    throw new Error(message);
  }

  const body = (await response.json()) as {
    success: boolean;
    data?: { token?: string };
  };

  if (!body.success || !body.data?.token) {
    throw new Error("CDP token response missing token");
  }

  return body.data.token;
}
