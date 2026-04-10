import type { JsonObject } from "@/types/json";

export type NotificationSource =
  | "transaction"
  | "agent"
  | "system"
  | "watchlist"
  | "task"
  | "networth";

export type NotificationStatus =
  | "completed"
  | "failed"
  | "in_progress"
  | "planned"
  | "info";

export type NotificationItem = {
  id: string;
  source: NotificationSource;
  title: string;
  description?: string | null;
  timestamp: string;
  status?: NotificationStatus;
  metadata?: JsonObject;
  createdAt?: string;
  created_at?: string;
  body?: string | null;
  url?: string | null;
};

export function sortNotifications(
  notifications: NotificationItem[],
): NotificationItem[] {
  return [...notifications].sort((a, b) => {
    const aTime = new Date(a.timestamp).getTime();
    const bTime = new Date(b.timestamp).getTime();
    return bTime - aTime;
  });
}
