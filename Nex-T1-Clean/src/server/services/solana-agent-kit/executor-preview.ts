import "server-only";

import type { ApprovalPayload } from "@/lib/approvals/state-machine";

import type { SolanaAgentKitActionPolicy } from "./executor.types";
import type { SolanaAgentKitDomain } from "./plugin-registry";

const SENSITIVE_ARG_KEY_PATTERN = /(private|secret|seed|mnemonic|jwt|api[-_]?key|signature)/i;
const HIGHLIGHT_ARG_KEY_PATTERN = /(amount|token|mint|market|pool|wallet|recipient|domain|symbol|size)/i;
const USD_VALUE_PATTERN = /^\d+(\.\d+)?$/u;
const USD_COST_KEYS = [
  "amountUsd",
  "usdAmount",
  "valueUsd",
  "totalUsd",
  "notionalUsd",
  "estimatedCostUsd",
] as const;

const PROTOCOL_KEYWORDS: Array<{ protocol: string; patterns: string[] }> = [
  { protocol: "jupiter", patterns: ["JUPITER", "LIMIT_ORDER"] },
  { protocol: "pumpfun", patterns: ["PUMPFUN", "PUMP"] },
  { protocol: "raydium", patterns: ["RAYDIUM"] },
  { protocol: "orca", patterns: ["ORCA", "WHIRLPOOL"] },
  { protocol: "meteora", patterns: ["METEORA", "DLMM", "ALPHA_VAULT"] },
  { protocol: "openbook", patterns: ["OPENBOOK"] },
  { protocol: "manifest", patterns: ["MANIFEST"] },
  { protocol: "drift", patterns: ["DRIFT"] },
  { protocol: "adrena", patterns: ["ADRENA", "PERP"] },
  { protocol: "lulo", patterns: ["LULO"] },
  { protocol: "wormhole", patterns: ["WORMHOLE"] },
  { protocol: "debridge", patterns: ["DEBRIDGE"] },
  { protocol: "metaplex", patterns: ["NFT", "COLLECTION", "METADATA", "TOKEN_2022"] },
  { protocol: "3land", patterns: ["3LAND"] },
  { protocol: "sns", patterns: ["DOMAIN", "SNS"] },
  { protocol: "alldomains", patterns: ["ALL_DOMAINS"] },
  { protocol: "jito", patterns: ["JITO"] },
  { protocol: "pyth", patterns: ["PYTH"] },
  { protocol: "sanctum", patterns: ["SANCTUM"] },
  { protocol: "solayer", patterns: ["SOLAYER"] },
  { protocol: "gibwork", patterns: ["GIBWORK"] },
] as const;

export function sanitizePreviewValue(value: UntypedJson, depth = 0): string {
  if (value === null || value === undefined) {
    return "null";
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length <= 96 ? trimmed : `${trimmed.slice(0, 93)}...`;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    if (depth >= 1) {
      return `[${value.length} items]`;
    }

    return value
      .slice(0, 4)
      .map((entry) => sanitizePreviewValue(entry, depth + 1))
      .join(", ");
  }

  if (typeof value === "object") {
    if (depth >= 1) {
      return "{...}";
    }

    return Object.entries(value)
      .slice(0, 4)
      .map(([key, nested]) => `${key}: ${sanitizePreviewValue(nested as UntypedJson, depth + 1)}`)
      .join("; ");
  }

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

    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
      return value.toFixed(2);
    }

    if (typeof value === "string" && value.trim() && USD_VALUE_PATTERN.test(value.trim())) {
      return Number(value.trim()).toFixed(2);
    }
  }

  return undefined;
}

export function inferProtocol(domain: SolanaAgentKitDomain, actionName: string): string | null {
  const normalizedActionName = actionName.toUpperCase();

  for (const entry of PROTOCOL_KEYWORDS) {
    if (entry.patterns.some((pattern) => normalizedActionName.includes(pattern))) {
      return entry.protocol;
    }
  }

  return domain;
}

export function buildApprovalPayload(args: {
  actionArgs: Record<string, UntypedJson>;
  actionDescription: string;
  actionName: string;
  domain: SolanaAgentKitDomain;
  estimatedCostUsd?: string;
  operationType: SolanaAgentKitActionPolicy["autonomousAction"];
  walletAddress: string | null;
}): ApprovalPayload {
  const preview: ApprovalPayload["preview"] = {
    title: `Solana AgentKit ${args.actionName}`,
    description: args.actionDescription,
    items: [
      {
        label: "Wallet",
        value: args.walletAddress ?? "read-only execution",
        highlight: true,
      },
      {
        label: "Domain",
        value: args.domain,
      },
      {
        label: "Protocol",
        value: inferProtocol(args.domain, args.actionName) ?? args.domain,
      },
      ...buildPreviewItems(args.actionArgs),
    ].slice(0, 8),
    warnings: [
      "This action can modify on-chain state or move assets.",
      "Protocol fees, slippage, and execution outcomes are determined by the destination program.",
      args.estimatedCostUsd
        ? `Estimated notional value used for autonomous checks: $${args.estimatedCostUsd}.`
        : "No USD notional estimate was derived, so autonomous auto-approval is disabled for this action.",
    ],
    estimatedCost: args.estimatedCostUsd
      ? {
          amount: args.estimatedCostUsd,
          currency: "USD",
          usd: args.estimatedCostUsd,
        }
      : undefined,
  };

  return {
    toolId: "solana_agentkit",
    command: args.actionName,
    args: {
      domain: args.domain,
      action: args.actionName,
      walletAddress: args.walletAddress,
      ...args.actionArgs,
    },
    preview,
    operationType: args.operationType,
  };
}
