"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Loader2, ImageOff } from "lucide-react";
import Image from "next/image";
import { WalletPortfolio } from "@/lib/user/profile";
import useSWR from "swr";
import { isNonZeroEVMAddress, isValidSolanaAddress } from "@/lib/utils/token-utils";
import { unwrapApiPayload } from "@/lib/api-platform";
import { asJsonObject, getJsonString } from "@/lib/json";
import { portfolioChainMatchesFilter } from "@/lib/portfolio/chain-filter";
import { resolveWalletRequestChainId } from "@/lib/portfolio/wallet-metadata";

interface NFTsTabProps {
  chainId?: string;
  wallets?: WalletPortfolio[];
}

type NFTItem = {
  token_address?: string;
  name?: string;
  symbol?: string;
  image_url?: string | null;
  imageUrl?: string | null;
  metadata?: string | null;
  normalized_metadata?: {
    image?: string | null;
  } | null;
  media?: {
    original_media_url?: string | null;
  } | null;
};

type WalletBatchItem = {
  ok?: boolean;
  data?: {
    nfts?: NFTItem[];
  };
};

/** Extract the best available image URL from an NFT item */
function resolveNftImageUrl(nft: NFTItem): string | null {
  // Priority: normalized_metadata.image > media.original_media_url > raw metadata parse
  const candidates = [
    nft.normalized_metadata?.image,
    nft.media?.original_media_url,
    nft.image_url,
    nft.imageUrl,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.length > 0) {
      // Skip IPFS hashes without gateway URL
      if (candidate.startsWith("ipfs://")) {
        return candidate.replace("ipfs://", "https://ipfs.io/ipfs/");
      }
      if (candidate.startsWith("http")) {
        return candidate;
      }
    }
  }

  // Try parsing raw metadata string
  if (typeof nft.metadata === "string" && nft.metadata.startsWith("{")) {
    try {
      const parsed = asJsonObject(JSON.parse(nft.metadata));
      const image = getJsonString(parsed, "image");
      if (image) {
        if (image.startsWith("ipfs://")) {
          return image.replace("ipfs://", "https://ipfs.io/ipfs/");
        }
        return image;
      }
    } catch {
      // Ignore parse errors
    }
  }

  return null;
}

function NftImageCell({ nft }: { nft: NFTItem }) {
  const imageUrl = resolveNftImageUrl(nft);
  const [failed, setFailed] = useState(false);

  if (!imageUrl || failed) {
    return (
      <div className="w-10 h-10 rounded-lg bg-foreground/5 dark:bg-white/5 flex items-center justify-center text-xs text-muted-foreground border border-foreground/5 dark:border-white/5">
        <ImageOff className="w-4 h-4 text-foreground/20 dark:text-white/20" />
      </div>
    );
  }

  return (
    <div className="w-10 h-10 rounded-lg bg-foreground/5 dark:bg-white/5 overflow-hidden border border-foreground/5 dark:border-white/5 relative">
      <Image
        src={imageUrl}
        alt={typeof nft.name === "string" ? nft.name : "NFT"}
        width={40}
        height={40}
        className="w-full h-full object-cover"
        unoptimized
        onError={() => setFailed(true)}
      />
    </div>
  );
}

// Aggregation Hook for NFTs
function useAggregatedNFTs(wallets: WalletPortfolio[] = [], chainId?: string) {
  const targetWallets = useMemo(() => {
    return wallets.filter((wallet) => {
      const resolvedChain = resolveWalletRequestChainId(wallet);
      if (resolvedChain === null) {
        return false;
      }

      if (chainId && chainId !== "all" && !portfolioChainMatchesFilter(resolvedChain, chainId)) {
        return false;
      }

      const address = wallet.address ?? "";
      if (resolvedChain === "solana") {
        return isValidSolanaAddress(address);
      }
      return isNonZeroEVMAddress(address);
    });
  }, [wallets, chainId]);

  const limitedWallets = targetWallets.slice(0, 5);

  const walletInputs = useMemo(
    () =>
      limitedWallets
        .map((w) => {
          const resolvedChainId = resolveWalletRequestChainId(w);
          const address = w.address ?? "";
          if (resolvedChainId === null) return null;
          const chainKey = String(resolvedChainId);
          if (chainKey === "solana" || chainKey === "101") {
            if (!isValidSolanaAddress(address)) return null;
          } else if (!isNonZeroEVMAddress(address)) {
            return null;
          }
          return { address, chainId: resolvedChainId };
        })
        .filter((item): item is { address: string; chainId: number | "solana" } => item !== null),
    [limitedWallets],
  );

  const { data, isLoading } = useSWR<NFTItem[]>(
    walletInputs.length > 0 ? ["aggregated-nfts", ...walletInputs.map((w) => `${w.address}-${w.chainId}`)] : null,
    async () => {
      const res = await fetch("/api/portfolio/wallet-data/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallets: walletInputs }),
      });
      if (!res.ok) return [];
      const json = (await res.json().catch(() => null)) as unknown;
      const payload = unwrapApiPayload<{ items?: WalletBatchItem[] }>(json);
      const items = Array.isArray(payload?.items) ? payload.items : [];
      return items.flatMap((item) => (item.ok && Array.isArray(item.data?.nfts) ? item.data!.nfts! : []));
    },
    { refreshInterval: 60000 },
  );

  return { nfts: data ?? [], isLoading };
}

export function NFTsTab({ chainId, wallets = [] }: NFTsTabProps) {
  const { nfts, isLoading } = useAggregatedNFTs(wallets, chainId);
  const hasNFTs = nfts.length > 0;

  if (isLoading && !hasNFTs) {
    return (
      <div className="flex w-full items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full">
      <div className="flex flex-col mb-4">
        <h3 className="text-base font-medium text-foreground">NFTs</h3>
        <span className="text-xs text-muted-foreground">{nfts.length} collections matching</span>
      </div>

      <div className="w-full">
        {/* Header - Matches TokensTable */}
        <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-border text-xs text-muted-foreground font-normal uppercase tracking-wide">
          <div className="col-span-6">Item</div>
          <div className="col-span-3 text-right">Floor</div>
          <div className="col-span-3 text-right">Value</div>
        </div>

        {/* Rows */}
        <div className="flex flex-col">
          {!hasNFTs ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No NFTs found in connected wallets.</div>
          ) : (
            nfts.map((nft, idx) => (
              <div
                key={`${nft.token_address}-${idx}`}
                className="group grid grid-cols-12 gap-4 px-4 py-4 items-center hover:bg-transparent transition-colors border-b border-transparent hover:border-border cursor-pointer rounded-lg relative"
              >
                <div className="col-span-6 flex items-center gap-3">
                  <NftImageCell nft={nft} />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground truncate max-w-[150px]">
                      {nft.name || "Unknown Collection"}
                    </span>
                    <span className="text-xs text-muted-foreground">{nft.symbol}</span>
                  </div>
                </div>

                <div className="col-span-3 text-right">
                  <span className="text-sm text-muted-foreground">—</span>
                </div>

                <div className="col-span-3 text-right flex items-center justify-end gap-2">
                  <span className="text-sm text-foreground">—</span>

                  <div className="absolute right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-8 h-8 rounded-full bg-muted dark:bg-[#252525] flex items-center justify-center text-foreground">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
