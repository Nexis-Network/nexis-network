/**
 * CDP Webhook Registration Service
 *
 * Manages webhook endpoint registrations with the Coinbase Developer Platform
 * API. Provides CRUD operations for webhook configurations.
 *
 * CDP REST API:
 *   POST   /platform/v1/webhooks        — register a webhook
 *   GET    /platform/v1/webhooks        — list all webhooks
 *   DELETE /platform/v1/webhooks/{id}   — delete a webhook
 *
 * Authentication uses CDP API key credentials (CDP_API_KEY_ID + CDP_API_KEY_SECRET).
 */
import "server-only";

import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CdpWebhookConfig = {
  id: string;
  url: string;
  eventTypes: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
};

type CdpWebhookApiResponse = {
  id: string;
  url: string;
  event_types: string[];
  status: string;
  created_at: string;
  updated_at: string;
};

type CdpWebhookListResponse = {
  data: CdpWebhookApiResponse[];
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CDP_API_BASE = "https://api.developer.coinbase.com";
const WEBHOOKS_PATH = "/platform/v1/webhooks";
const REQUEST_TIMEOUT_MS = 15_000;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getCdpApiCredentials(): { apiKeyId: string; apiKeySecret: string } | null {
  const apiKeyId = process.env.CDP_API_KEY_ID?.trim();
  const apiKeySecret = process.env.CDP_API_KEY_SECRET?.trim();

  if (!apiKeyId || !apiKeySecret) {
    logger.warn("cdp_webhook_registration_not_configured", {
      message: "CDP_API_KEY_ID or CDP_API_KEY_SECRET is missing",
    });
    return null;
  }

  return { apiKeyId, apiKeySecret };
}

function buildAuthHeaders(apiKeyId: string, apiKeySecret: string): Record<string, string> {
  // CDP API uses Basic auth with api-key-id:api-key-secret (base64-encoded)
  const credentials = Buffer.from(`${apiKeyId}:${apiKeySecret}`).toString("base64");
  return {
    Authorization: `Basic ${credentials}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

function mapToConfig(raw: CdpWebhookApiResponse): CdpWebhookConfig {
  return {
    id: raw.id,
    url: raw.url,
    eventTypes: raw.event_types ?? [],
    status: raw.status,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Register a new webhook endpoint with CDP.
 *
 * @param targetUrl - The HTTPS URL to receive webhook events.
 * @param eventTypes - Array of event type strings to subscribe to.
 * @returns The webhook registration ID.
 * @throws If the CDP API call fails or credentials are missing.
 */
export async function registerCdpWebhook(
  targetUrl: string,
  eventTypes: string[],
): Promise<string> {
  const creds = getCdpApiCredentials();
  if (!creds) {
    throw new Error("CDP API credentials are not configured");
  }

  const url = `${CDP_API_BASE}${WEBHOOKS_PATH}`;
  const body = JSON.stringify({
    url: targetUrl,
    event_types: eventTypes,
  });

  const response = await fetch(url, {
    method: "POST",
    headers: buildAuthHeaders(creds.apiKeyId, creds.apiKeySecret),
    body,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "unknown");
    logger.error("cdp_webhook_register_failed", {
      status: response.status,
      error: errorText,
    });
    throw new Error(`CDP webhook registration failed: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as CdpWebhookApiResponse;

  logger.info("cdp_webhook_registered", {
    webhookId: data.id,
    url: targetUrl,
    eventTypes,
  });

  return data.id;
}

/**
 * List all registered CDP webhooks.
 *
 * @returns Array of webhook configurations.
 * @throws If the CDP API call fails or credentials are missing.
 */
export async function listCdpWebhooks(): Promise<CdpWebhookConfig[]> {
  const creds = getCdpApiCredentials();
  if (!creds) {
    throw new Error("CDP API credentials are not configured");
  }

  const url = `${CDP_API_BASE}${WEBHOOKS_PATH}`;

  const response = await fetch(url, {
    method: "GET",
    headers: buildAuthHeaders(creds.apiKeyId, creds.apiKeySecret),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "unknown");
    logger.error("cdp_webhook_list_failed", {
      status: response.status,
      error: errorText,
    });
    throw new Error(`CDP webhook list failed: ${response.status} ${errorText}`);
  }

  const body = (await response.json()) as CdpWebhookListResponse;

  return (body.data ?? []).map(mapToConfig);
}

/**
 * Delete a registered CDP webhook by ID.
 *
 * @param webhookId - The webhook ID to delete.
 * @throws If the CDP API call fails or credentials are missing.
 */
export async function deleteCdpWebhook(webhookId: string): Promise<void> {
  const creds = getCdpApiCredentials();
  if (!creds) {
    throw new Error("CDP API credentials are not configured");
  }

  const url = `${CDP_API_BASE}${WEBHOOKS_PATH}/${encodeURIComponent(webhookId)}`;

  const response = await fetch(url, {
    method: "DELETE",
    headers: buildAuthHeaders(creds.apiKeyId, creds.apiKeySecret),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "unknown");
    logger.error("cdp_webhook_delete_failed", {
      webhookId,
      status: response.status,
      error: errorText,
    });
    throw new Error(`CDP webhook deletion failed: ${response.status} ${errorText}`);
  }

  logger.info("cdp_webhook_deleted", { webhookId });
}
