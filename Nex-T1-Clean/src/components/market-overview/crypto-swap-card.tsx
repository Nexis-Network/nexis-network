"use client";

import { useMemo } from "react";
import NumberFlow, { NumberFlowGroup } from "@number-flow/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowDownUp,
  ChevronDown,
  Equal,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import useMeasure from "react-use-measure";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type RawToken = {
  name?: string;
  symbol?: string;
  ticker?: string;
  icon?: string;
  image?: string;
  logo?: string;
  chain?: string;
  network?: string;
  balance?: number | string;
  available?: number | string;
};

type NormalisedToken = {
  name: string;
  symbol: string;
  image?: string | null;
  network?: string | null;
  balance?: number | null;
};

const parseNumber = (value: UntypedJson, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^\d.-]/g, "");
    const parsed = Number(cleaned);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const formatTokenValue = (value: number) =>
  Number.isFinite(value)
    ? value.toLocaleString("en-US", {
      maximumFractionDigits: value >= 1 ? 4 : 8,
    })
    : "0";

const normaliseToken = (
  token: RawToken | undefined,
  defaults: NormalisedToken
): NormalisedToken => {
  if (!token) return defaults;
  const symbol = token.symbol ?? token.ticker ?? defaults.symbol;
  return {
    name: token.name ?? defaults.name ?? symbol?.toUpperCase?.() ?? "Token",
    symbol: symbol?.toUpperCase?.() ?? defaults.symbol ?? "TKN",
    image: token.icon ?? token.image ?? token.logo ?? defaults.image ?? null,
    network: token.network ?? token.chain ?? defaults.network ?? null,
    balance:
      token.balance != null || token.available != null
        ? parseNumber(token.balance ?? token.available ?? 0)
        : defaults.balance ?? null,
  };
};

const prepareRoute = (output: UntypedJson): string[] => {
  if (Array.isArray(output?.route)) {
    return output.route
      .map((step: UntypedJson) => {
        if (typeof step === "string") return step;
        if (step?.name) return step.name;
        if (step?.label) return step.label;
        return null;
      })
      .filter(Boolean);
  }
  if (Array.isArray(output?.path)) {
    return output.path
      .map((step: UntypedJson) =>
        typeof step === "string" ? step : step?.symbol ?? step?.name ?? null
      )
      .filter(Boolean);
  }
  if (typeof output?.route === "string") {
    return output.route.split(/->|,/).map((part: string) => part.trim());
  }
  if (typeof output?.path === "string") {
    return output.path.split(/->|,/).map((part: string) => part.trim());
  }
  return [];
};

const prepareWarnings = (output: UntypedJson): string[] => {
  if (Array.isArray(output?.warnings)) {
    return output.warnings.filter((warning: UntypedJson): warning is string =>
      Boolean(warning)
    );
  }
  if (typeof output?.warning === "string" && output.warning.trim()) {
    return [output.warning.trim()];
  }
  return [];
};

const useBadgeMeasure = () => {
  const [ref, bounds] = useMeasure();
  return { ref: ref as (node: HTMLDivElement | null) => void, width: bounds.width };
};

export function CryptoSwapCard({ output }: { output: UntypedJson }) {
  const providerName =
    output?.provider ??
    output?.aggregator ??
    output?.thirdParty ??
    "Third-party swap";
  const providerUrl =
    output?.thirdPartyUrl ?? output?.aggregatorUrl ?? output?.url ?? null;

  const fromToken = useMemo(
    () =>
      normaliseToken(output?.fromToken ?? output?.sourceToken ?? output?.sellToken, {
        name: "Ethereum",
        symbol: "ETH",
        image: "/skiperv1/web3/eth.svg",
        network: "Ethereum",
        balance: 111.82,
      }),
    [output?.fromToken, output?.sellToken, output?.sourceToken]
  );

  const toToken = useMemo(
    () =>
      normaliseToken(output?.toToken ?? output?.targetToken ?? output?.buyToken, {
        name: "Aave",
        symbol: "AAVE",
        image: "/skiperv1/web3/aave.svg",
        network: "Ethereum",
        balance: null,
      }),
    [output?.buyToken, output?.targetToken, output?.toToken]
  );

  const amountIn = parseNumber(
    output?.amountIn ??
    output?.amount ??
    output?.sellAmount ??
    output?.fromAmount ??
    0
  );
  const amountOut = parseNumber(
    output?.amountOut ??
    output?.estimatedAmount ??
    output?.buyAmount ??
    output?.toAmount ??
    0
  );
  const usdValueRaw = parseNumber(
    output?.usdValue ??
    output?.usdNotional ??
    output?.fiatValue ??
    output?.notionalUsd ??
    amountIn * parseNumber(output?.referencePrice ?? 0)
  );

  const minReceived = parseNumber(
    output?.minReceived ?? output?.minimumReceived ?? output?.minAmount ?? 0
  );

  const priceImpact = parseNumber(
    output?.priceImpactPct ?? output?.priceImpact ?? 0
  );
  const slippage = parseNumber(
    output?.slippagePct ?? output?.slippage ?? 0.5,
    0.5
  );
  const etaSeconds = parseNumber(output?.etaSeconds ?? output?.eta ?? 30, 30);

  const route = useMemo(() => prepareRoute(output), [output]);
  const warnings = useMemo(() => prepareWarnings(output), [output]);

  const { ref: usdRef, width: usdWidth } = useBadgeMeasure();

  return (
    <div className="space-y-4 p-1">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <Badge variant="secondary">
            {providerName ? `${providerName} Quote` : "Swap Quote"}
          </Badge>
          <h3 className="font-regular text-lg text-foreground">
            Swap {fromToken.symbol} → {toToken.symbol}
          </h3>
          <p className="text-xs text-muted-foreground">
            Ready to route your trade through the connected third-party
            liquidity aggregator.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {providerUrl ? (
            <Button asChild size="sm" variant="outline">
              <a
                href={providerUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open {providerName}
                <ExternalLink className="ml-2 h-3.5 w-3.5" />
              </a>
            </Button>
          ) : null}
        </div>
      </div>

      <Card className="relative space-y-4 overflow-hidden rounded-3xl border border-border/50 bg-card p-4 text-foreground">
        <motion.div
          animate={{ opacity: 1 }}
          className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-foreground/[0.04] to-transparent"
          initial={{ opacity: 0 }}
        />
        <div className="relative z-10 space-y-6">
          <TokenPanel
            token={fromToken}
            amount={amountIn}
            usdRef={usdRef}
            usdWidth={usdWidth}
            usdValue={usdValueRaw}
          />

          <motion.div
            className="flex justify-center"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <motion.div
              className="rounded-full border border-border/60 bg-card p-1.5 text-muted-foreground"
              animate={{ rotate: [0, 180, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            >
              <ChevronDown className="h-4 w-4" />
            </motion.div>
          </motion.div>

          <TokenReceivePanel token={toToken} amount={amountOut} />
        </div>
      </Card>

      <motion.div
        className="grid gap-3 md:grid-cols-2"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <SwapMetric
          label="Min. Received"
          value={
            minReceived
              ? `${formatTokenValue(minReceived)} ${toToken.symbol}`
              : `${formatTokenValue(amountOut)} ${toToken.symbol}`
          }
        />
        <SwapMetric
          label="Price Impact"
          value={`${priceImpact.toFixed(2)}%`}
          intent={priceImpact >= 1 ? "warn" : priceImpact <= 0.3 ? "good" : undefined}
        />
        <SwapMetric
          label="Max Slippage"
          value={`${slippage.toFixed(2)}%`}
        />
        <SwapMetric
          label="Estimated Time"
          value={`${Math.max(1, Math.round(etaSeconds))}s`}
        />
      </motion.div>

      <RouteVisualizer route={route} providerName={providerName} />

      <AnimatePresence>
        {warnings.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200"
          >
            <div className="mb-1 flex items-center gap-2 font-medium uppercase tracking-wide">
              <AlertTriangle className="h-4 w-4" />
              {warnings.length === 1 ? "Important Notice" : "Important Notices"}
            </div>
            <ul className="space-y-1">
              {warnings.map((warning, index) => (
                <li key={`${warning}-${index}`}>{warning}</li>
              ))}
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

const TokenPanel = ({
  token,
  amount,
  usdValue,
  usdRef,
  usdWidth,
}: {
  token: NormalisedToken;
  amount: number;
  usdValue: number;
  usdRef: (node: HTMLDivElement | null) => void;
  usdWidth: number;
}) => {
  const displayAmount = Number.isFinite(amount) ? amount : 0;
  const displayUsd = Number.isFinite(usdValue) ? usdValue : 0;

  return (
    <div className="relative rounded-3xl border border-border/40 bg-card px-4 py-5">
      <div className="flex w-full items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {token.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={`${token.name} logo`}
              className="size-12 rounded-full border border-border/10 bg-muted/80 object-contain"
              src={token.image}
            />
          ) : (
            <div className="flex size-12 items-center justify-center rounded-full border border-border/10 bg-muted/80 text-lg font-regular">
              {token.symbol.slice(0, 2)}
            </div>
          )}
          <div>
            <h2 className="text-lg font-regular">{token.name}</h2>
            <p className="text-xs text-muted-foreground">
              {formatTokenValue(token.balance ?? 0)} {token.symbol} available
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="rounded-full border border-border/10 bg-muted px-4 py-1 text-xs font-regular text-muted-foreground hover:bg-muted/80"
        >
          Use Max
        </Button>
      </div>

      <div className="relative mt-5 flex flex-col items-center gap-4">
        <div className="relative w-full text-center">
          <motion.div
            className="pointer-events-none absolute inset-0 flex items-center justify-center text-[45px] font-regular tracking-tight"
            key={displayAmount}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
          >
            <NumberFlowGroup>
              <NumberFlow
                value={displayAmount}
                format={{ maximumFractionDigits: displayAmount >= 1 ? 4 : 8 }}
              />
            </NumberFlowGroup>
          </motion.div>
          <input
            aria-label="Amount to swap"
            className="sr-only"
            readOnly
            value={displayAmount}
          />
        </div>

        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1">
            <div className="rounded-full bg-background p-1 text-muted-foreground">
              <Equal className="size-4" />
            </div>
            <div className="relative overflow-hidden">
              <motion.div
                animate={{ width: usdWidth ? usdWidth + 12 : "auto" }}
                className="absolute inset-0 -z-10 rounded-full bg-foreground/5"
                transition={{ type: "spring", stiffness: 180, damping: 18 }}
              />
              <div ref={usdRef} className="flex items-baseline gap-1 px-1">
                <span className="text-xs opacity-70">$</span>
                <NumberFlow
                  value={displayUsd}
                  format={{ maximumFractionDigits: displayUsd >= 1 ? 2 : 4 }}
                />
              </div>
            </div>
          </div>
          <ArrowDownUp className="size-4 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
};

const TokenReceivePanel = ({
  token,
  amount,
}: {
  token: NormalisedToken;
  amount: number;
}) => {
  return (
    <div className="rounded-3xl border border-border/40 bg-card px-4 py-5">
      <div className="flex w-full items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {token.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={`${token.name} logo`}
              className="size-12 rounded-full border border-border/10 bg-muted/80 object-contain"
              src={token.image}
            />
          ) : (
            <div className="flex size-12 items-center justify-center rounded-full border border-border/10 bg-muted/80 text-lg font-regular">
              {token.symbol.slice(0, 2)}
            </div>
          )}
          <div>
            <h2 className="text-lg font-regular">{token.name}</h2>
            <p className="text-xs text-muted-foreground">Receive {token.symbol}</p>
          </div>
        </div>
        <div className="rounded-full border border-border/10 px-3 py-1 text-xs font-regular text-muted-foreground">
          <NumberFlow
            value={Number.isFinite(amount) ? amount : 0}
            format={{ maximumFractionDigits: amount >= 1 ? 4 : 8 }}
          />
        </div>
      </div>
    </div>
  );
};

const SwapMetric = ({
  label,
  value,
  intent,
}: {
  label: string;
  value: string;
  intent?: "good" | "warn";
}) => (
  <div className="rounded-2xl border border-border/10 bg-muted/40 p-3 text-xs text-muted-foreground">
    <div className="mb-2 flex items-center gap-2 uppercase tracking-wide text-[10px] text-muted-foreground/70">
      {intent === "good" ? (
        <ShieldCheck className="h-3 w-3 text-emerald-300" />
      ) : intent === "warn" ? (
        <AlertTriangle className="h-3 w-3 text-amber-300" />
      ) : null}
      {label}
    </div>
    <div
      className={cn("text-sm font-regular", {
        "text-emerald-300": intent === "good",
        "text-amber-200": intent === "warn",
      })}
    >
      {value}
    </div>
  </div>
);

const RouteVisualizer = ({
  route,
  providerName,
}: {
  route: string[];
  providerName: string;
}) => {
  if (!route.length) return null;

  return (
    <Card className="rounded-3xl border border-border/10 bg-card/90 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <div className="text-xs font-regular uppercase tracking-wider text-muted-foreground/70">
            Route Preview
          </div>
          <div className="text-sm text-muted-foreground">
            Powered by {providerName}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {route.map((hop, index) => (
          <motion.div
            key={`${hop}-${index}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center gap-2"
          >
            <div className="rounded-full border border-border/10 bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              {hop}
            </div>
            {index < route.length - 1 ? (
              <ArrowDownUp className="h-4 w-4 rotate-90 text-muted-foreground" />
            ) : null}
          </motion.div>
        ))}
      </div>
    </Card>
  );
};
