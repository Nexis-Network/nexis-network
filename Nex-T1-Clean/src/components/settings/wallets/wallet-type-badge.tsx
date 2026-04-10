"use client";

import { memo } from "react";

import { Badge } from "@/components/ui/badge";
import type { WalletPortfolio } from "@/lib/user/profile";
import { cn } from "@/lib/utils";

export type WalletCategory = "agent" | "inApp" | "eoa" | "multiSig";

type CategoryConfig = {
  label: string;
  badgeClassName: string;
};

const CATEGORY_CONFIG: Record<WalletCategory, CategoryConfig> = {
  agent: {
    label: "Agent wallet",
    badgeClassName: "bg-indigo-500/10 border border-indigo-500/20 text-indigo-500",
  },
  inApp: {
    label: "In-app wallet",
    badgeClassName: "bg-sky-400/10 border border-sky-400/20 text-sky-400",
  },
  eoa: {
    label: "EoA",
    badgeClassName: "bg-emerald-400/10 border border-emerald-400/20 text-emerald-400",
  },
  multiSig: {
    label: "Multi-sig wallet",
    badgeClassName: "bg-lime-400/10 border border-lime-400/20 text-lime-400",
  },
};

const MULTISIG_KEYWORDS = ["multisig", "multi-sig", "multi sig", "safe", "gnosis", "dao"];
const IN_APP_KEYWORDS = [
  "in-app",
  "in app",
  "embedded",
  "smart wallet",
  "aa wallet",
  "account abstraction",
  "custodial",
  "hosted wallet",
  "embedded wallet",
  "managed wallet",
];
const AGENT_KEYWORDS = ["agent", "autopilot", "automated agent"];

const TRUTHY_FLAGS = ["isMultiSig", "isMultisig", "multiSig", "multisig"];
const AGENT_FLAGS = ["agentWallet", "agentManaged", "isAgentWallet"];

const toRecord = (value: UntypedJson): Record<string, UntypedJson> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, UntypedJson>) : null;

const toLower = (value: UntypedJson): string =>
  typeof value === "string" ? value.toLowerCase() : "";

const pickString = (record: Record<string, UntypedJson> | null, keys: string[]): string | null => {
  if (!record) return null;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return null;
};

const hasKeyword = (value: string, keywords: string[]) =>
  keywords.some((keyword) => value.includes(keyword));

const aggregateValues = (values: UntypedJson[]): string[] =>
  values
    .flatMap((value) => {
      if (Array.isArray(value)) {
        return value
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.toLowerCase());
      }
      if (typeof value === "string") {
        return [value.toLowerCase()];
      }
      return [];
    })
    .filter(Boolean);

const hasTruthyFlag = (record: Record<string, UntypedJson> | null, flags: string[]): boolean => {
  if (!record) return false;
  return flags.some((flag) => {
    const value = record[flag];
    if (typeof value === "boolean") return value;
    if (typeof value === "string") return value.toLowerCase() === "true";
    return false;
  });
};

export const getWalletCategoryLabel = (category: WalletCategory): string =>
  CATEGORY_CONFIG[category]?.label ?? CATEGORY_CONFIG.inApp.label;

export function deriveWalletCategory(wallet: WalletPortfolio): WalletCategory {
  const metadata = toRecord(wallet.metadata);
  const provider = toLower(wallet.providerName);
  const walletType = toLower(wallet.walletType);
  const metadataSource = toLower(metadata?.source);
  const metadataKind = toLower(metadata?.kind);
  const metadataCategory = toLower(metadata?.category);
  const metadataLabel = toLower(pickString(metadata, ["label", "name", "title"]) ?? "");

  const aggregatedValues = aggregateValues([
    provider,
    walletType,
    metadataSource,
    metadataKind,
    metadataCategory,
    metadataLabel,
    metadata?.walletType,
    metadata?.walletKind,
    metadata?.walletCategory,
    metadata?.tags,
  ]);

  if (
    hasTruthyFlag(metadata, TRUTHY_FLAGS) ||
    aggregatedValues.some((value) => hasKeyword(value, MULTISIG_KEYWORDS))
  ) {
    return "multiSig";
  }

  if (hasTruthyFlag(metadata, AGENT_FLAGS) || aggregatedValues.some((value) => hasKeyword(value, AGENT_KEYWORDS))) {
    return "agent";
  }

  if (
    aggregatedValues.some((value) => hasKeyword(value, IN_APP_KEYWORDS)) ||
    walletType.includes("embedded") ||
    walletType.includes("smart")
  ) {
    return "inApp";
  }

  return "eoa";
}

type WalletTypeBadgeProps = {
  category: WalletCategory;
  label?: string;
  className?: string;
};

export const WalletTypeBadge = memo(function WalletTypeBadge({
  category,
  label,
  className,
}: WalletTypeBadgeProps) {
  const config = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.inApp;
  return (
    <Badge
      variant="outline"
      className={cn("text-xs font-medium", config.badgeClassName, className)}
    >
      {label ?? config.label}
    </Badge>
  );
});

WalletTypeBadge.displayName = "WalletTypeBadge";
