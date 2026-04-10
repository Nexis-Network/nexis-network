"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/settings/shared/settings-button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { BentoCard } from "@/components/settings/shared/bento-card";
import { enablePushNotifications, disablePushNotifications } from "@/lib/push/client";

type Props = {
  enabledByDefault?: boolean;
};

export function PushNotificationsPanel({ enabledByDefault }: Props) {
  const [busy, setBusy] = useState(false);
  const [enabled, setEnabled] = useState(Boolean(enabledByDefault));
  const [error, setError] = useState<string | null>(null);

  const label = useMemo(() => (enabled ? "Enabled" : "Disabled"), [enabled]);

  useEffect(() => {
    setEnabled(Boolean(enabledByDefault));
  }, [enabledByDefault]);

  return (
    <BentoCard>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="text-sm font-medium text-[var(--bento-text-primary)]">Push notifications</div>
          <div className="text-xs text-[var(--bento-text-muted)]">
            Get notified when approvals are requested, transactions execute, or allowances are insufficient.
          </div>
          {error ? <div className="text-xs text-destructive">{error}</div> : null}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
            {label}
          </Badge>
          <Switch
            checked={enabled}
            disabled={busy}
            onCheckedChange={async (next) => {
              setBusy(true);
              setError(null);
              try {
                if (next) {
                  const res = await enablePushNotifications();
                  if (!res.subscribed) throw new Error("push_enable_failed");
                } else {
                  const res = await disablePushNotifications();
                  if (!res.unsubscribed) throw new Error("push_disable_failed");
                }
                setEnabled(next);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Failed to update push settings");
              } finally {
                setBusy(false);
              }
            }}
          />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end">
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              // Re-run toggle behavior by flipping off/on to refresh subscription state.
              if (enabled) {
                const res = await disablePushNotifications();
                if (!res.unsubscribed) throw new Error("push_disable_failed");
                const res2 = await enablePushNotifications();
                if (!res2.subscribed) throw new Error("push_enable_failed");
              } else {
                const res = await enablePushNotifications();
                if (!res.subscribed) throw new Error("push_enable_failed");
                setEnabled(true);
              }
            } catch (e) {
              setError(e instanceof Error ? e.message : "Failed to refresh push subscription");
            } finally {
              setBusy(false);
            }
          }}
        >
          Refresh subscription
        </Button>
      </div>
    </BentoCard>
  );
}
