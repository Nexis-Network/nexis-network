import "server-only";

import type { NextRequest } from "next/server";

import { resolvePublicAppOrigin } from "@/lib/auth/auth-origin";
import { extractClientIP } from "@/lib/request-utils";

function isLocalHostname(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".localhost")
  );
}

export function resolveCdpClientIp(request: NextRequest): string {
  const clientIp = extractClientIP(request).trim();
  if (clientIp && clientIp !== "unknown") {
    return clientIp;
  }

  try {
    const { hostname } = new URL(request.url);
    if (isLocalHostname(hostname)) {
      return "127.0.0.1";
    }
  } catch {
    // Ignore URL parsing failures and fall through to the explicit error below.
  }

  throw new Error("Client IP is required for Coinbase secure initialization");
}

export function buildCdpPayRedirectUrl(
  request: NextRequest,
  source: "coinbase-onramp" | "coinbase-offramp",
): string {
  const origin = resolvePublicAppOrigin(request);
  return new URL(`/settings/wallets?source=${source}`, origin).toString();
}
