/**
 * Streamdown Security Configuration
 *
 * Streamdown v1.6.11 already includes rehype-sanitize + rehype-harden in its
 * default pipeline. This module provides DEFENSE-IN-DEPTH at the component
 * level (via the custom `a` override) for additional URL safety.
 *
 * Layers:
 * 1. rehype-raw — parses HTML in markdown into AST nodes (Streamdown default)
 * 2. rehype-sanitize — strips dangerous elements/attributes (Streamdown default)
 * 3. rehype-harden — restricts link/image URLs and protocols (Streamdown default)
 * 4. safeUrlTransform — component-level defense-in-depth (this module)
 */

/**
 * Trusted link domains for external link safety checks.
 * Used by the custom `a` component override to determine if
 * an external link should open directly vs show a warning.
 */
export const TRUSTED_LINK_DOMAINS = new Set([
  "nex-t1.ai",
  "www.nex-t1.ai",
  "etherscan.io",
  "basescan.org",
  "arbiscan.io",
  "optimistic.etherscan.io",
  "polygonscan.com",
  "bscscan.com",
  "solscan.io",
  "solana.fm",
  "explorer.solana.com",
  "stellar.expert",
  "github.com",
  "docs.google.com",
  "coingecko.com",
  "www.coingecko.com",
  "coinmarketcap.com",
  "defillama.com",
  "dexscreener.com",
  "dextools.io",
  "jup.ag",
  "app.uniswap.org",
  "aave.com",
  "app.safe.global",
]);

/**
 * Check whether a URL belongs to a trusted domain.
 * Returns true if the hostname (with or without www.) is in the safelist.
 */
export function isTrustedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
    return (
      TRUSTED_LINK_DOMAINS.has(hostname) ||
      TRUSTED_LINK_DOMAINS.has(`www.${hostname}`)
    );
  } catch {
    return false;
  }
}

/**
 * Defense-in-depth URL filter for the custom `a` component override.
 * Blocks private IPs, non-http protocols, and .local domains.
 *
 * Returns undefined to suppress the URL, or the URL string to keep it.
 */
export function safeUrlTransform(url: string): string | undefined {
  // Skip relative URLs and anchors
  if (url.startsWith("#") || url.startsWith("/")) {
    return url;
  }

  try {
    const parsed = new URL(url, "https://nex-t1.ai");

    // Block non-http(s)/mailto protocols
    if (!["http:", "https:", "mailto:"].includes(parsed.protocol)) {
      return undefined;
    }

    // Block private/local IPs in production
    if (process.env.NODE_ENV === "production") {
      const hostname = parsed.hostname.toLowerCase();
      if (
        hostname === "localhost" ||
        hostname.startsWith("127.") ||
        hostname.startsWith("192.168.") ||
        hostname.startsWith("10.") ||
        hostname.startsWith("172.16.") ||
        hostname.startsWith("172.17.") ||
        hostname.startsWith("172.18.") ||
        hostname.startsWith("172.19.") ||
        hostname.startsWith("172.2") ||
        hostname.startsWith("172.30.") ||
        hostname.startsWith("172.31.") ||
        hostname === "[::1]" ||
        hostname.endsWith(".local") ||
        hostname.endsWith(".internal")
      ) {
        return undefined;
      }
    }

    return url;
  } catch {
    // Unparseable URL — remove it
    return undefined;
  }
}
