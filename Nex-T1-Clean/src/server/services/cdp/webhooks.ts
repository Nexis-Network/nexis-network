/**
 * CDP Webhook Event Processor
 *
 * Handles incoming webhook events from Coinbase Developer Platform.
 * Routes events to type-specific handlers that update DB state and
 * create user-facing notifications in the `notifications` table.
 */
import "server-only";

import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WebhookEventType =
  | "onramp.transaction.created"
  | "onramp.transaction.updated"
  | "onramp.transaction.success"
  | "onramp.transaction.failed"
  | "evm.transaction.confirmed"
  | "evm.transaction.failed"
  | "solana.transaction.confirmed"
  | "solana.transaction.failed"
  | "wallet.created"
  | "wallet.updated";

export type CdpWebhookPayload = {
  id: string;
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
};

export type CdpNotification = {
  id: string;
  userId: string;
  type: WebhookEventType;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  read: boolean;
  createdAt: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const KNOWN_EVENT_TYPES = new Set<WebhookEventType>([
  "onramp.transaction.created",
  "onramp.transaction.updated",
  "onramp.transaction.success",
  "onramp.transaction.failed",
  "evm.transaction.confirmed",
  "evm.transaction.failed",
  "solana.transaction.confirmed",
  "solana.transaction.failed",
  "wallet.created",
  "wallet.updated",
]);

function isKnownEventType(type: string): type is WebhookEventType {
  return KNOWN_EVENT_TYPES.has(type as WebhookEventType);
}

/**
 * Attempt to resolve a Supabase user_id from a wallet address by querying
 * the `wallet_accounts` table. Returns null when the address is unknown.
 */
async function resolveUserIdFromAddress(address: string): Promise<string | null> {
  if (!address) return null;

  const supabase = getSupabaseAdminClient();
  const normalized = address.toLowerCase();

  const { data, error } = await supabase
    .from("wallet_accounts")
    .select("user_id")
    .or(`address.ilike.${normalized},safe_address.ilike.${normalized}`)
    .limit(1)
    .maybeSingle();

  if (error) {
    logger.warn("cdp_webhook_resolve_user_failed", {
      address: normalized,
      error: error.message,
    });
    return null;
  }

  return (data?.user_id as string) ?? null;
}

/**
 * Extract a wallet address from event data (best-effort).
 * CDP webhooks use various field names depending on the event type.
 */
function extractAddress(data: Record<string, unknown>): string | null {
  const candidates = [
    data.walletAddress,
    data.wallet_address,
    data.address,
    data.from,
    data.to,
    (data.wallet as Record<string, unknown> | undefined)?.address,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.length > 0) return c;
  }
  return null;
}

/**
 * Extract a human-readable amount string from event data.
 */
function extractAmount(data: Record<string, unknown>): string {
  const amount = data.amount ?? data.value;
  const asset = data.asset ?? data.currency ?? data.symbol ?? "";
  if (amount !== undefined && amount !== null) {
    return `${String(amount)} ${String(asset)}`.trim();
  }
  return "";
}

/**
 * Extract the network/chain label.
 */
function extractNetwork(data: Record<string, unknown>): string {
  return String(data.network ?? data.chain ?? data.chainId ?? "unknown");
}

// ---------------------------------------------------------------------------
// Notification persistence
// ---------------------------------------------------------------------------

/**
 * Insert a notification row into the Supabase `notifications` table.
 * Uses the existing table schema: id, user_id, source, title, body, status,
 * url, metadata, created_at.
 */
async function createNotification(params: {
  userId: string;
  type: WebhookEventType;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
}): Promise<void> {
  const supabase = getSupabaseAdminClient();

  const status = params.type.includes("failed") ? "failed" : "completed";

  const { error } = await supabase.from("notifications").insert({
    user_id: params.userId,
    source: "transaction",
    title: params.title,
    body: params.message,
    status,
    metadata: {
      ...params.metadata,
      cdp_event_type: params.type,
      read: false,
    },
  });

  if (error) {
    logger.error("cdp_webhook_create_notification_failed", {
      userId: params.userId,
      type: params.type,
      error: error.message,
    });
  }
}

// ---------------------------------------------------------------------------
// Event Handlers
// ---------------------------------------------------------------------------

async function handleTransactionConfirmed(
  eventType: WebhookEventType,
  data: Record<string, unknown>,
): Promise<void> {
  const address = extractAddress(data);
  if (!address) {
    logger.warn("cdp_webhook_tx_confirmed_no_address", { data });
    return;
  }

  const userId = await resolveUserIdFromAddress(address);
  if (!userId) {
    logger.info("cdp_webhook_tx_confirmed_unresolved_user", { address });
    return;
  }

  const amount = extractAmount(data);
  const network = extractNetwork(data);
  const txHash = String(data.transactionHash ?? data.hash ?? "");

  await createNotification({
    userId,
    type: eventType,
    title: "Transaction Confirmed",
    message: amount
      ? `Your transfer of ${amount} was confirmed on ${network}.`
      : `Your transaction was confirmed on ${network}.`,
    metadata: { ...data, txHash, network },
  });

  logger.info("cdp_webhook_tx_confirmed_processed", {
    userId,
    address,
    network,
    txHash,
  });
}

async function handleTransactionFailed(
  eventType: WebhookEventType,
  data: Record<string, unknown>,
): Promise<void> {
  const address = extractAddress(data);
  if (!address) {
    logger.warn("cdp_webhook_tx_failed_no_address", { data });
    return;
  }

  const userId = await resolveUserIdFromAddress(address);
  if (!userId) {
    logger.info("cdp_webhook_tx_failed_unresolved_user", { address });
    return;
  }

  const amount = extractAmount(data);
  const network = extractNetwork(data);
  const reason = String(data.reason ?? data.error ?? "unknown error");

  await createNotification({
    userId,
    type: eventType,
    title: "Transaction Failed",
    message: amount
      ? `Your transfer of ${amount} on ${network} failed: ${reason}.`
      : `Your transaction on ${network} failed: ${reason}.`,
    metadata: { ...data, network, reason },
  });

  logger.warn("cdp_webhook_tx_failed_processed", {
    userId,
    address,
    network,
    reason,
  });
}

async function handleOnrampSuccess(data: Record<string, unknown>): Promise<void> {
  const address = extractAddress(data);
  if (!address) {
    logger.warn("cdp_webhook_onramp_success_no_address", { data });
    return;
  }

  const userId = await resolveUserIdFromAddress(address);
  if (!userId) {
    logger.info("cdp_webhook_onramp_success_unresolved_user", { address });
    return;
  }

  const amount = extractAmount(data);

  await createNotification({
    userId,
    type: "onramp.transaction.success",
    title: "Purchase Completed",
    message: amount
      ? `Your purchase of ${amount} has been completed successfully.`
      : "Your crypto purchase has been completed successfully.",
    metadata: data,
  });

  logger.info("cdp_webhook_onramp_success_processed", { userId, address });
}

async function handleOnrampFailed(data: Record<string, unknown>): Promise<void> {
  const address = extractAddress(data);
  if (!address) {
    logger.warn("cdp_webhook_onramp_failed_no_address", { data });
    return;
  }

  const userId = await resolveUserIdFromAddress(address);
  if (!userId) {
    logger.info("cdp_webhook_onramp_failed_unresolved_user", { address });
    return;
  }

  const amount = extractAmount(data);
  const reason = String(data.reason ?? data.error ?? "unknown error");

  await createNotification({
    userId,
    type: "onramp.transaction.failed",
    title: "Purchase Failed",
    message: amount
      ? `Your purchase of ${amount} failed: ${reason}.`
      : `Your crypto purchase failed: ${reason}.`,
    metadata: { ...data, reason },
  });

  logger.warn("cdp_webhook_onramp_failed_processed", { userId, address, reason });
}

async function handleOnrampUpdate(
  eventType: WebhookEventType,
  data: Record<string, unknown>,
): Promise<void> {
  const address = extractAddress(data);
  if (!address) return;

  const userId = await resolveUserIdFromAddress(address);
  if (!userId) return;

  const amount = extractAmount(data);
  const status = String(data.status ?? "processing");

  await createNotification({
    userId,
    type: eventType,
    title: eventType === "onramp.transaction.created" ? "Purchase Initiated" : "Purchase Updated",
    message: amount
      ? `Your purchase of ${amount} is ${status}.`
      : `Your crypto purchase is ${status}.`,
    metadata: data,
  });

  logger.info("cdp_webhook_onramp_update_processed", { userId, address, eventType });
}

async function handleWalletEvent(
  eventType: WebhookEventType,
  data: Record<string, unknown>,
): Promise<void> {
  const address = extractAddress(data);
  if (!address) return;

  const userId = await resolveUserIdFromAddress(address);
  if (!userId) return;

  const label = String(data.label ?? data.name ?? "");
  const isCreated = eventType === "wallet.created";

  await createNotification({
    userId,
    type: eventType,
    title: isCreated ? "Wallet Created" : "Wallet Updated",
    message: isCreated
      ? `A new Nex Wallet${label ? ` "${label}"` : ""} has been created.`
      : `Your Nex Wallet${label ? ` "${label}"` : ""} has been updated.`,
    metadata: data,
  });

  logger.info("cdp_webhook_wallet_event_processed", { userId, address, eventType });
}

// ---------------------------------------------------------------------------
// Main Router
// ---------------------------------------------------------------------------

/**
 * Process an incoming CDP webhook event.
 * Routes to the appropriate handler based on event type.
 */
export async function processCdpWebhookEvent(event: CdpWebhookPayload): Promise<void> {
  const { type, data } = event;

  if (!isKnownEventType(type)) {
    logger.info("cdp_webhook_unknown_event_type", { type, eventId: event.id });
    return;
  }

  logger.info("cdp_webhook_processing", { type, eventId: event.id });

  switch (type) {
    case "evm.transaction.confirmed":
    case "solana.transaction.confirmed":
      await handleTransactionConfirmed(type, data);
      break;

    case "evm.transaction.failed":
    case "solana.transaction.failed":
      await handleTransactionFailed(type, data);
      break;

    case "onramp.transaction.success":
      await handleOnrampSuccess(data);
      break;

    case "onramp.transaction.failed":
      await handleOnrampFailed(data);
      break;

    case "onramp.transaction.created":
    case "onramp.transaction.updated":
      await handleOnrampUpdate(type, data);
      break;

    case "wallet.created":
    case "wallet.updated":
      await handleWalletEvent(type, data);
      break;

    default: {
      // Exhaustive check — should never reach here
      const _exhaustive: never = type;
      logger.warn("cdp_webhook_unhandled_type", { type: _exhaustive });
    }
  }
}
