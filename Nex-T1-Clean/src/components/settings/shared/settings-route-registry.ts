import type { LucideIcon } from "lucide-react";
import {
  Bot,
  Briefcase,
  ChartCandlestick,
  Home,
  User,
  Users,
  Wrench,
} from "lucide-react";

export type SettingsHubId = "overview" | "account" | "social" | "ai" | "trading" | "workspace" | "developer";

export type SettingsTabId =
  | "api"
  | "identity"
  | "security"
  | "connections"
  | "wallets"
  | "portfolio"
  | "profile"
  | "explore"
  | "messages"
  | "notifications"
  | "agents"
  | "agent-preferences"
  | "agent-wallets"
  | "artifacts"
  | "automation"
  | "assistant"
  | "knowledge"
  | "memory"
  | "exchanges"
  | "polymarket"
  | "agent-risk"
  | "organization"
  | "projects"
  | "launchpad"
  | "billing"
  | "rewards"
  | "api-products"
  | "api-usage"
  | "api-logs"
  | "api-keys"
  | "cache";

export type SettingsTabConfig = {
  id: SettingsTabId;
  label: string;
  href: string;
};

export type SettingsRegistryItem = {
  id: SettingsHubId;
  label: string;
  href: string;
  description: string;
  icon: LucideIcon;
  tabs: SettingsTabConfig[];
};

export type LegacySettingsRouteMap = Record<string, string>;

export const settingsRouteRegistry: SettingsRegistryItem[] = [
  {
    id: "overview",
    label: "Overview",
    href: "/settings",
    description: "Control center and status snapshots.",
    icon: Home,
    tabs: [],
  },
  {
    id: "account",
    label: "Account",
    href: "/settings/account",
    description: "Identity, security, wallets, and profile controls.",
    icon: User,
    tabs: [
      { id: "identity", label: "Identity", href: "/settings/account?tab=identity" },
      { id: "security", label: "Security", href: "/settings/account?tab=security" },
      { id: "connections", label: "Connections", href: "/settings/account?tab=connections" },
      { id: "wallets", label: "Wallets", href: "/settings/account?tab=wallets" },
      { id: "portfolio", label: "Portfolio", href: "/settings/account?tab=portfolio" },
    ],
  },
  {
    id: "social",
    label: "Social",
    href: "/settings/social",
    description: "Profile, discovery, messages, and notifications.",
    icon: Users,
    tabs: [
      { id: "profile", label: "Profile", href: "/settings/social?tab=profile" },
      { id: "explore", label: "Explore", href: "/settings/social?tab=explore" },
      { id: "messages", label: "Messages", href: "/settings/social?tab=messages" },
      { id: "notifications", label: "Notifications", href: "/settings/social?tab=notifications" },
    ],
  },
  {
    id: "ai",
    label: "AI",
    href: "/settings/ai",
    description: "Agents, artifacts, automation, and assistant controls.",
    icon: Bot,
    tabs: [
      { id: "agents", label: "Agents", href: "/settings/ai?tab=agents" },
      { id: "agent-preferences", label: "Agent Preferences", href: "/settings/ai?tab=agent-preferences" },
      { id: "agent-wallets", label: "Agent Wallets", href: "/settings/ai?tab=agent-wallets" },
      { id: "artifacts", label: "Artifacts", href: "/settings/ai?tab=artifacts" },
      { id: "automation", label: "Automation", href: "/settings/ai?tab=automation" },
      { id: "assistant", label: "Assistant", href: "/settings/ai?tab=assistant" },
      { id: "knowledge", label: "Knowledge", href: "/settings/ai?tab=knowledge" },
      { id: "memory", label: "Memory", href: "/settings/ai?tab=memory" },
    ],
  },
  {
    id: "trading",
    label: "Trading",
    href: "/settings/trading",
    description: "Exchange, Polymarket, and agent risk operations.",
    icon: ChartCandlestick,
    tabs: [
      { id: "exchanges", label: "Exchanges", href: "/settings/trading?tab=exchanges" },
      { id: "polymarket", label: "Polymarket", href: "/settings/trading?tab=polymarket" },
      { id: "agent-risk", label: "Agent Risk", href: "/settings/trading?tab=agent-risk" },
    ],
  },
  {
    id: "workspace",
    label: "Workspace",
    href: "/settings/workspace",
    description: "Organization, projects, launchpad, billing, and rewards.",
    icon: Briefcase,
    tabs: [
      { id: "organization", label: "Organization", href: "/settings/workspace?tab=organization" },
      { id: "projects", label: "Projects", href: "/settings/workspace?tab=projects" },
      { id: "launchpad", label: "Launchpad", href: "/settings/workspace?tab=launchpad" },
      { id: "billing", label: "Billing", href: "/settings/workspace?tab=billing" },
      { id: "rewards", label: "Rewards", href: "/settings/workspace?tab=rewards" },
    ],
  },
  {
    id: "developer",
    label: "Developer",
    href: "/settings/developer",
    description: "Public API products, keys, usage, logs, and caching operations.",
    icon: Wrench,
    tabs: [
      { id: "api", label: "API Console", href: "/settings/api" },
      { id: "api-keys", label: "API Keys", href: "/settings/developer?tab=api-keys" },
      { id: "api-products", label: "API Products", href: "/settings/developer?tab=api-products" },
      { id: "api-usage", label: "Usage & Billing", href: "/settings/developer?tab=api-usage" },
      { id: "api-logs", label: "Request Logs", href: "/settings/developer?tab=api-logs" },
      { id: "cache", label: "Cache", href: "/settings/developer?tab=cache" },
    ],
  },
];

export const legacySettingsRouteMap: LegacySettingsRouteMap = {
  "/settings/profile": "/settings/social?tab=profile",
  "/settings/explore": "/settings/social?tab=explore",
  "/settings/messages": "/settings/social?tab=messages",
  "/settings/notifications": "/settings/social?tab=notifications",
  "/settings/account-details": "/settings/account?tab=identity",
  "/settings/security": "/settings/account?tab=security",
  "/settings/connections": "/settings/account?tab=connections",
  "/settings/wallets": "/settings/account?tab=wallets",
  "/settings/portfolio": "/settings/account?tab=portfolio",
  "/settings/agents": "/settings/ai?tab=agents",
  "/settings/agent": "/settings/ai?tab=agent-preferences",
  "/settings/agent-wallets": "/settings/ai?tab=agent-wallets",
  "/settings/artifacts": "/settings/ai?tab=artifacts",
  "/settings/automation": "/settings/ai?tab=automation",
  "/settings/assistant": "/settings/ai?tab=assistant",
  "/settings/memory": "/settings/ai?tab=memory",
  "/settings/documents": "/settings/ai?tab=knowledge&view=documents",
  "/settings/knowledge-base": "/settings/ai?tab=knowledge&view=pipeline",
  "/settings/polymarket": "/settings/trading?tab=polymarket",
  "/settings/agent-spend": "/settings/trading?tab=agent-risk",
  "/settings/organization": "/settings/workspace?tab=organization",
  "/settings/projects": "/settings/workspace?tab=projects",
  "/settings/billing": "/settings/workspace?tab=billing",
  "/settings/invitations": "/settings/workspace?tab=rewards&view=invitations",
  "/settings/earn": "/settings/workspace?tab=rewards&view=earn",
  "/settings/quests": "/settings/workspace?tab=rewards&view=quests",
  "/settings/api": "/settings/api",
  "/settings/developer/api-keys": "/settings/developer?tab=api-keys",
  "/settings/developer/products": "/settings/developer?tab=api-products",
  "/settings/developer/usage": "/settings/developer?tab=api-usage",
  "/settings/developer/logs": "/settings/developer?tab=api-logs",
  "/settings/developer/cache": "/settings/developer?tab=cache",
  "/settings/support": "/settings/ai?tab=assistant",
};

export function normalizeSettingsPath(pathname: string): string {
  return pathname.replace(/\/$/, "") || "/settings";
}

export function getSettingsHubByPathname(pathname: string): SettingsRegistryItem {
  const normalized = normalizeSettingsPath(pathname);
  if (normalized.startsWith("/settings/api")) {
    return getSettingsHubById("developer");
  }
  const matched = settingsRouteRegistry.find((item) => item.href !== "/settings" && normalized.startsWith(item.href));
  return matched ?? settingsRouteRegistry[0];
}

export function getSettingsHubById(hubId: SettingsHubId): SettingsRegistryItem {
  return settingsRouteRegistry.find((item) => item.id === hubId) ?? settingsRouteRegistry[0];
}

export function getSettingsTabOrDefault(hubId: SettingsHubId, tabParam: string | null | undefined): SettingsTabConfig | null {
  const hub = getSettingsHubById(hubId);
  if (!hub.tabs.length) return null;

  const normalizedTab = (tabParam ?? "").trim().toLowerCase();
  const matched = hub.tabs.find((tab) => tab.id === normalizedTab);
  return matched ?? hub.tabs[0];
}

export function resolveLegacySettingsRoute(pathname: string): string | null {
  return legacySettingsRouteMap[normalizeSettingsPath(pathname)] ?? null;
}

export const settingsHubIconMap = {
  overview: Home,
  account: User,
  social: Users,
  ai: Bot,
  trading: ChartCandlestick,
  workspace: Briefcase,
  developer: Wrench,
} as const;
