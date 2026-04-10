"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Wallet } from "lucide-react";

import { Button } from "@/components/settings/shared/settings-button";
import { logger } from "@/lib/logger";
import type { ApiResponse } from "@/lib/api-platform";
import { CDP_EMBEDDED_ENABLED } from "@/lib/cdp/feature-flag";

type ChainType = "solana" | "stellar";

const IS_ENABLED =
  (process.env.NEXT_PUBLIC_ENABLE_CROSSMINT_WALLETS ?? "").trim().toLowerCase() === "true";

/** When CDP is active, Solana is handled by CDP — only show Stellar provisioning here. */
const CDP_HANDLES_SOLANA = CDP_EMBEDDED_ENABLED;

async function provision(chainType: ChainType) {
  const res = await fetch("/api/wallets/crossmint/provision", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chainType }),
  });

  type ProvisionResponse = ApiResponse<{
    walletId: string;
    chainType: ChainType;
    address: string;
    provider: string;
    custody: string;
    signerType: string;
  }>;

  const json = (await res.json().catch(() => null)) as ProvisionResponse | null;

  if (!res.ok || !json?.success || !json.data) {
    const message =
      typeof (json as UntypedJson)?.error?.message === "string"
        ? String((json as UntypedJson).error.message)
        : "Failed to provision Crossmint wallet";
    throw new Error(message);
  }

  return {
    address: typeof json.data.address === "string" ? json.data.address : null,
    chainType: typeof json.data.chainType === "string" ? json.data.chainType : chainType,
  };
}

export function CrossmintWalletProvisionCard() {
  const [loading, setLoading] = useState<ChainType | null>(null);
  const queryClient = useQueryClient();

  if (!IS_ENABLED) {
    return null;
  }

  const onProvision = async (chainType: ChainType) => {
    try {
      setLoading(chainType);
      const result = await provision(chainType);
      const label = result.chainType === "stellar" ? "Stellar" : "Solana";
      toast.success(`${label} wallet ready${result.address ? `: ${result.address.slice(0, 6)}...` : ""}`);

      // Invalidate queries to ensure UI updates
      queryClient.invalidateQueries({ queryKey: ["profile-aggregate"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-summaries"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-holdings"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-history"] });
      await fetch("/api/nex/wallets/summary?refresh=1", { method: "GET" }).catch(() => {});
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("crossmint_wallet_provision_failed", { message });
      toast.error(message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-[var(--bento-border)] bg-[var(--bento-card)] p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-lg font-medium text-[var(--bento-text-primary)]">
            <Wallet className="h-5 w-5 text-[var(--bento-text-muted)]" />
            {CDP_HANDLES_SOLANA ? "Create Stellar Wallet" : "Create Solana and Stellar Wallets"}
          </h2>
          <p className="text-sm text-[var(--bento-text-muted)]">
            {CDP_HANDLES_SOLANA
              ? "Provision a Crossmint embedded smart wallet for Stellar using an email signer (non-custodial)."
              : "Provision Crossmint embedded smart wallets for Solana and Stellar using an email signer (non-custodial)."}
          </p>
        </div>
        <div className="rounded-full border border-[var(--bento-border)] bg-[var(--settings-elevated)] px-2 py-1 text-xs font-medium text-[var(--bento-text-primary)]">
          Non-custodial
        </div>
      </div>

      <div className="rounded-lg border border-[var(--bento-border)] bg-[var(--settings-elevated)] p-4 text-sm text-[var(--bento-text-muted)]">
        <ul className="list-disc pl-4 space-y-1">
          <li>Works without browser extensions</li>
          <li>One wallet per chain per user (idempotent provisioning)</li>
          <li>Solana analytics enabled; Stellar address stored (analytics ingestion pending)</li>
        </ul>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        {!CDP_HANDLES_SOLANA && (
          <Button
            onClick={() => onProvision("solana")}
            disabled={loading !== null}
            className="settings-primary-button w-full sm:w-auto"
          >
            {loading === "solana" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Solana wallet...
              </>
            ) : (
              "Create Solana Wallet"
            )}
          </Button>
        )}
        <Button
          onClick={() => onProvision("stellar")}
          disabled={loading !== null}
          variant="outline"
          className="settings-surface-button w-full sm:w-auto"
        >
          {loading === "stellar" ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Stellar wallet...
            </>
          ) : (
            "Create Stellar Wallet"
          )}
        </Button>
      </div>
    </div>
  );
}
