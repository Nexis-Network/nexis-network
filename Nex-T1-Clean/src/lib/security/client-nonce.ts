// Domain: security
// Responsibility: Safely surface the per-request CSP nonce inside client components.
// Depends on: DOM meta tag written by RootLayout with name="csp-nonce".

let cachedNonce: string | null | undefined;

/**
 * Read the CSP nonce that middleware injected into a <meta name="csp-nonce" /> tag.
 * Returns null server-side or when the meta tag is missing.
 */
export const getClientCspNonce = (): string | null => {
  if (cachedNonce !== undefined) return cachedNonce;
  if (typeof document === "undefined") {
    cachedNonce = null;
    return cachedNonce;
  }

  cachedNonce = document.querySelector("meta[name='csp-nonce']")?.getAttribute("content") ?? null;
  return cachedNonce;
};

/**
 * Lightweight hook wrapper for components that prefer React semantics.
 */
export const useCspNonce = (): string | null => {
  if (typeof window === "undefined") return null;
  return getClientCspNonce();
};
