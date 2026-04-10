"use client";

import { RefreshCw, Wallet } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  formatBalance,
  truncateAddress,
} from "@/components/settings/wallets/cdp/lib/cdp-chain-config";
import type { WalletBalanceResult } from "@/lib/hooks/cdp/use-cdp-balance";

// ---------------------------------------------------------------------------
// CdpWalletBalance — renders native balance, USD value, and token list
// ---------------------------------------------------------------------------

type CdpWalletBalanceProps = {
  balance: WalletBalanceResult | undefined;
  isLoading: boolean;
  error: Error | null;
  onRefresh: () => void;
};

export function CdpWalletBalance({
  balance,
  isLoading,
  error,
  onRefresh,
}: CdpWalletBalanceProps) {
  return (
    <div className="space-y-2">
      {isLoading && !balance ? (
        <div className="space-y-2">
          <div className="h-8 w-32 animate-pulse rounded bg-[var(--settings-elevated)]" />
          <div className="h-4 w-20 animate-pulse rounded bg-[var(--settings-elevated)]" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2">
          <p className="text-xs text-destructive">{error.message}</p>
          <button
            type="button"
            onClick={onRefresh}
            className="text-xs text-[var(--settings-accent)] transition-colors hover:text-[var(--settings-accent)]/90"
          >
            Retry
          </button>
        </div>
      ) : balance ? (
        <div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-semibold text-[var(--bento-text-primary)] tabular-nums">
              {formatBalance(balance.native.balance, balance.native.decimals)}
            </p>
            <span className="text-sm text-[var(--bento-text-muted)]">
              {balance.native.symbol}
            </span>
            <button
              type="button"
              onClick={onRefresh}
              className="ml-auto p-1 text-[var(--bento-text-muted)] hover:text-[var(--bento-text-primary)] transition-colors"
              aria-label="Refresh balance"
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", isLoading && "animate-spin")}
              />
            </button>
          </div>
          {balance.native.usdValue !== null && (
            <p className="text-xs text-[var(--bento-text-muted)]">
              ${balance.native.usdValue.toFixed(2)} USD
            </p>
          )}

          {/* Token list */}
          {balance.tokens.length > 0 && (
            <div className="mt-3 space-y-1">
              <p className="text-[10px] font-medium text-[var(--bento-text-muted)] uppercase tracking-wider">
                Tokens
              </p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {balance.tokens.map((token) => (
                  <div
                    key={token.address}
                    className="flex items-center justify-between rounded-md px-2 py-1 hover:bg-[var(--settings-elevated)]/60"
                  >
                    <span className="text-xs text-[var(--bento-text-muted)]">
                      {token.symbol ?? truncateAddress(token.address)}
                    </span>
                    <span className="text-xs text-[var(--bento-text-primary)] tabular-nums">
                      {formatBalance(token.balance, token.decimals)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-[var(--bento-text-muted)]" />
          <p className="text-sm text-[var(--bento-text-muted)]">No balance data</p>
        </div>
      )}
    </div>
  );
}
