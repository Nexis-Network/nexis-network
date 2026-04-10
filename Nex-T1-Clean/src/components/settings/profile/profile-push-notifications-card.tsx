"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { BentoCard } from "@/components/settings/shared/bento-card";
import { Switch } from "@/components/ui/switch";
import { enablePushNotifications, disablePushNotifications, getExistingSubscription } from "@/lib/push/client";
import { useAuthContext } from "@/lib/hooks/auth/use-auth-context";

type SubscriptionRow = {
  endpoint: string;
  is_active: boolean;
  disabled_at: string | null;
  fail_count: number;
  last_seen_at: string | null;
};

export function ProfilePushNotificationsCard() {
  const { status } = useAuthContext();
  const isAuthenticated = status === "authenticated";
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [count, setCount] = useState<number>(0);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setCount(0);
      setEnabled(false);
      return;
    }
    try {
      const res = await fetch("/api/notifications/push/subscriptions", { credentials: "include" });
      if (res.status === 401) {
        setCount(0);
        setEnabled(false);
        return;
      }
      const json = (await res.json()) as { subscriptions?: SubscriptionRow[] };
      const rows = Array.isArray(json.subscriptions) ? json.subscriptions : [];
      setCount(rows.filter((r) => r.is_active).length);

      const existing = await getExistingSubscription();
      setEnabled(Boolean(existing));
    } catch {
      // ignore
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (status === "loading") return;
    void refresh();
  }, [refresh, status]);

  const statusLabel = useMemo(() => {
    if (enabled) {
      return count > 0 ? `Enabled (${count} device${count === 1 ? "" : "s"})` : "Enabled";
    }
    return "Disabled";
  }, [count, enabled]);

  const handleToggle = useCallback(async () => {
    if (!isAuthenticated) {
      toast.error("You need to sign in to manage push notifications.");
      return;
    }
    setLoading(true);
    try {
      if (!enabled) {
        const res = await enablePushNotifications();
        if (!res.subscribed) {
          toast.message("Notifications permission was not granted.");
          return;
        }
        toast.success("Push notifications enabled.");
      } else {
        await disablePushNotifications();
        toast.success("Push notifications disabled.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update push notifications.";
      toast.error(message);
    } finally {
      setLoading(false);
      await refresh();
    }
  }, [enabled, isAuthenticated, refresh]);

  return (
    <BentoCard>
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h3 className="settings-card-title">Push notifications</h3>
          <p className="settings-card-description">
            {statusLabel}. Wallet approvals and executions will alert instantly.
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={() => void handleToggle()} disabled={loading || !isAuthenticated} />
      </div>
      <div className="mt-3 text-xs text-[var(--bento-text-muted)]">
        {typeof window === "undefined"
          ? null
          : !("serviceWorker" in navigator)
            ? "Service workers are not supported in this browser."
            : null}
      </div>
    </BentoCard>
  );
}
