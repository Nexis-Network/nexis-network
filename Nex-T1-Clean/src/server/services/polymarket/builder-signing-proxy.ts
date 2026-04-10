/**
 * Polymarket Builder Signing Proxy
 *
 * Server-only module that generates HMAC-SHA256 builder headers for order
 * attribution. Builder credentials (key, secret, passphrase) MUST NEVER
 * be exposed to the client.
 *
 * Source: https://docs.polymarket.com/developers/builders/order-attribution
 * SDK: https://github.com/Polymarket/builder-signing-sdk
 */

import { createHmac } from "node:crypto";
import { isBuildEvaluation } from "@/lib/server/build-evaluation";
import { logger } from "@/lib/logger";
import { POLY_BUILDER_HEADERS } from "./constants";
import type { BuilderConfig, BuilderHeaders } from "./types";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

function loadBuilderConfig(): BuilderConfig | null {
  const apiKey = process.env.POLYMARKET_BUILDER_API_KEY;
  const secret = process.env.POLYMARKET_BUILDER_SECRET;
  const passphrase = process.env.POLYMARKET_BUILDER_PASSPHRASE;

  if (!apiKey || !secret || !passphrase) {
    return null;
  }

  return { apiKey, secret, passphrase };
}

// ---------------------------------------------------------------------------
// HMAC Signing
// ---------------------------------------------------------------------------

/**
 * Generate HMAC-SHA256 signature for builder authentication.
 *
 * The signature covers: timestamp + method + path + body
 * This matches the signing pattern in @polymarket/builder-signing-sdk.
 */
function buildHmacSignature(
  secret: string,
  timestamp: string,
  method: string,
  path: string,
  body = "",
): string {
  const message = timestamp + method.toUpperCase() + path + body;
  const hmac = createHmac("sha256", Buffer.from(secret, "base64"));
  hmac.update(message);
  return hmac.digest("base64");
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

class BuilderSigningProxy {
  private config: BuilderConfig | null;

  constructor() {
    this.config = loadBuilderConfig();

    if (!this.config && !isBuildEvaluation()) {
      logger.warn(
        "[polymarket:builder] Builder credentials not configured. " +
          "Gasless relayer and order attribution will be unavailable.",
      );
    }
  }

  /**
   * Check if builder credentials are available.
   */
  get isConfigured(): boolean {
    return this.config !== null;
  }

  /**
   * Generate builder authentication headers for a CLOB request.
   *
   * These headers are ADDED to the normal L2 auth headers to attribute
   * orders to this builder.
   *
   * @param method - HTTP method (GET, POST, DELETE)
   * @param path - API path (e.g., "/order")
   * @param body - Request body as JSON string (for POST requests)
   */
  generateHeaders(method: string, path: string, body = ""): BuilderHeaders {
    if (!this.config) {
      throw new Error(
        "Builder credentials not configured. Set POLYMARKET_BUILDER_API_KEY, " +
          "POLYMARKET_BUILDER_SECRET, and POLYMARKET_BUILDER_PASSPHRASE.",
      );
    }

    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = buildHmacSignature(
      this.config.secret,
      timestamp,
      method,
      path,
      body,
    );

    return {
      [POLY_BUILDER_HEADERS.API_KEY]: this.config.apiKey,
      [POLY_BUILDER_HEADERS.SIGNATURE]: signature,
      [POLY_BUILDER_HEADERS.TIMESTAMP]: timestamp,
      [POLY_BUILDER_HEADERS.PASSPHRASE]: this.config.passphrase,
    };
  }

  /**
   * Get the builder config for passing to the CLOB client SDK.
   * This is used when initializing the ClobClient with builder support.
   */
  getBuilderConfig(): BuilderConfig | null {
    return this.config;
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

export const builderSigningProxy = new BuilderSigningProxy();
export { BuilderSigningProxy, buildHmacSignature };
