"use client";

const CSRF_COOKIE = "csrf_token";
const CSRF_HEADER = "x-csrf-token";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const cookies = document.cookie.split(";").map((part) => part.trim());
  for (const cookie of cookies) {
    if (!cookie.startsWith(`${name}=`)) {
      continue;
    }

    const value = cookie.slice(name.length + 1).trim();
    return value ? decodeURIComponent(value) : null;
  }

  return null;
}

function createToken(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function ensureClientCsrfToken(): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const existing = readCookie(CSRF_COOKIE);
  if (existing) {
    return existing;
  }

  const token = createToken();
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";

  document.cookie = `${CSRF_COOKIE}=${encodeURIComponent(token)}; Path=/; SameSite=Lax${secure}`;
  return token;
}

export function getClientCsrfHeaders(
  headers?: HeadersInit,
): Record<string, string> {
  const nextHeaders = new Headers(headers);
  const token = ensureClientCsrfToken();

  if (token) {
    nextHeaders.set(CSRF_HEADER, token);
  }

  return Object.fromEntries(nextHeaders.entries());
}
