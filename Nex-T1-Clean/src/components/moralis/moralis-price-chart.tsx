"use client";

import { useEffect, useId, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

// Moralis docs: https://docs.moralis.com/web3-data-api/solana/tutorials/embed-tradingview-chart
// Widget config reference: https://moralis.com/widget/

declare global {
  interface Window {
    createMyWidget?: (containerId: string, options: Record<string, UntypedJson>) => void;
  }
}

const MORALIS_CHART_SCRIPT_ID = "moralis-chart-widget";
const MORALIS_CHART_SCRIPT_SRC = "https://moralis.com/static/embed/chart.js";

let scriptPromise: Promise<void> | null = null;

function loadMoralisChartScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }
  if (window.createMyWidget) {
    return Promise.resolve();
  }

  if (scriptPromise) {
    return scriptPromise;
  }

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(MORALIS_CHART_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load Moralis chart script")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = MORALIS_CHART_SCRIPT_ID;
    script.src = MORALIS_CHART_SCRIPT_SRC;
    script.async = true;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("Failed to load Moralis chart script")), { once: true });
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export type MoralisPriceChartProps = {
  className?: string;
  /** `solana` for Pump.fun; Moralis also supports EVM chainIds like `0x1`. */
  chainId?: string;
  /** SPL mint or EVM contract address (mutually exclusive with `pairAddress`). */
  tokenAddress?: string;
  /** DEX pair address (mutually exclusive with `tokenAddress`). */
  pairAddress?: string;
  /** Widget interval, e.g. `1H`, `1D`. */
  defaultInterval?: string;
  /** Fixed height in px when `autoSize` is false. */
  height?: number;
  /** Auto-sizes width/height to container. */
  autoSize?: boolean;
};

export function MoralisPriceChart({
  className,
  chainId = "solana",
  tokenAddress,
  pairAddress,
  defaultInterval = "1H",
  height = 360,
  autoSize = true,
}: MoralisPriceChartProps) {
  const reactId = useId();
  const containerId = useMemo(
    () => `moralis-chart-${reactId.replace(/[:]/g, "")}`,
    [reactId],
  );

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tokenAddress && !pairAddress) {
      setError("Missing tokenAddress or pairAddress");
      return;
    }
    if (tokenAddress && pairAddress) {
      setError("Provide either tokenAddress or pairAddress (not both)");
      return;
    }

    let cancelled = false;
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = "";
    setError(null);

    void (async () => {
      try {
        await loadMoralisChartScript();
        if (cancelled) return;
        if (typeof window.createMyWidget !== "function") {
          throw new Error("Moralis chart widget API unavailable");
        }

        container.innerHTML = "";

        window.createMyWidget(containerId, {
          autoSize,
          chainId,
          ...(tokenAddress ? { tokenAddress } : {}),
          ...(pairAddress ? { pairAddress } : {}),
          defaultInterval,
          theme: "moralis",
          locale: "en",
          showHoldersChart: false,
          showCurrencyToggle: false,
          hideLeftToolbar: false,
          hideTopToolbar: false,
          hideBottomToolbar: false,
        });
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to render chart");
      }
    })();

    return () => {
      cancelled = true;
      const el = document.getElementById(containerId);
      if (el) el.innerHTML = "";
    };
  }, [autoSize, chainId, containerId, defaultInterval, pairAddress, tokenAddress]);

  return (
    <div className={cn("w-full overflow-hidden rounded-lg border border-border/40 bg-background/60", className)}>
      {error ? (
        <div className="p-4 text-sm text-muted-foreground">{error}</div>
      ) : (
        <div
          id={containerId}
          className="w-full"
          style={{ height }}
          suppressHydrationWarning
        />
      )}
    </div>
  );
}
