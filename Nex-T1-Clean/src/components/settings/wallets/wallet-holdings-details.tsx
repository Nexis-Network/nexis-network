"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";


import { Button } from "@/components/settings/shared/settings-button";
import { Skeleton } from "@/components/ui/skeleton";
import { UserPresenceAvatar } from "@/components/ui/user-presence-avatar";
import { WalletAssetRow } from "@/components/wallets/wallet-asset-row";
import { WalletMetricsBar } from "@/components/wallets/wallet-metrics-bar";
import {
  isNonZeroEVMAddress,
  isValidSolanaAddress,
  isValidStellarAddress,
} from "@/lib/utils/token-utils";

type Platform = "evm" | "solana" | "stellar" | "hyperliquid";

type TokenRow = {
  tokenAddress: string | null;
  symbol: string | null;
  name: string | null;
  valueUsd: number | null;
  balanceFormatted?: string | null;
  balance?: string | null;
  logoUrl?: string | null;
  change24hPercent?: number | null;
};

type NftRow = {
  name: string | null;
  imageUrl?: string | null;
  tokenId?: string | null;
  raw?: Record<string, UntypedJson> | null;
};

type Props = {
  address: string | null;
  platform: Platform;
  chainId?: number | null;
};

export function WalletHoldingsDetails({ address, platform, chainId }: Props) {
  const [visibleTokens, setVisibleTokens] = useState(25);
  const [nftCursor, setNftCursor] = useState<string | null>(null);
  const [nftItems, setNftItems] = useState<NftRow[]>([]);

  const isValidAddress = useMemo(() => {
    if (!address) return false;
    if (platform === "solana") return isValidSolanaAddress(address);
    if (platform === "stellar") return isValidStellarAddress(address);
    if (platform === "hyperliquid") return true;
    return isNonZeroEVMAddress(address);
  }, [address, platform]);

  useEffect(() => {
    setVisibleTokens(25);
    setNftCursor(null);
    setNftItems([]);
  }, [address, platform, chainId]);

  type TokensQueryData = { assets?: Record<string, UntypedJson>[]; raw?: Record<string, UntypedJson> };
  const tokensQuery = useQuery<TokensQueryData>({
    queryKey: ["wallet-detail-tokens", address, platform, chainId],
    enabled: isValidAddress && platform !== "hyperliquid" && platform !== "stellar",
    queryFn: async () => {
      if (!address || !isValidAddress) return {};
      if (platform === "solana") {
        const params = new URLSearchParams({ address, network: "mainnet" });
        const response = await fetch(`/api/tools/wallet/sol/portfolio?${params.toString()}`, {
          credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to load Solana portfolio");
        const json = (await response.json()) as { success?: boolean; data?: TokensQueryData };
        return (json?.data && typeof json.data === "object" ? json.data : {}) as TokensQueryData;
      }
      const evmChain = chainId ? `0x${chainId.toString(16)}` : "0x1";
      const params = new URLSearchParams({ address, chain: evmChain });
      const response = await fetch(`/api/tools/wallet/evm/balances?${params.toString()}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to load EVM balances");
      const json = (await response.json()) as { success?: boolean; data?: TokensQueryData };
      return (json?.data && typeof json.data === "object" ? json.data : {}) as TokensQueryData;
    },
  });

  type NftsQueryData = { nfts?: Record<string, UntypedJson>[]; cursor?: string | null; raw?: Record<string, UntypedJson> };
  const nftsQuery = useQuery<NftsQueryData>({
    queryKey: ["wallet-detail-nfts", address, platform, chainId, nftCursor],
    enabled: isValidAddress && platform !== "hyperliquid" && platform !== "stellar",
    queryFn: async () => {
      if (!address || !isValidAddress) return {};
      if (platform === "solana") {
        const params = new URLSearchParams({
          address,
          network: "mainnet",
          limit: "25",
          ...(nftCursor ? { cursor: nftCursor } : {}),
        });
        const response = await fetch(`/api/tools/wallet/sol/nfts?${params.toString()}`, { credentials: "include" });
        if (!response.ok) throw new Error("Failed to load Solana NFTs");
        const json = (await response.json()) as { success?: boolean; data?: NftsQueryData };
        return (json?.data && typeof json.data === "object" ? json.data : {}) as NftsQueryData;
      }
      const evmChain = chainId ? `0x${chainId.toString(16)}` : "0x1";
      const params = new URLSearchParams({
        address,
        chain: evmChain,
        limit: "25",
        ...(nftCursor ? { cursor: nftCursor } : {}),
      });
      const response = await fetch(`/api/tools/wallet/evm/nfts?${params.toString()}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to load EVM NFTs");
      const json = (await response.json()) as { success?: boolean; data?: NftsQueryData };
      return (json?.data && typeof json.data === "object" ? json.data : {}) as NftsQueryData;
    },
  });

  useEffect(() => {
    const page = nftsQuery.data?.nfts;
    if (!Array.isArray(page)) return;

    const mapped: NftRow[] = page.map((n) => {
      const meta = (n.metadata && typeof n.metadata === "object" ? n.metadata : null) as Record<string, UntypedJson> | null;
      return {
        name: (typeof n.name === "string" ? n.name : typeof meta?.name === "string" ? meta.name : null),
        imageUrl: (typeof n.imageUrl === "string" ? n.imageUrl : typeof n.image === "string" ? n.image : typeof meta?.image === "string" ? meta.image : null),
        tokenId: (typeof n.tokenId === "string" ? n.tokenId : null),
        raw: (n.raw && typeof n.raw === "object" ? n.raw as Record<string, UntypedJson> : (n && typeof n === "object" ? (n as Record<string, UntypedJson>) : null)),
      };
    });

    setNftItems((prev) => (nftCursor ? [...prev, ...mapped] : mapped));
  }, [nftsQuery.data, nftCursor]);

  const isLoading = (tokensQuery.isLoading && !tokensQuery.data) || (nftsQuery.isLoading && nftItems.length === 0);
  const isFetching = tokensQuery.isFetching || nftsQuery.isFetching;
  const error = tokensQuery.error || nftsQuery.error;

  if (!address || !isValidAddress) {
    return <div className="text-xs text-[var(--bento-text-muted)]">Wallet address pending or invalid.</div>;
  }

  if (platform === "hyperliquid") {
    return (
      <div className="text-xs text-[var(--bento-text-muted)]">
        Hyperliquid positions are not listed yet. Spot balances will appear when supported.
      </div>
    );
  }

  if (platform === "stellar") {
    return (
      <div className="text-xs text-[var(--bento-text-muted)]">
        Stellar wallet holdings are tracked in background analytics. Manual transfers are available through the
        test transaction flow in non-production environments.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex gap-3">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-24" />
      </div>
    );
  }

  if (error) {
    return <div className="text-xs text-destructive">Failed to load holdings.</div>;
  }

  const assets = tokensQuery.data?.assets ?? [];
  const tokens: TokenRow[] = Array.isArray(assets)
    ? assets
        .map((a) => ({
          tokenAddress:
            typeof a.token_address === "string"
              ? a.token_address
              : typeof a.contract === "string"
                ? a.contract
                : null,
          symbol: typeof a.symbol === "string" ? a.symbol : null,
          name: typeof a.name === "string" ? a.name : null,
          valueUsd:
            typeof a.usd_value === "number"
              ? a.usd_value
              : typeof a.valueUsd === "number"
                ? a.valueUsd
                : a.usd_value != null
                  ? Number(a.usd_value)
                  : a.valueUsd != null
                    ? Number(a.valueUsd)
                    : null,
          change24hPercent:
            typeof a.usd_price_24hr_percent_change === "number"
              ? a.usd_price_24hr_percent_change
              : typeof a.change24hPercent === "number"
                ? a.change24hPercent
                : a.usd_price_24hr_percent_change != null
                  ? Number(a.usd_price_24hr_percent_change)
                  : null,
          balanceFormatted:
            typeof a.balance_formatted === "string"
              ? a.balance_formatted
              : typeof a.balanceFormatted === "string"
                ? a.balanceFormatted
                : null,
          balance: typeof a.balance === "string" ? a.balance : null,
          logoUrl:
            typeof a.logo === "string"
              ? a.logo
              : typeof a.logoUrl === "string"
                ? a.logoUrl
                : typeof a.thumbnail === "string"
                  ? a.thumbnail
                  : null,
        }))
        .sort((a, b) => (Number(b.valueUsd ?? 0) || 0) - (Number(a.valueUsd ?? 0) || 0))
    : [];

  const visible = tokens.slice(0, Math.max(1, visibleTokens));
  const hasMoreTokens = tokens.length > visible.length;
  const nextNftCursor = typeof nftsQuery.data?.cursor === "string" ? nftsQuery.data.cursor : null;

  return (
    <div className="space-y-4">
      <WalletMetricsBar
        address={address}
        platform={platform === "solana" ? "solana" : "evm"}
        chainId={chainId ?? null}
        network="mainnet"
      />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div>
        <div className="mb-2 text-xs font-regular text-[var(--bento-text-primary)]">Tokens</div>
        {visible.length === 0 ? (
          <div className="text-xs text-[var(--bento-text-muted)]">No tokens.</div>
        ) : (
          <ul className="space-y-2">
            {visible.map((token, index) => (
              <li key={`token-${index}`} className="text-sm">
                <WalletAssetRow
                  name={token.name || "Token"}
                  symbol={token.symbol || token.name || "Token"}
                  logoUrl={token.logoUrl || null}
                  valueUsd={token.valueUsd ?? null}
                  balanceText={token.balanceFormatted ?? token.balance ?? null}
                  change24hPercent={token.change24hPercent ?? null}
                  sparkline={
                    platform === "solana"
                      ? token.tokenAddress
                        ? token.tokenAddress === "So11111111111111111111111111111111111111112"
                          ? { chainKind: "solana", coinId: "solana", days: 1 }
                          : { chainKind: "solana", network: "mainnet", tokenAddress: token.tokenAddress, days: 1 }
                        : { chainKind: "solana", coinId: "solana", days: 1 }
                      : token.tokenAddress
                        ? {
                            chainKind: "evm",
                            chainId: typeof chainId === "number" ? chainId : undefined,
                            tokenAddress: token.tokenAddress,
                            days: 1,
                          }
                        : {
                            chainKind: "evm",
                            chainId: typeof chainId === "number" ? chainId : undefined,
                            coinId: chainId === 137 ? "matic-network" : chainId === 56 ? "binancecoin" : chainId === 43114 ? "avalanche-2" : "ethereum",
                            days: 1,
                          }
                  }
                />
              </li>
            ))}
          </ul>
        )}
        {hasMoreTokens ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-3"
            disabled={isFetching}
            onClick={() => setVisibleTokens((n) => n + 25)}
          >
            {isFetching ? "Loading…" : "Load more tokens"}
          </Button>
        ) : null}
      </div>
      <div>
        <div className="mb-2 text-xs font-regular text-[var(--bento-text-primary)]">NFTs</div>
        {nftItems.length === 0 ? (
          <div className="text-xs text-[var(--bento-text-muted)]">No NFTs.</div>
        ) : (
          <ul className="space-y-2">
            {nftItems.map((nft, index) => (
              <li key={`nft-${index}`} className="flex items-center gap-2 text-sm">
                <UserPresenceAvatar
                  icon={nft.imageUrl || null}
                  name={nft.name || "NFT"}
                  size={18}
                />
                <span className="font-medium">{nft.name || "NFT"}</span>
                {nft.tokenId ? (
                  <span className="ml-auto text-xs text-[var(--bento-text-muted)]">#{String(nft.tokenId)}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {nextNftCursor != null ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-3"
            disabled={isFetching}
            onClick={() => setNftCursor(nextNftCursor)}
          >
            {isFetching ? "Loading…" : "Load more NFTs"}
          </Button>
        ) : null}
      </div>
      </div>
    </div>
  );
}

export default WalletHoldingsDetails;
