import "server-only";

import type { ApprovalPayload } from "@/lib/approvals/state-machine";

import type { CoinbaseAgentKitActionPolicy } from "./executor.types";
import type { CoinbaseAgentKitDomain } from "./catalog";

const SENSITIVE_ARG_KEY_PATTERN = /(private|secret|seed|mnemonic|jwt|api[-_]?key|signature)/i;
const HIGHLIGHT_ARG_KEY_PATTERN = /(amount|token|asset|vault|basename|wallet|receiver|spender|destination)/i;
const USD_COST_KEYS = ["amountUsd", "usdAmount", "valueUsd", "estimatedCostUsd"] as const;

function sanitizePreviewValue(value: UntypedJson): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return value.length <= 96 ? value : `${value.slice(0, 93)}...`;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return `${value.length} items`;
  if (typeof value === "object") return "{...}";
  return String(value);
}

function buildPreviewItems(args: Record<string, UntypedJson>): ApprovalPayload["preview"]["items"] {
  return Object.entries(args)
    .filter(([key]) => !SENSITIVE_ARG_KEY_PATTERN.test(key))
    .slice(0, 8)
    .map(([key, value]) => ({
      label: key,
      value: sanitizePreviewValue(value),
      highlight: HIGHLIGHT_ARG_KEY_PATTERN.test(key),
    }));
}

export function inferEstimatedCostUsd(args: Record<string, UntypedJson>): string | undefined {
  for (const key of USD_COST_KEYS) {
    const value = args[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value.toFixed(2);
    }
    if (typeof value === "string" && /^\d+(\.\d+)?$/.test(value.trim())) {
      return Number(value).toFixed(2);
    }
  }
  return undefined;
}

export function inferProtocol(domain: CoinbaseAgentKitDomain, actionName: string): string | null {
  const normalized = actionName.toLowerCase();
  if (normalized.includes("compound")) return "compound";
  if (normalized.includes("morpho")) return "morpho";
  if (normalized.includes("basename")) return "basename";
  if (normalized.includes("pyth")) return "pyth";
  if (normalized.includes("weth")) return "weth";
  if (normalized.includes("clanker")) return "clanker";
  if (normalized.includes("wow")) return "wow";
  if (normalized.includes("flaunch")) return "flaunch";
  return domain;
}

export function buildApprovalPayload(args: {
  actionArgs: Record<string, UntypedJson>;
  actionDescription: string;
  actionName: string;
  chainId: number | null;
  domain: CoinbaseAgentKitDomain;
  estimatedCostUsd?: string;
  operationType: CoinbaseAgentKitActionPolicy["autonomousAction"];
  walletAddress: string | null;
}): ApprovalPayload {
  return {
    toolId: "coinbase_agentkit",
    command: args.actionName,
    args: {
      domain: args.domain,
      action: args.actionName,
      chainId: args.chainId,
      walletAddress: args.walletAddress,
      ...args.actionArgs,
    },
    preview: {
      title: `Coinbase AgentKit ${args.actionName}`,
      description: args.actionDescription,
      items: [
        { label: "Wallet", value: args.walletAddress ?? "unresolved", highlight: true },
        { label: "Chain ID", value: args.chainId ? String(args.chainId) : "default" },
        { label: "Domain", value: args.domain },
        { label: "Protocol", value: inferProtocol(args.domain, args.actionName) ?? args.domain },
        ...buildPreviewItems(args.actionArgs),
      ].slice(0, 8),
      warnings: [
        "This action executes through the user's CDP embedded EVM wallet.",
        "Writes require approval unless the user's autonomous rules explicitly allow the action.",
      ],
      estimatedCost: args.estimatedCostUsd
        ? {
            amount: args.estimatedCostUsd,
            currency: "USD",
            usd: args.estimatedCostUsd,
          }
        : undefined,
    },
    operationType: args.operationType,
  };
}

