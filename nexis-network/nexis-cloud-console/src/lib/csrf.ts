export async function getCsrfToken(): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("getCsrfToken must be called in the browser");
  }

  const cached = window.sessionStorage.getItem("nexis_csrf_token");
  if (cached) return cached;

  const response = await fetch("/api/auth/csrf", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to load CSRF token");
  }

  const payload = (await response.json()) as { token?: string };
  if (!payload.token) {
    throw new Error("Invalid CSRF response");
  }

  window.sessionStorage.setItem("nexis_csrf_token", payload.token);
  return payload.token;
}
