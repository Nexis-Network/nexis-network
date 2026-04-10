"use client";

import { useState } from "react";
import Image from "next/image";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

import { useResolvedCdpWallets } from "@/lib/cdp/use-resolved-cdp-wallets";
import { truncateAddress } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { LIQUID_GLASS_LOGOS } from "@/components/liquid-glass-logos";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CreateWalletModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

type ProvisionResponse = {
  success: boolean;
  data?: {
    evmSmartAccountAddress: string | null;
    solanaAddress: string | null;
  };
  error?: string;
};

type WalletDisplayInfo = {
  chain: "evm" | "solana";
  label: string;
  sublabel: string;
  icon: string;
  address: string | null;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WALLET_INFO: readonly WalletDisplayInfo[] = [
  {
    chain: "evm",
    label: "Nex Wallet (EVM)",
    sublabel: "Base (Chain 8453)",
    icon: "/icons/chain-icons/base.svg",
    address: null,
  },
  {
    chain: "solana",
    label: "Nex Wallet (SOL)",
    sublabel: "Mainnet",
    icon: LIQUID_GLASS_LOGOS.solana,
    address: null,
  },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function copyToClipboard(text: string) {
  void navigator.clipboard.writeText(text).then(() => {
    toast.success("Address copied to clipboard");
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CreateWalletModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateWalletModalProps) {
  const queryClient = useQueryClient();
  const { evmAddress, solanaAddress, isInitialized } = useResolvedCdpWallets();

  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);

  const hasBothWallets = !!evmAddress && !!solanaAddress;
  const hasAnyWallet = !!evmAddress || !!solanaAddress;

  // Build wallet display data by merging static info with live addresses
  const walletRows: WalletDisplayInfo[] = WALLET_INFO.map((info) => ({
    ...info,
    address: info.chain === "evm" ? evmAddress : solanaAddress,
  }));

  const handleProvision = async () => {
    setProvisionError(null);
    setIsProvisioning(true);

    try {
      const res = await fetch("/api/wallets/cdp/provision", { method: "POST" });
      const json = (await res.json()) as ProvisionResponse;

      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Provisioning failed");
      }

      toast.success("Nex Wallets provisioned successfully");

      // Invalidate wallet-related queries so the sidebar refreshes
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["wallet-summaries"] }),
        queryClient.invalidateQueries({ queryKey: ["profile-aggregate"] }),
        queryClient.invalidateQueries({ queryKey: ["cdp-wallets"] }),
      ]);

      // Trigger a wallet summary refresh
      await fetch("/api/nex/wallets/summary?refresh=1", { method: "GET" }).catch(
        () => {},
      );

      onSuccess?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("cdp_provision_modal_failed", message);
      setProvisionError(message || "Provisioning failed. Please try again.");
      toast.error(message || "Provisioning failed");
    } finally {
      setIsProvisioning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#121212] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-zinc-400" />
            {hasBothWallets ? "Your Nex Wallets" : "Create Nex Wallets"}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Status header */}
          {hasBothWallets ? (
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-400">
                Your Nex Wallets are active and ready to use.
              </p>
              <span className="shrink-0 px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-medium rounded-full border border-emerald-500/20 backdrop-blur-md">
                Auto-provisioned
              </span>
            </div>
          ) : (
            <p className="text-sm text-zinc-400">
              Nex Wallets give you Nex Wallet (EVM) on Base and Nex Wallet (SOL). They are normally created automatically on signup.
            </p>
          )}

          {/* Wallet cards */}
          <div className="space-y-2">
            {walletRows.map((wallet) => (
              <WalletRow
                key={wallet.chain}
                wallet={wallet}
                isInitialized={isInitialized}
              />
            ))}
          </div>

          {/* Provision button (only when wallets are missing) */}
          {!hasBothWallets && (
            <div className="space-y-3 pt-1">
              {provisionError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                  <p className="text-xs text-red-300">{provisionError}</p>
                </div>
              )}

              <Button
                onClick={handleProvision}
                disabled={isProvisioning}
                className="w-full h-11 bg-white/10 border border-white/10 hover:bg-white/15 hover:border-white/20 text-white font-medium transition-all"
              >
                {isProvisioning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Provisioning Wallets...
                  </>
                ) : hasAnyWallet ? (
                  "Provision Missing Wallet"
                ) : (
                  "Provision Nex Wallets"
                )}
              </Button>

              <p className="text-center text-[11px] text-zinc-500">
                Creates Nex Wallet (EVM) and Nex Wallet (SOL) in a single step
              </p>
            </div>
          )}

          {/* Feature list when wallets exist */}
          {hasBothWallets && (
            <div className="rounded-lg border border-white/5 bg-white/[0.03] p-4 text-sm text-zinc-400">
              <ul className="list-disc pl-4 space-y-1.5">
                <li>Nex Wallet (EVM) with gas sponsorship</li>
                <li>Nex Wallet (SOL) for SPL tokens</li>
                <li>Spend permissions for AI agent trading</li>
                <li>Private key export via secure iframe</li>
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// WalletRow - individual wallet display
// ---------------------------------------------------------------------------

function WalletRow({
  wallet,
  isInitialized,
}: {
  wallet: WalletDisplayInfo;
  isInitialized: boolean;
}) {
  const hasAddress = !!wallet.address;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 transition-colors hover:bg-white/[0.05]">
      {/* Chain icon */}
      <div className="relative h-8 w-8 shrink-0 rounded-full bg-white/5 p-1">
        <Image
          src={wallet.icon}
          alt={wallet.label}
          fill
          className="object-contain p-1"
        />
      </div>

      {/* Label + address */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">{wallet.label}</span>
          <span className="text-[10px] text-zinc-500">{wallet.sublabel}</span>
        </div>

        {hasAddress ? (
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs font-mono text-zinc-400">
              {truncateAddress(wallet.address ?? "", 6, 4)}
            </span>
            <button
              type="button"
              onClick={() => copyToClipboard(wallet.address ?? "")}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
              title="Copy full address"
            >
              <Copy className="h-3 w-3" />
            </button>
            {wallet.chain === "evm" && (
              <a
                href={`https://basescan.org/address/${wallet.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
                title="View on Basescan"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {wallet.chain === "solana" && (
              <a
                href={`https://solscan.io/account/${wallet.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
                title="View on Solscan"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        ) : !isInitialized ? (
          <div className="flex items-center gap-1.5 mt-0.5">
            <Loader2 className="h-3 w-3 animate-spin text-zinc-500" />
            <span className="text-xs text-zinc-500">Loading...</span>
          </div>
        ) : (
          <span className="text-xs text-zinc-500 mt-0.5">Not provisioned</span>
        )}
      </div>

      {/* Status indicator */}
      <div className="shrink-0">
        {hasAddress ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        ) : (
          <div className="h-4 w-4 rounded-full border border-zinc-600" />
        )}
      </div>
    </div>
  );
}
