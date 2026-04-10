"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, Loader2, TrendingUp, Wallet2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useResolvedCdpWallets } from "@/lib/cdp/use-resolved-cdp-wallets";
import { cn } from "@/lib/utils";

type PolymarketOutcome = {
  name: string;
  tokenId: string;
  price: string;
};

type PolymarketMarket = {
  conditionId: string;
  question: string;
  volume: string;
  liquidity: string;
  outcomes: PolymarketOutcome[];
};

type PolymarketMarketsPayload = {
  markets: PolymarketMarket[];
  total: number;
};

type PolymarketPositionsPayload = {
  positions: Array<{
    market: string;
    outcome: string;
    size: string;
    currentValue: string;
    unrealizedPnl: string;
  }>;
  totalValue: string;
  unrealizedPnl: string;
};

type CredentialsPayload = {
  hasCredentials: boolean;
  polyAddress?: string | null;
  funderAddress?: string | null;
  signatureType?: number | null;
};

type TradePreviewPayload = {
  order: {
    tokenId: string;
    side: "BUY" | "SELL";
    price: number;
    size: number;
  };
  estimate: {
    total: string;
    fees: string;
    potentialPayout: string;
  };
};

type ApiResponse<T> = {
  success?: boolean;
  data?: T;
  error?: {
    message?: string;
  };
};

const formatAddress = (value?: string | null) => {
  if (!value) return "Not connected";
  if (value.length < 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
};

const toPercent = (price: string) => {
  const n = Number(price || 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n * 100)));
};

async function fetchApi<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const payload = (await response.json().catch(() => ({}))) as ApiResponse<T>;

  if (!response.ok || payload.success === false || payload.data === undefined) {
    throw new Error(payload.error?.message ?? `Request failed (${response.status})`);
  }

  return payload.data;
}

export function WorkbenchPolymarketTab() {
  const { evmAddress, wallets } = useResolvedCdpWallets();

  const [credentials, setCredentials] = useState<CredentialsPayload | null>(null);
  const [markets, setMarkets] = useState<PolymarketMarket[]>([]);
  const [positions, setPositions] = useState<PolymarketPositionsPayload | null>(null);
  const [query, setQuery] = useState("");
  const [selectedTokenId, setSelectedTokenId] = useState("");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [price, setPrice] = useState("0.50");
  const [size, setSize] = useState("10");
  const [preview, setPreview] = useState<TradePreviewPayload | null>(null);
  const [showReferenceExample, setShowReferenceExample] = useState(false);

  const [loadingMarkets, setLoadingMarkets] = useState(true);
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCredentials = useCallback(async () => {
    try {
      const data = await fetchApi<CredentialsPayload>("/api/polymarket/creds", {
        cache: "no-store",
      });
      setCredentials(data);
    } catch {
      setCredentials({ hasCredentials: false });
    }
  }, []);

  const fetchMarkets = useCallback(async (searchQuery?: string) => {
    setLoadingMarkets(true);
    setError(null);

    try {
      const q = (searchQuery ?? "").trim();
      const params = new URLSearchParams();
      if (q.length > 0) {
        params.set("action", "search");
        params.set("query", q);
      } else {
        params.set("action", "trending");
      }
      params.set("limit", "8");

      const data = await fetchApi<PolymarketMarketsPayload>(`/api/polymarket/markets?${params.toString()}`, {
        cache: "no-store",
      });

      setMarkets(data.markets ?? []);
      const firstOutcome = data.markets?.[0]?.outcomes?.[0];
      if (firstOutcome) {
        setSelectedTokenId((current) => current || firstOutcome.tokenId);
        setPrice((current) => current || firstOutcome.price || "0.50");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingMarkets(false);
    }
  }, []);

  const fetchPositions = useCallback(async () => {
    setLoadingPositions(true);
    setError(null);

    try {
      const data = await fetchApi<PolymarketPositionsPayload>("/api/polymarket/positions", {
        cache: "no-store",
      });
      setPositions(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingPositions(false);
    }
  }, []);

  const previewTrade = useCallback(async () => {
    setLoadingPreview(true);
    setError(null);

    try {
      const priceNum = Number(price);
      const sizeNum = Number(size);

      if (!selectedTokenId || !Number.isFinite(priceNum) || !Number.isFinite(sizeNum)) {
        throw new Error("Select a market outcome and provide valid price/size");
      }

      const data = await fetchApi<TradePreviewPayload>("/api/polymarket/trade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "preview",
          tokenId: selectedTokenId,
          side,
          price: priceNum,
          size: sizeNum,
          orderType: "GTC",
        }),
      });

      setPreview(data);
    } catch (err) {
      setPreview(null);
      setError((err as Error).message);
    } finally {
      setLoadingPreview(false);
    }
  }, [price, selectedTokenId, side, size]);

  useEffect(() => {
    void Promise.all([fetchCredentials(), fetchMarkets()]);
  }, [fetchCredentials, fetchMarkets]);

  const selectedOutcome = useMemo(() => {
    for (const market of markets) {
      const outcome = market.outcomes.find((item) => item.tokenId === selectedTokenId);
      if (outcome) return outcome;
    }
    return null;
  }, [markets, selectedTokenId]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="rounded-xl border border-border/60 bg-background/40 p-3">
        <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>Reference UI Example</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowReferenceExample((value) => !value)}
          >
            {showReferenceExample ? "Hide" : "Show"}
          </Button>
        </div>
        {showReferenceExample ? (
          <div className="overflow-hidden rounded-lg border border-border/60">
            <iframe
              title="Polymarket Widget Reference"
              src="https://ui.gizmolab.io/components/polymarket-widget"
              className="h-80 w-full bg-background"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Toggle to preview the external reference component from Gizmolab.
          </p>
        )}
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-background/40 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Wallet2 className="size-3.5" />
            Wallet Context
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Nex Wallet (EVM)</span>
              <code>{formatAddress(evmAddress)}</code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Polymarket</span>
              <code>{formatAddress(credentials?.funderAddress || credentials?.polyAddress)}</code>
            </div>
            <div className="pt-1">
              <Badge
                variant="outline"
                className={cn(
                  credentials?.hasCredentials
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : "border-amber-500/40 bg-amber-500/10 text-amber-300",
                )}
              >
                {credentials?.hasCredentials ? "Polymarket Connected" : "Connect Polymarket Credentials"}
              </Badge>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-background/40 p-3">
          <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-3.5" />
              Positions
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={loadingPositions || !credentials?.hasCredentials}
              onClick={() => void fetchPositions()}
            >
              {loadingPositions ? <Loader2 className="size-3.5 animate-spin" /> : "Refresh"}
            </Button>
          </div>

          {positions ? (
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Value</span>
                <code>${positions.totalValue}</code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Unrealized PnL</span>
                <code>{Number(positions.unrealizedPnl) >= 0 ? "+" : ""}${positions.unrealizedPnl}</code>
              </div>
              <div className="pt-1 text-muted-foreground">{positions.positions.length} open position(s)</div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Load positions to show open market exposure.</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-background/40 p-3">
        <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
          <BarChart3 className="size-3.5" />
          Markets
        </div>

        <div className="mb-2 flex gap-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search markets"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => void fetchMarkets(query)}
            disabled={loadingMarkets}
          >
            {loadingMarkets ? <Loader2 className="size-3.5 animate-spin" /> : "Search"}
          </Button>
        </div>

        {loadingMarkets ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : markets.length === 0 ? (
          <p className="text-xs text-muted-foreground">No markets found.</p>
        ) : (
          <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
            {markets.map((market) => {
              const yes = market.outcomes.find((outcome) => outcome.name.toLowerCase() === "yes") ?? market.outcomes[0];
              const no = market.outcomes.find((outcome) => outcome.name.toLowerCase() === "no") ?? market.outcomes[1];
              const yesPct = toPercent(yes?.price ?? "0");
              const noPct = toPercent(no?.price ?? String((100 - yesPct) / 100));

              return (
                <button
                  key={market.conditionId}
                  type="button"
                  onClick={() => {
                    const target = yes ?? market.outcomes[0];
                    if (target) {
                      setSelectedTokenId(target.tokenId);
                      setPrice(target.price);
                    }
                  }}
                  className={cn(
                    "w-full rounded-lg border border-border/50 bg-background/60 p-3 text-left transition-colors hover:border-border",
                    market.outcomes.some((outcome) => outcome.tokenId === selectedTokenId) && "border-sky-500/50",
                  )}
                >
                  <p className="mb-2 line-clamp-2 text-xs text-foreground">{market.question}</p>
                  <div className="mb-2 flex h-2 w-full overflow-hidden rounded-full bg-muted/40">
                    <div className="bg-emerald-500" style={{ width: `${yesPct}%` }} />
                    <div className="bg-rose-500" style={{ width: `${noPct}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Yes {yesPct}%</span>
                    <span>No {noPct}%</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border/60 bg-background/40 p-3">
        <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
          Trade Preview
          {selectedOutcome ? <Badge variant="outline">{selectedOutcome.name}</Badge> : null}
        </div>

        <div className="grid gap-2 md:grid-cols-4">
          <Input
            value={selectedTokenId}
            onChange={(event) => setSelectedTokenId(event.target.value)}
            placeholder="Token ID"
          />
          <Input
            value={side}
            onChange={(event) => setSide((event.target.value || "BUY") as "BUY" | "SELL")}
            placeholder="BUY / SELL"
          />
          <Input value={price} onChange={(event) => setPrice(event.target.value)} placeholder="Price" />
          <Input value={size} onChange={(event) => setSize(event.target.value)} placeholder="Size" />
        </div>

        <div className="mt-2 flex items-center gap-2">
          <Button type="button" disabled={loadingPreview || !credentials?.hasCredentials} onClick={() => void previewTrade()}>
            {loadingPreview ? <Loader2 className="mr-1 size-3.5 animate-spin" /> : null}
            Preview Order
          </Button>
          {!credentials?.hasCredentials ? (
            <span className="text-xs text-muted-foreground">Connect Polymarket credentials to preview orders.</span>
          ) : null}
        </div>

        {preview ? (
          <div className="mt-3 rounded-lg border border-border/60 bg-background/60 p-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Order</span>
              <code>{preview.order.side}</code>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-muted-foreground">Total</span>
              <code>${preview.estimate.total}</code>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-muted-foreground">Fees</span>
              <code>${preview.estimate.fees}</code>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-muted-foreground">Potential Payout</span>
              <code>${preview.estimate.potentialPayout}</code>
            </div>
          </div>
        ) : null}
      </div>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <div className="text-[11px] text-muted-foreground">
        Nex Wallets detected: {wallets.filter((wallet) => wallet.isReady).length}
      </div>
    </div>
  );
}
