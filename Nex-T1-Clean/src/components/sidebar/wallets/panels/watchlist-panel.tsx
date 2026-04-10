import { useEffect, useState, useTransition } from "react";
import { WalletSnapshot } from "@/modules/wallets/profile";
import { Search, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { getWatchlistAction, removeWatchlistItemAction } from "@/server/actions/watchlist";
import { toast } from "sonner";
import { WatchlistSummary, WatchlistItemSnapshot } from "@/types/watchlist";
import { formatFiat } from "@/lib/formatters/wallet";
import { Skeleton } from "@/components/ui/skeleton";

interface WatchlistPanelProps {
  wallet: WalletSnapshot;
}

export function WatchlistPanel({ wallet: _wallet }: WatchlistPanelProps) {
  const [query, setQuery] = useState("");
  const [watchlist, setWatchlist] = useState<WatchlistSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  const fetchWatchlist = async () => {
    setLoading(true);
    const result = await getWatchlistAction();
    if (result.success && result.data) {
      setWatchlist(result.data);
    } else {
      toast.error(result.error || "Failed to load watchlist");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchWatchlist();
  }, []);

  const handleRemove = (itemId: string) => {
    startTransition(async () => {
      const result = await removeWatchlistItemAction(itemId);
      if (result.success) {
        toast.success("Item removed");
        // Optimistically update
        setWatchlist((prev) => {
          if (!prev) return null;
          const prevItems = Array.isArray(prev.items) ? prev.items : [];
          return {
            ...prev,
            items: prevItems.filter((i) => i.id !== itemId),
          };
        });
      } else {
        toast.error("Failed to remove item");
      }
    });
  };

  // Filter items
  const items = (watchlist?.items ?? []).filter((item) => {
    const q = query.toLowerCase();
    return (
      item.symbol?.toLowerCase().includes(q) ||
      item.name?.toLowerCase().includes(q) ||
      item.addressOrMint?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-medium text-[#171717] dark:text-white">Watchlist</h2>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#666666] dark:text-zinc-500" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search items..."
          className="border-black/10 bg-white/70 pl-9 text-sm text-[#171717] placeholder:text-[#666666] focus-visible:ring-1 focus-visible:ring-black/10 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-zinc-500 dark:focus-visible:ring-white/20"
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar -mr-2 pr-2">
        {loading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl bg-black/[0.06] dark:bg-white/5" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-[#666666] dark:text-zinc-500">
            <p>Your watchlist is empty.</p>
            <p className="text-xs mt-2">Add assets from the marketplace or explorer.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((item) => (
              <WatchlistItem key={item.id} item={item} onRemove={() => handleRemove(item.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function WatchlistItem({ item, onRemove }: { item: WatchlistItemSnapshot; onRemove: () => void }) {
  const price = item.enrichment?.priceUsd ?? item.lastPrice ?? 0;

  return (
    <div 
        className="group relative flex items-center justify-between overflow-hidden rounded-xl border border-black/10 bg-white/60 p-3 transition-colors hover:bg-white dark:border-transparent dark:bg-white/5 dark:hover:bg-white/10"
    >
        <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-black/[0.05] dark:bg-white/10">
                {item.logoUrl ? (
                    <Image src={item.logoUrl} alt={item.symbol ?? "Asset"} fill className="object-cover" />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] font-bold">
                        {item.symbol?.slice(0, 2)}
                    </div>
                )}
                {item.chainName === "solana" && (
                     <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-black">
                        <Image src="/icons/chains/solana.svg" alt="Sol" width={12} height={12} className="rounded-full" />
                     </div>
                )}
            </div>
            <div>
                <p className="font-medium text-[#171717] dark:text-white">{item.displayName || item.name || item.symbol}</p>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-[#666666] dark:text-zinc-400">{item.symbol}</span>
                    {item.chainName && <span className="hidden rounded bg-black/[0.05] px-1 text-[10px] text-[#666666] sm:inline-block dark:bg-white/5 dark:text-zinc-500">{item.chainName}</span>}
                </div>
            </div>
        </div>

        <div className="flex flex-col items-end">
            <p className="text-sm font-medium text-[#171717] dark:text-white">{formatFiat(price)}</p>
            <div className={cn("flex items-center text-xs", (item.lastPriceChangePct ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400")}>
                {(item.lastPriceChangePct ?? 0) >= 0 ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
                {Math.abs(item.lastPriceChangePct ?? 0).toFixed(2)}%
            </div>
        </div>
        
        {/* Remove Button Overlay (visible on hover group) */}
        <div className="absolute right-0 top-0 bottom-0 flex w-16 translate-x-full cursor-pointer items-center justify-center bg-rose-900/90 backdrop-blur transition-transform group-hover:translate-x-0" onClick={onRemove}>
             <Trash2 className="h-5 w-5 text-white" />
        </div>
    </div>
  );
}
