import type { LucideIcon } from "lucide-react";

export type SettingsSectionId =
  | "overview"
  | "profile"
  | "wallets"
  | "portfolio"
  | "activity"
  | "agents"
  | "automation"
  | "integrations"
  | "security"
  | "workspace"
  | "developer";

export type SettingsSubpageId =
  | "overview"
  | "profile"
  | "wallets"
  | "coinbase-agentkit"
  | "solana-agentkit"
  | "portfolio"
  | "messages"
  | "notifications"
  | "agents"
  | "agent"
  | "artifacts"
  | "automation"
  | "connections"
  | "polymarket"
  | "security"
  | "workspace"
  | "api"
  | "developer";

export type SettingsRightRailSlot =
  | "overview"
  | "profile"
  | "finance"
  | "activity"
  | "agents"
  | "integrations"
  | "security"
  | "workspace"
  | "developer"
  | "hidden";

export type SettingsTabConfig = Readonly<{
  id: string;
  label: string;
  href: string;
}>;

export type SettingsSubpageConfig = Readonly<{
  id: SettingsSubpageId;
  label: string;
  title: string;
  href: string;
  description: string;
  tabs: readonly SettingsTabConfig[];
  rightRail: SettingsRightRailSlot;
}>;

export type SettingsSectionConfig = Readonly<{
  id: SettingsSectionId;
  label: string;
  href: string;
  description: string;
  icon: LucideIcon;
  subpages: readonly SettingsSubpageConfig[];
}>;

export type SettingsLegacyRoute = Readonly<{
  pathname: string;
  href: string;
}>;
