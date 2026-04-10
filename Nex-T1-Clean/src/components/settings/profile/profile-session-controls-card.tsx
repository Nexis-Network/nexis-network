"use client";

import { useCallback, useMemo, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, LogOut, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { useSupabaseAuth } from "@/components/providers/supabase-auth-provider";
import { SettingsPanel } from "@/components/settings-v2/primitives/panel";
import { Button } from "@/components/settings/shared/settings-button";
import type { Identity } from "@/lib/user/profile";
import { logger } from "@/lib/logger";

type ProfileSessionControlsCardProps = {
  identity?: Identity;
  isLoading?: boolean;
};

type PendingAction = "sign_out" | "sign_out_all" | null;

export function ProfileSessionControlsCard({
  identity,
  isLoading,
}: ProfileSessionControlsCardProps) {
  const router = useRouter();
  const { supabase } = useSupabaseAuth();
  const [pending, setPending] = useState<PendingAction>(null);

  const signedInAsLabel = useMemo(() => {
    const username = identity?.username?.trim();

    if (username) {
      return `@${username}`;
    }

    const displayName = identity?.displayName?.trim();

    if (displayName) {
      return displayName;
    }

    const email = identity?.email?.trim();
    return email || "your account";
  }, [identity?.displayName, identity?.email, identity?.username]);

  const stageServerSignOut = useCallback(async () => {
    try {
      await fetch("/api/auth/signout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        logger.warn("account_details_server_signout_failed", error);
      }
    }
  }, []);

  const redirectToLogin = useCallback(() => {
    if (typeof window !== "undefined") {
      window.location.assign("/auth/login");
      return;
    }

    router.replace("/auth/login");
  }, [router]);

  const handleSignOut = useCallback(async () => {
    if (pending) {
      return;
    }

    setPending("sign_out");

    try {
      await stageServerSignOut();

      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to sign out",
      );
      setPending(null);
      return;
    }

    redirectToLogin();
  }, [pending, redirectToLogin, stageServerSignOut, supabase]);

  const handleSignOutAllSessions = useCallback(async () => {
    if (pending) {
      return;
    }

    setPending("sign_out_all");

    try {
      const revokeRes = await fetch("/api/auth/sessions", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "revoke_all",
          reason: "user_requested",
        }),
      });

      if (!revokeRes.ok) {
        const payload = await revokeRes.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to revoke sessions");
      }

      await stageServerSignOut();

      if (supabase) {
        await supabase.auth.signOut({ scope: "global" });
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to sign out everywhere",
      );
      setPending(null);
      return;
    }

    toast.success("Signed out on all devices");
    redirectToLogin();
  }, [pending, redirectToLogin, stageServerSignOut, supabase]);

  const isBusy = Boolean(pending) || Boolean(isLoading);

  return (
    <SettingsPanel
      title="Session controls"
      description="Manage your current sign-in and revoke sessions across devices."
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-[var(--settings-border)] px-3 py-3">
          <p className="text-sm text-[var(--settings-foreground-muted)]">
            Signed in as
          </p>
          <p className="mt-1 text-sm font-medium text-[var(--settings-foreground-strong)]">
            {signedInAsLabel}
          </p>
        </div>

        <div className="grid gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isBusy}
            onClick={() => void handleSignOut()}
          >
            {pending === "sign_out" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="mr-2 h-4 w-4" />
            )}
            Sign out
          </Button>

          <Button
            type="button"
            variant="destructive"
            disabled={isBusy}
            onClick={() => void handleSignOutAllSessions()}
          >
            {pending === "sign_out_all" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ShieldAlert className="mr-2 h-4 w-4" />
            )}
            Sign out on all devices
          </Button>
        </div>

        <p className="text-sm text-[var(--settings-foreground-muted)]">
          Need help?{" "}
          <Link
            href="/settings/assistant"
            className="text-[var(--settings-foreground-strong)] underline-offset-4 hover:underline"
          >
            Contact support
          </Link>
        </p>
      </div>
    </SettingsPanel>
  );
}
