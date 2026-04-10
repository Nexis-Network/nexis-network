import { NextResponse } from "next/server";

/**
 * Build Content Security Policy header value.
 *
 * @param nonce - Unique nonce for script/style tags
 * @param isDev - Whether running in development mode
 * @param frameAncestors - Optional space-delimited list of allowed frame ancestors
 */
export function buildCspValue(
  nonce: string,
  isDev: boolean,
  frameAncestors?: string
): string {
  // Force deploy: update CSP for Cloudflare and Auth
  const scriptSrc = [
    "script-src",
    "'self'",
    "https://va.vercel-scripts.com",
    "https://cdn.jsdelivr.net",
    "https://*.walletconnect.com",
    "https://s3.tradingview.com",
    "https://www.tradingview.com",
    "https://*.tradingview.com",
    "https://*.walletconnect.org",
    "https://accounts.google.com",
    "https://apis.google.com",
    "https://analytics.nex-t1.ai",
  ];

  const styleSrc = [
    "style-src",
    "'self'",
    "https://fonts.googleapis.com",
  ];

  const splineSrc = [
    "https://prod.spline.design",
    "https://draft.spline.design",
    "https://*.spline.design",
    "https://storage.googleapis.com",
  ];

  const vercelBlobSrc = "https://*.public.blob.vercel-storage.com";

  // Google Fonts domains - required for Spline runtime which fetches fonts via fetch()
  const googleFontsSrc = [
    "https://fonts.googleapis.com",
    "https://fonts.gstatic.com",
  ];

  // Only enforce nonces in production. In dev we need to allow inline/eval
  // injected by Next.js HMR and React Refresh.
  if (isDev || !nonce) {
    scriptSrc.push("'unsafe-eval'", "'unsafe-inline'");
    styleSrc.push("'unsafe-inline'");
  } else {
    // Production: lock scripts to our nonce and enable strict-dynamic
    scriptSrc.push("'nonce-" + nonce + "'", "'strict-dynamic'", "'unsafe-eval'");
    // IMPORTANT: Do NOT add nonce to style-src alongside 'unsafe-inline'.
    // Per CSP Level 2+ spec, when a nonce/hash is present, 'unsafe-inline' is ignored.
    // Third-party libs (Radix, Framer Motion, Recharts) inject styles via JS which
    // cannot carry nonces. Keep only 'unsafe-inline' to allow these runtime styles.
    styleSrc.push("'unsafe-inline'");
  }

  const styleAttr = "style-src-attr 'unsafe-inline'";
  const workerSrc = "worker-src 'self' blob:";

  const connectSrc = [
    "connect-src",
    "'self'",
    "https://*.e2b.app",
    "https://*.supabase.co",
    "https://*.coingecko.com",
    "https://*.helius.xyz",
    "https://*.nexis.network",
    "https://api.coingecko.com",
    "https://*.base.org",
    "https://*.arbitrum.io",
    "https://arb1.arbitrum.io",
    "https://*.arbitrum.foundation",
    "https://assets.unicorn.studio",
    "https://accounts.google.com",
    "https://apis.google.com",
    "https://analytics.nex-t1.ai",
    "https://auth.nex-t1.ai",
    "https://cca-lite.coinbase.com",
    "https://api.cdp.coinbase.com",
    "http://127.0.0.1:4311",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "ws://*",
    "wss://*",
    "blob:",
    "https://unpkg.com",
    "https://cdn.jsdelivr.net",
    "https://www.gstatic.com",
    "https://tokens.uniswap.org",
    "https://raw.githubusercontent.com",
    "https://tokens.1inch.io",
    "https://api.jup.ag",
    "https://quote-api.jup.ag",
    "https://eth.merkle.io",
    "https://api.avax.network",
    "https://mainnet.optimism.io",
    "https://polygon-rpc.com",
    ...splineSrc,
    ...googleFontsSrc,
    "https://api.web3modal.org",
    "https://pulse.walletconnect.org",
    "https://*.walletconnect.com",
    "https://*.walletconnect.org",
    "wss://relay.walletconnect.com",
    "wss://*.walletconnect.com",
    "wss://*.walletconnect.org",
    "https://static.optimism.io",
    "https://tokenlist.arbitrum.io",
  ].join(" ");

  const frameAncestorsValue = frameAncestors?.trim();


  return [
    "default-src 'self'",
    scriptSrc.join(" "),
    `script-src-elem 'self' https://va.vercel-scripts.com https://cdn.jsdelivr.net https://*.walletconnect.com https://s3.tradingview.com https://www.tradingview.com https://*.tradingview.com https://accounts.google.com https://apis.google.com https://analytics.nex-t1.ai https://static.cloudflareinsights.com https://www.gstatic.com ${splineSrc.join(" ")} 'unsafe-inline'`,
    styleSrc.join(" "),
    styleAttr,
    workerSrc,
    `img-src 'self' data: blob: https: ${splineSrc.join(" ")} ${vercelBlobSrc} https://assets.unicorn.studio https://coin-images.coingecko.com https://raw.githubusercontent.com`,
    `font-src 'self' data: blob: ${googleFontsSrc.join(" ")} ${splineSrc.join(" ")} https://assets.unicorn.studio`,
    connectSrc,
    "frame-src 'self' http://localhost:* https://*.e2b.app https://*.supabase.co https://verify.walletconnect.com https://verify.walletconnect.org https://connect.solflare.com https://*.solflare.com https://accounts.google.com https://apis.google.com",
    `media-src 'self' data: blob: ${vercelBlobSrc}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    frameAncestorsValue ? `frame-ancestors ${frameAncestorsValue}` : "frame-ancestors 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}

/**
 * Apply all security headers to a response.
 */
export function applySecurityHeaders(
  response: NextResponse,
  cspValue: string,
  nonce: string,
  options?: { allowEmbedding?: boolean; coopPolicy?: string }
): NextResponse {
  response.headers.set("Content-Security-Policy", cspValue);
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Content-Type-Options", "nosniff");
  if (options?.allowEmbedding) {
    response.headers.delete("X-Frame-Options");
  } else {
    response.headers.set("X-Frame-Options", "SAMEORIGIN");
  }
  response.headers.set("Permissions-Policy", "camera=(), microphone=(self), geolocation=()");
  response.headers.set("Cross-Origin-Opener-Policy", options?.coopPolicy ?? "same-origin-allow-popups");
  response.headers.set("x-nonce", nonce);
  return response;
}
