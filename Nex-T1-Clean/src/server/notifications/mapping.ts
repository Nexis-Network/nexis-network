// Domain: notifications
// Responsibility: Map wallet_events to push notification templates.

import type { NotificationTemplate, NotificationType } from "@/server/notifications/types";

type WalletEventRow = {
  event_type: string;
  user_id: string;
  chain_id?: number | null;
  safe_address?: string | null;
  metadata?: Record<string, UntypedJson> | null;
  payload?: Record<string, UntypedJson> | null;
  title?: string | null;
  body?: string | null;
};

function readString(obj: Record<string, UntypedJson> | null | undefined, key: string): string | null {
  if (!obj) return null;
  const value = obj[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function preferId(event: WalletEventRow): string {
  const meta = event.metadata ?? undefined;
  const payload = event.payload ?? undefined;
  return (
    readString(meta, "safeTxHash") ??
    readString(meta, "txHash") ??
    readString(meta, "requestId") ??
    readString(payload, "safeTxHash") ??
    readString(payload, "txHash") ??
    readString(payload, "requestId") ??
    ""
  );
}

export function mapWalletEventToNotification(event: WalletEventRow): NotificationTemplate | null {
  const id = preferId(event);
  const chainId = typeof event.chain_id === "number" ? event.chain_id : null;
  const safe = typeof event.safe_address === "string" ? event.safe_address : null;

  const baseUrl = "/settings/agent-spend";

  const mk = (type: NotificationType, title: string, body: string, url: string, extra: Record<string, UntypedJson>): NotificationTemplate => ({
    type,
    title,
    body,
    url,
    data: {
      chainId,
      safeAddress: safe,
      ...extra,
    },
    dedupeKey: `${type}:${event.user_id}:${id || `${chainId ?? ""}:${safe ?? ""}:${event.event_type}`}`,
  });

  switch (event.event_type) {
    case "safe_tx_proposed": {
      const safeTxHash = readString(event.metadata ?? undefined, "safeTxHash") ?? readString(event.payload ?? undefined, "safeTxHash");
      return mk(
        "wallet.tx.proposed",
        event.title ?? "Transaction proposed",
        event.body ?? "A Safe transaction was proposed.",
        `${baseUrl}?tab=approvals`,
        { safeTxHash },
      );
    }
    case "safe_tx_approval_requested": {
      const safeTxHash =
        readString(event.metadata ?? undefined, "safeTxHash") ?? readString(event.payload ?? undefined, "safeTxHash");
      return mk(
        "wallet.tx.approval_requested",
        event.title ?? "Approval requested",
        event.body ?? "A Safe transaction requires your approval.",
        `${baseUrl}?tab=approvals`,
        { safeTxHash },
      );
    }
    case "safe_tx_approved": {
      const safeTxHash = readString(event.metadata ?? undefined, "safeTxHash") ?? readString(event.payload ?? undefined, "safeTxHash");
      return mk(
        "wallet.tx.approved",
        event.title ?? "Transaction approved",
        event.body ?? "A Safe transaction was approved.",
        `${baseUrl}?tab=approvals`,
        { safeTxHash },
      );
    }
    case "safe_tx_executed": {
      const txHash = readString(event.metadata ?? undefined, "txHash") ?? readString(event.payload ?? undefined, "txHash");
      return mk(
        "wallet.tx.executed",
        event.title ?? "Transaction executed",
        event.body ?? "A Safe transaction executed on-chain.",
        `${baseUrl}?tab=transactions`,
        { txHash },
      );
    }
    case "safe_tx_failed": {
      const reason = readString(event.metadata ?? undefined, "reason") ?? readString(event.payload ?? undefined, "reason");
      return mk(
        "wallet.tx.failed",
        event.title ?? "Transaction failed",
        event.body ?? (reason ? `Execution failed: ${reason}` : "Execution failed."),
        `${baseUrl}?tab=transactions`,
        { reason },
      );
    }
    case "allowance_transfer_executed": {
      const txHash = readString(event.metadata ?? undefined, "txHash") ?? readString(event.payload ?? undefined, "txHash");
      return mk(
        "wallet.tx.executed",
        event.title ?? "Allowance transfer executed",
        event.body ?? "An allowance transfer executed.",
        `${baseUrl}?tab=transactions`,
        { txHash, mode: "allowance" },
      );
    }
    case "allowance_insufficient": {
      const reason = readString(event.metadata ?? undefined, "reason") ?? readString(event.payload ?? undefined, "reason");
      return mk(
        "wallet.allowance.insufficient",
        event.title ?? "Allowance insufficient",
        event.body ?? "The requested transfer exceeds the configured allowance.",
        `${baseUrl}?tab=limits`,
        { reason },
      );
    }
    case "allowance_threshold": {
      return mk(
        "wallet.allowance.threshold",
        event.title ?? "Allowance threshold",
        event.body ?? "Allowance threshold reached.",
        `${baseUrl}?tab=limits`,
        {},
      );
    }
    default:
      return null;
  }
}
