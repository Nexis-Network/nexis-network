// Domain: notifications
// Responsibility: Notification type system for wallet push.

export type NotificationType =
  | "wallet.tx.proposed"
  | "wallet.tx.approval_requested"
  | "wallet.tx.approved"
  | "wallet.tx.executed"
  | "wallet.tx.failed"
  | "wallet.allowance.threshold"
  | "wallet.allowance.insufficient"
  | "watchlist.price_alert"
  | "watchlist.volume_alert";

export type NotificationTemplate = {
  type: NotificationType;
  title: string;
  body: string;
  url: string;
  data: Record<string, UntypedJson>;
  dedupeKey: string;
};
