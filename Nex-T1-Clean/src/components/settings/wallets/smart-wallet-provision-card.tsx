"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, KeyRound, Shield, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/settings/shared/settings-button";
import { useAuthContext } from "@/lib/hooks/auth/use-auth-context";
import { registerWalletPasskey } from "@/lib/passkeys/client";
import { logger } from "@/lib/logger";
import { CDP_EMBEDDED_ENABLED } from "@/lib/cdp/feature-flag";

const CDP_ENABLED = CDP_EMBEDDED_ENABLED;

type SmartWalletProvisionCardProps = {
  isProvisioning?: boolean;
  /** Whether Nex Wallets already exist for this user */
  hasCdpWallets?: boolean;
};

export function SmartWalletProvisionCard({
  isProvisioning = false,
  hasCdpWallets = false,
}: SmartWalletProvisionCardProps) {
  if (CDP_ENABLED) {
    return <CdpWalletStatusCard hasCdpWallets={hasCdpWallets} />;
  }

  return <SafeProvisionCard isProvisioning={isProvisioning} />;
}

// ---------------------------------------------------------------------------
// CDP: Auto-provisioned status + manual fallback
// ---------------------------------------------------------------------------

function CdpWalletStatusCard({ hasCdpWallets }: { hasCdpWallets: boolean }) {
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  const handleManualProvision = async () => {
    if (!user?.id) {
      toast.error("You must be logged in.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/wallets/cdp/provision", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Provisioning failed");

      toast.success("Nex Wallets provisioned successfully.");

      queryClient.invalidateQueries({ queryKey: ["wallet-summaries"] });
      queryClient.invalidateQueries({ queryKey: ["profile-aggregate"] });
      await fetch("/api/nex/wallets/summary?refresh=1", { method: "GET" }).catch(() => {});
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("cdp_manual_provision_failed", message);
      toast.error(message || "Provisioning failed");
    } finally {
      setLoading(false);
    }
  };

  if (hasCdpWallets) {
    return (
      <div className="space-y-4 rounded-xl border border-[var(--bento-border)] bg-[var(--bento-card)] p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="flex items-center gap-2 text-lg font-medium text-[var(--bento-text-primary)]">
              <CheckCircle2 className="h-5 w-5 text-[var(--bento-text-primary)]" />
              Nex Wallets Active
            </h2>
            <p className="text-sm text-[var(--bento-text-muted)]">
              Your Nex Wallets are ready to use: Nex Wallet (EVM) and Nex Wallet (SOL).
            </p>
          </div>
          <div className="rounded-full border border-[var(--bento-border)] bg-[var(--settings-elevated)] px-2 py-1 text-xs font-medium text-[var(--bento-text-primary)]">
            Auto-provisioned
          </div>
        </div>

        <div className="rounded-lg border border-[var(--bento-border)] bg-[var(--settings-elevated)] p-4 text-sm text-[var(--bento-text-muted)]">
          <ul className="list-disc pl-4 space-y-1">
            <li>Nex Wallet (EVM) with gas sponsorship</li>
            <li>Nex Wallet (SOL) for SPL tokens</li>
            <li>Spend permissions for AI agent trading</li>
            <li>Private key export via secure iframe</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-[var(--bento-border)] bg-[var(--bento-card)] p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-lg font-medium text-[var(--bento-text-primary)]">
            <Shield className="h-5 w-5 text-[var(--bento-text-muted)]" />
            Nex Wallets
          </h2>
          <p className="text-sm text-[var(--bento-text-muted)]">
            Nex Wallets are automatically created when you sign up. If
            they&apos;re missing, you can provision them manually.
          </p>
        </div>
        <div className="rounded-full border border-[var(--bento-border)] bg-[var(--settings-elevated)] px-2 py-1 text-xs font-medium text-[var(--bento-text-primary)]">
          Non-custodial
        </div>
      </div>

      <Button
        onClick={handleManualProvision}
        disabled={loading}
        size="lg"
        className="settings-primary-button w-full sm:w-auto"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Provisioning...
          </>
        ) : (
          "Provision Nex Wallets"
        )}
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Legacy: Safe smart wallet provisioning (when CDP is disabled)
// ---------------------------------------------------------------------------

function SafeProvisionCard({ isProvisioning }: { isProvisioning: boolean }) {
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuthContext();
  const userId = user?.id ?? null;

  const onProvision = async () => {
    if (!userId) {
      toast.error("You must be logged in to provision a wallet.");
      return;
    }

    try {
      setLoading(true);
      await registerWalletPasskey({ email: user?.email ?? undefined });
      toast.success(
        "Passkey registered. Smart wallet will activate on your first transaction.",
      );

      queryClient.invalidateQueries({ queryKey: ["nex-wallet-state"] });
      queryClient.invalidateQueries({ queryKey: ["nex-smart-account"] });
      queryClient.invalidateQueries({ queryKey: ["profile-aggregate"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-summaries"] });
      await fetch("/api/nex/wallets/summary?refresh=1", { method: "GET" }).catch(() => {});
    } catch (error: UntypedJson) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("Provisioning failed:", message);
      toast.error(message || "Provisioning failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-[var(--bento-border)] bg-[var(--bento-card)] p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-lg font-medium text-[var(--bento-text-primary)]">
            <KeyRound className="h-5 w-5 text-[var(--bento-text-muted)]" />
            Create Smart Account
          </h2>
          <p className="text-sm text-[var(--bento-text-muted)]">
            Create a Safe smart account secured by your device&apos;s Passkey
            (activates on first transaction).
          </p>
        </div>
        <div className="rounded-full border border-[var(--bento-border)] bg-[var(--settings-elevated)] px-2 py-1 text-xs font-medium text-[var(--bento-text-primary)]">
          Non-custodial
        </div>
      </div>

      <div className="rounded-lg border border-[var(--bento-border)] bg-[var(--settings-elevated)] p-4 text-sm text-[var(--bento-text-muted)]">
        <ul className="list-disc pl-4 space-y-1">
          <li>Gas-optimized Safe v1.4.1 Account</li>
          <li>Secured by FaceID / TouchID (Passkeys)</li>
          <li>Enable Automation & Recovery features</li>
        </ul>
      </div>

      <div className="flex flex-col gap-2">
        <Button
          onClick={onProvision}
          disabled={loading || isProvisioning}
          size="lg"
          className="settings-primary-button w-full sm:w-auto"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Passkey & Safe...
            </>
          ) : isProvisioning ? (
            "Provisioning in progress"
          ) : (
            "Create Smart Wallet"
          )}
        </Button>
      </div>
    </div>
  );
}
