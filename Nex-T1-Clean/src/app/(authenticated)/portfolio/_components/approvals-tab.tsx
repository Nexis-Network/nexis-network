"use client";

import { WalletPortfolio } from "@/lib/user/profile";
import { asJsonObject, getJsonNumber, getJsonString } from "@/lib/json";
import { formatBigInt, shortenAddress } from "@/lib/utils";
import { Copy, ExternalLink, ShieldAlert, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useMemo } from "react";
import useSWR from "swr";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { unwrapApiPayload } from "@/lib/api-platform";
import { isNonZeroEVMAddress } from "@/lib/utils/token-utils";
import { portfolioChainMatchesFilter } from "@/lib/portfolio/chain-filter";
import { resolveWalletRequestChainId } from "@/lib/portfolio/wallet-metadata";

interface ApprovalsTabProps {
  wallets: WalletPortfolio[];
  chainId?: string;
}

type ApprovalItem = {
  transactionHash: string;
  value: string;
  tokenLogo: string | null;
  tokenName: string;
  tokenSymbol: string;
  spenderAddress: string;
  walletAddress: string;
  walletName: string | null;
  tokenDecimals: number;
};

function parseApprovalItem(
  value: unknown,
  walletAddress: string,
  walletName: string | null | undefined,
): ApprovalItem | null {
  const record = asJsonObject(value);
  if (!record) {
    return null;
  }

  const approvalValue = getJsonString(record, "value");
  const spenderAddress = getJsonString(record, "spender_address");
  if (!approvalValue || !spenderAddress) {
    return null;
  }

  return {
    transactionHash: getJsonString(record, "transaction_hash") ?? `${walletAddress}-${spenderAddress}`,
    value: approvalValue,
    tokenLogo: getJsonString(record, "token_logo"),
    tokenName: getJsonString(record, "token_name") ?? "Unknown token",
    tokenSymbol: getJsonString(record, "token_symbol") ?? "",
    spenderAddress,
    walletAddress,
    walletName: walletName ?? null,
    tokenDecimals: getJsonNumber(record, "token_decimals") ?? 18,
  };
}

function isHighRiskApproval(value: string): boolean {
  return value.length > 30;
}

function formatApprovalAmount(approval: ApprovalItem): string {
  if (isHighRiskApproval(approval.value)) {
    return "Unlimited";
  }

  try {
    return formatBigInt(BigInt(approval.value), approval.tokenDecimals);
  } catch {
    return "Unknown";
  }
}

function useAggregatedApprovals(wallets: WalletPortfolio[], chainId?: string) {
  const targetWallets = useMemo(() => {
    return wallets.filter((wallet) => {
      const resolvedChain = resolveWalletRequestChainId(wallet);
      if (resolvedChain === null || resolvedChain === "solana") {
        return false;
      }

      if (chainId && chainId !== "all" && !portfolioChainMatchesFilter(resolvedChain, chainId)) {
        return false;
      }

      return isNonZeroEVMAddress(wallet.address ?? "");
    });
  }, [wallets, chainId]);

  const limitedWallets = targetWallets.slice(0, 5);

  const { data, isLoading } = useSWR<ApprovalItem[]>(
    ["aggregated-approvals", ...limitedWallets.map((wallet) => wallet.address ?? "")],
    async () => {
      const results = await Promise.all(
        limitedWallets.map(async (wallet) => {
          if (!wallet.address) {
            return [];
          }

          const chainIdForRequest = resolveWalletRequestChainId(wallet);
          if (chainIdForRequest === null || chainIdForRequest === "solana") {
            return [];
          }

          try {
            const response = await fetch(
              `/api/portfolio/approvals?address=${wallet.address}&chainId=${chainIdForRequest}`,
            );
            if (!response.ok) {
              return [];
            }

            const json = (await response.json().catch(() => null)) as unknown;
            const payload = unwrapApiPayload<{ result?: unknown[] }>(json);
            const result = Array.isArray(payload?.result) ? payload.result : [];
            return result
              .map((item) => parseApprovalItem(item, wallet.address ?? "", wallet.providerName))
              .filter((item): item is ApprovalItem => item !== null);
          } catch {
            return [];
          }
        }),
      );

      return results.flat();
    },
    { refreshInterval: 60000 },
  );

  return { approvals: data ?? [], isLoading };
}

export function ApprovalsTab({ wallets, chainId }: ApprovalsTabProps) {
  const { approvals, isLoading } = useAggregatedApprovals(wallets, chainId);
  const hasApprovals = approvals.length > 0;

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
  };

  return (
    <div className="flex flex-col w-full">
      <div className="flex flex-col mb-4">
        <h3 className="text-base font-medium text-foreground">Approvals</h3>
        <span className="text-xs text-muted-foreground">
            {isLoading ? "Scanning..." : `${approvals.length} active approvals found`}
        </span>
      </div>

      <div className="w-full">
        {/* Header */}
        <div className="grid grid-cols-12 gap-4 border-b border-border/60 px-4 py-3 text-xs font-normal uppercase tracking-wide text-muted-foreground">
          <div className="col-span-4">Asset</div>
          <div className="col-span-3">Spender</div>
          <div className="col-span-2 text-right">Amount</div>
          <div className="col-span-3 text-right">Risk / Wallet</div>
        </div>

        {/* Rows */}
        <div className="flex flex-col">
          {isLoading && !hasApprovals ? (
             <div className="py-12 flex justify-center">
                 <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
             </div>
          ) : !hasApprovals ? (
             <div className="py-8 text-center text-sm text-muted-foreground">
               No active approvals found.
             </div>
          ) : (
            approvals.map((approval, idx) => {
              const isHighRisk = isHighRiskApproval(approval.value);
              return (
                <div 
                  key={`${approval.transactionHash}-${idx}`} 
                  className="group grid grid-cols-12 gap-4 rounded-lg border-b border-transparent px-4 py-4 items-center transition-colors hover:border-border/60 hover:bg-accent/30"
                >
                  {/* Asset */}
                  <div className="col-span-4 flex items-center gap-3 overflow-hidden">
                     <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-transparent p-1">
                        {approval.tokenLogo ? (
                            <div className="relative w-full h-full">
                            <Image 
                              src={approval.tokenLogo} 
                              alt={approval.tokenName} 
                              width={32}
                              height={32}
                              className="w-full h-full object-contain rounded-full" 
                              style={{ width: "auto", height: "auto" }}
                              unoptimized
                            />
                           </div>
                        ) : (
                            <div className="h-full w-full rounded-full bg-primary/15" />
                        )}
                     </div>
                     <div className="flex flex-col truncate">
                        <span className="truncate text-sm font-medium text-foreground" title={approval.tokenName}>{approval.tokenName}</span>
                        <span className="text-xs text-muted-foreground">{approval.tokenSymbol}</span>
                     </div>
                  </div>

                  {/* Spender */}
                  <div className="col-span-3 flex items-center gap-2">
                     <span className="font-mono text-sm text-muted-foreground">{shortenAddress(approval.spenderAddress)}</span>
                     <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100" onClick={() => copyToClipboard(approval.spenderAddress)}>
                        <Copy className="h-3 w-3" />
                     </Button>
                     <a href={`https://etherscan.io/address/${approval.spenderAddress}`} target="_blank" rel="noreferrer" className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary">
                        <ExternalLink className="h-3 w-3" />
                     </a>
                  </div>

                  {/* Amount */}
                  <div className="col-span-2 text-right">
                     <span className="text-sm text-foreground">{formatApprovalAmount(approval)}</span>
                  </div>

                  {/* Risk / Wallet */}
                  <div className="col-span-3 text-right flex flex-col items-end gap-1">
                     {isHighRisk ? (
                         <span className="flex items-center gap-1 text-xs text-red-500 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                             <ShieldAlert className="h-3 w-3" /> High Risk
                         </span>
                     ) : (
                         <span className="flex items-center gap-1 text-xs text-green-500 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">
                             <CheckCircle className="h-3 w-3" /> Standard
                         </span>
                     )}
                     <span className="max-w-[120px] truncate text-[10px] text-muted-foreground">
                         {shortenAddress(approval.walletAddress)}
                     </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
