"use client";

import { useEffect, useState } from "react";

import { Loader2, MailCheck, MailWarning } from "lucide-react";
import { toast } from "sonner";

import { useAuthenticate } from "@/components/auth/session-guards";
import { useSupabaseAuth } from "@/components/providers/supabase-auth-provider";
import { SettingsPanel } from "@/components/settings-v2/primitives/panel";
import { Button } from "@/components/settings/shared/settings-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import type { Identity } from "@/lib/user/profile";

type ProfileContactCardProps = {
  identity?: Identity;
  isLoading: boolean;
};

export function ProfileContactCard({
  identity,
  isLoading,
}: ProfileContactCardProps) {
  const { user, error, isPending } = useAuthenticate();
  const { supabase } = useSupabaseAuth();
  const [localEmail, setLocalEmail] = useState(identity?.email ?? "");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setLocalEmail(identity?.email ?? user?.email ?? "");
  }, [identity?.email, user?.email]);

  if (isLoading || isPending) {
    return (
      <SettingsPanel
        title="Contact email"
        description="Update the address used for sign-in and notifications."
        className="h-full"
      >
        <div className="space-y-3">
          <Skeleton className="h-4 w-40 bg-white/5" />
          <Skeleton className="h-10 w-full bg-white/5" />
          <Skeleton className="h-10 w-36 bg-white/5" />
        </div>
      </SettingsPanel>
    );
  }

  if (error) {
    return (
      <SettingsPanel
        title="Contact email"
        description="Update the address used for sign-in and notifications."
        className="h-full"
      >
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error.message ??
            "Unable to load profile information. Please try again."}
        </div>
      </SettingsPanel>
    );
  }

  if (!supabase) {
    return (
      <SettingsPanel
        title="Contact email"
        description="Update the address used for sign-in and notifications."
        className="h-full"
      >
        <div className="rounded-lg border border-[var(--settings-border)] px-3 py-2 text-sm text-[var(--settings-foreground-muted)]">
          Supabase is not configured for this deployment.
        </div>
      </SettingsPanel>
    );
  }

  const currentEmail = user?.email ?? identity?.email ?? "";
  const isVerified = Boolean(identity?.emailVerified);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const desiredEmail = String(formData.get("email") ?? "").trim();

    if (!desiredEmail) {
      toast.error("Please provide an email address.");
      return;
    }

    if (desiredEmail === currentEmail) {
      toast.info("This email is already associated with your account.");
      return;
    }

    setPending(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        email: desiredEmail,
      });

      if (updateError) {
        throw updateError;
      }

      toast.success("Verification email sent. Please confirm the change.");
      setLocalEmail(desiredEmail);
    } catch (updateError) {
      const message =
        updateError instanceof Error
          ? updateError.message
          : "Failed to update email address.";
      toast.error(message);
    } finally {
      setPending(false);
    }
  }

  async function handleResendVerification() {
    if (!currentEmail) {
      toast.error("No email found to verify.");
      return;
    }

    try {
      setPending(true);

      const { error: resendError } = await supabase.auth.resend({
        type: "email_change",
        email: currentEmail,
      });

      if (resendError) {
        throw resendError;
      }

      toast.success("Verification email sent.");
    } catch (resendError) {
      const message =
        resendError instanceof Error
          ? resendError.message
          : "Failed to send verification email.";
      toast.error(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <SettingsPanel
      title="Contact email"
      description="Update the address used for sign-in and notifications."
      className="h-full"
      action={
        <div className="flex items-center gap-2 text-sm text-[var(--settings-foreground-muted)]">
          {isVerified ? (
            <MailCheck className="h-4 w-4" />
          ) : (
            <MailWarning className="h-4 w-4" />
          )}
          <span>{isVerified ? "Verified" : "Verification required"}</span>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-[var(--settings-border)] px-3 py-3">
          <p className="text-sm text-[var(--settings-foreground-muted)]">
            Current email
          </p>
          <p className="mt-1 text-sm font-medium text-[var(--settings-foreground-strong)]">
            {currentEmail || "not available"}
          </p>
        </div>

        {!isVerified ? (
          <div className="rounded-lg border border-[var(--settings-border)] px-3 py-3 text-sm text-[var(--settings-foreground-muted)]">
            Confirm the latest verification email before using this address for
            sign-in and alerts.
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="email">New email address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={localEmail}
              placeholder="you@example.com"
              disabled={pending}
              required
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Send verification
            </Button>

            {!isVerified ? (
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => void handleResendVerification()}
              >
                Resend existing verification
              </Button>
            ) : null}
          </div>
        </form>
      </div>
    </SettingsPanel>
  );
}
