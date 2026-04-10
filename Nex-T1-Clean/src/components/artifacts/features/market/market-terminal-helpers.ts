import type { PromptInputMessage } from "@/components/chat-composer/types";
import type {
  MarketTerminalArtifactPayload,
  MarketTerminalScreenerRow,
} from "@/modules/shared/artifacts/market-terminal";

export const MARKET_TERMINAL_SUBMIT_EVENT = "nex:marketTerminalSubmit";

type MarketTerminalHandoffAction = "analyze" | "swap";

type MarketTerminalHandoffParams = {
  action: MarketTerminalHandoffAction;
  asset: Pick<
    MarketTerminalScreenerRow,
    "assetId" | "symbol" | "name" | "chain" | "price" | "swapTarget"
  >;
  terminal: Pick<
    MarketTerminalArtifactPayload,
    | "title"
    | "universe"
    | "initialView"
    | "query"
    | "chain"
    | "quoteCurrency"
    | "actions"
  >;
};

export function createMarketTerminalChatHandoff({
  action,
  asset,
  terminal,
}: MarketTerminalHandoffParams): PromptInputMessage {
  const verb = action === "swap" ? "Swap with agent" : "Analyze with agent";
  const marketContext = JSON.stringify(
    {
      source: "market-terminal",
      action,
      assetId: asset.assetId,
      symbol: asset.symbol,
      name: asset.name,
      chain: asset.chain,
      price: asset.price,
      swapTarget: asset.swapTarget,
      terminal,
    },
    null,
    0,
  );

  const text =
    action === "swap"
      ? `${verb}: prepare an approval-gated swap review for ${asset.symbol} on ${asset.chain} using the current market terminal context.`
      : `${verb}: review ${asset.symbol} and refine the current screener thesis using the current market terminal context.`;

  return {
    text,
    marketContext,
  };
}

type ActivateMarketTerminalLicenseParams = {
  activateLicense: (license: string) => boolean;
  env: string | undefined;
  hostname: string | undefined;
  licenseKey: string | undefined;
};

export function activateMarketTerminalLicense({
  activateLicense,
  env,
  hostname,
  licenseKey,
}: ActivateMarketTerminalLicenseParams): boolean {
  const normalizedEnv = (env ?? "").trim().toLowerCase();
  const normalizedHost = (hostname ?? "").trim().toLowerCase();
  const normalizedKey = (licenseKey ?? "").trim();

  if (!normalizedKey) {
    return false;
  }

  if (normalizedEnv !== "production") {
    return false;
  }

  if (!normalizedHost || normalizedHost === "localhost") {
    return false;
  }

  return activateLicense(normalizedKey);
}
