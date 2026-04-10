import type { ReadonlyURLSearchParams } from "next/navigation";
import {
  Bot,
  BriefcaseBusiness,
  Code2,
  LayoutDashboard,
  MessagesSquare,
  PieChart,
  PlugZap,
  Shield,
  UserRound,
  Wallet2,
  Workflow,
} from "lucide-react";

import type { SettingsSectionConfig, SettingsSectionId, SettingsSubpageConfig } from "./types";

const profileTabs = [
  { id: "identity", label: "Identity", href: "/settings/profile?view=identity" },
  { id: "public", label: "Public Profile", href: "/settings/profile?view=public" },
  { id: "icons", label: "Icons", href: "/settings/profile?view=icons" },
  { id: "alerts", label: "Alerts", href: "/settings/profile?view=alerts" },
  { id: "sessions", label: "Sessions", href: "/settings/profile?view=sessions" },
] as const;

const walletsTabs = [
  { id: "overview", label: "Embedded", href: "/settings/wallets?tab=overview" },
  { id: "connectors", label: "Connectors", href: "/settings/wallets?view=connectors" },
  { id: "agentkit", label: "Agent Wallets", href: "/settings/wallets?view=agentkit" },
  { id: "coinbase-agentkit", label: "Coinbase AgentKit", href: "/settings/coinbase-agentkit" },
  { id: "solana-agentkit", label: "Solana AgentKit", href: "/settings/solana-agentkit" },
  { id: "security", label: "Security", href: "/settings/wallets?tab=security" },
] as const;

const portfolioTabs = [
  { id: "overview", label: "Overview", href: "/settings/portfolio?view=overview" },
  { id: "transactions", label: "Transactions", href: "/settings/portfolio?view=transactions" },
  { id: "watchlist", label: "Watchlist", href: "/settings/portfolio?view=watchlist" },
] as const;

const activityTabs = [
  { id: "messages", label: "Chat History", href: "/settings/messages" },
  { id: "notifications", label: "Notifications", href: "/settings/notifications" },
] as const;

const agentTabs = [
  { id: "agents", label: "Deployed", href: "/settings/agents" },
  { id: "agent", label: "Agent Studio", href: "/settings/agent" },
  { id: "artifacts", label: "Artifacts", href: "/settings/artifacts" },
] as const;

const automationTabs = [
  { id: "strategies", label: "Strategies", href: "/settings/automation?view=strategies" },
  { id: "schedules", label: "Schedules", href: "/settings/automation?view=schedules" },
  { id: "guardians", label: "Guardians", href: "/settings/automation?view=guardians" },
  { id: "session-keys", label: "Session Keys", href: "/settings/automation?view=session-keys" },
  { id: "paymaster", label: "Paymaster", href: "/settings/automation?view=paymaster" },
] as const;

const integrationTabs = [
  { id: "connections", label: "Connections", href: "/settings/connections" },
  { id: "polymarket", label: "Polymarket", href: "/settings/polymarket" },
] as const;

const securityTabs = [
  { id: "providers", label: "Providers", href: "/settings/security?view=providers" },
  { id: "mfa", label: "MFA", href: "/settings/security?view=mfa" },
  { id: "recovery", label: "Recovery", href: "/settings/security?view=recovery" },
  { id: "sessions", label: "Sessions", href: "/settings/security?view=sessions" },
  { id: "risk", label: "Risk Controls", href: "/settings/security?view=risk" },
] as const;

const workspaceTabs = [
  { id: "organization", label: "Organization", href: "/settings/workspace?view=organization" },
  { id: "projects", label: "Projects", href: "/settings/workspace?view=projects" },
  { id: "launchpad", label: "Launchpad", href: "/settings/workspace?view=launchpad" },
  { id: "billing", label: "Billing", href: "/settings/workspace?view=billing" },
  { id: "rewards", label: "Rewards", href: "/settings/workspace?view=rewards&subview=invitations" },
] as const;

const developerTabs = [
  { id: "api-overview", label: "Overview", href: "/settings/api" },
  { id: "api-products", label: "API Products", href: "/settings/developer?view=api-products" },
  { id: "api-usage", label: "Usage & Billing", href: "/settings/developer?view=api-usage" },
  { id: "api-logs", label: "Request Logs", href: "/settings/developer?view=api-logs" },
  { id: "api-keys", label: "API Keys", href: "/settings/developer?view=api-keys" },
  { id: "cache", label: "Cache", href: "/settings/developer?view=cache" },
] as const;

export const settingsSectionRegistry: readonly SettingsSectionConfig[] = [
  {
    id: "overview",
    label: "Overview",
    href: "/settings",
    description: "Command center, health, recent activity, and quick actions.",
    icon: LayoutDashboard,
    subpages: [
      {
        id: "overview",
        label: "Overview",
        title: "Control Center",
        href: "/settings",
        description: "Wallet health, tasks, conversations, and artifacts in one control center.",
        tabs: [],
        rightRail: "overview",
      },
    ],
  },
  {
    id: "profile",
    label: "Profile",
    href: "/settings/profile",
    description: "Identity, public profile, icon choices, and session controls.",
    icon: UserRound,
    subpages: [
      {
        id: "profile",
        label: "Profile",
        title: "Profile",
        href: "/settings/profile",
        description: "Identity, public profile, alerts, icon selection, and sessions.",
        tabs: profileTabs,
        rightRail: "profile",
      },
    ],
  },
  {
    id: "wallets",
    label: "Wallets",
    href: "/settings/wallets",
    description: "Nex Wallets, external connectors, and wallet security.",
    icon: Wallet2,
    subpages: [
      {
        id: "wallets",
        label: "Wallets",
        title: "Wallets",
        href: "/settings/wallets",
        description: "Nex Wallet (EVM), Nex Wallet (SOL), connectors, Agent Wallets, AgentKit surfaces, and wallet security.",
        tabs: walletsTabs,
        rightRail: "finance",
      },
      {
        id: "coinbase-agentkit",
        label: "Coinbase AgentKit",
        title: "Coinbase AgentKit",
        href: "/settings/coinbase-agentkit",
        description: "Embedded EVM wallet execution, positions, deployments, and automation powered by Coinbase AgentKit.",
        tabs: walletsTabs,
        rightRail: "finance",
      },
      {
        id: "solana-agentkit",
        label: "Solana AgentKit",
        title: "Solana AgentKit",
        href: "/settings/solana-agentkit",
        description: "Balances, positions, deployment history, and autonomous Solana AgentKit controls.",
        tabs: walletsTabs,
        rightRail: "finance",
      },
    ],
  },
  {
    id: "portfolio",
    label: "Portfolio",
    href: "/settings/portfolio",
    description: "Net worth, holdings, transactions, and watchlist.",
    icon: PieChart,
    subpages: [
      {
        id: "portfolio",
        label: "Portfolio",
        title: "Portfolio",
        href: "/settings/portfolio",
        description: "Aggregated holdings, transaction history, and watchlist management.",
        tabs: portfolioTabs,
        rightRail: "finance",
      },
    ],
  },
  {
    id: "activity",
    label: "Activity",
    href: "/settings/messages",
    description: "Chat history and notification activity.",
    icon: MessagesSquare,
    subpages: [
      {
        id: "messages",
        label: "Messages",
        title: "Chat History",
        href: "/settings/messages",
        description: "Conversation history across assistants and deployed agents.",
        tabs: activityTabs,
        rightRail: "activity",
      },
      {
        id: "notifications",
        label: "Notifications",
        title: "Notifications",
        href: "/settings/notifications",
        description: "Social, execution, and platform notifications.",
        tabs: activityTabs,
        rightRail: "activity",
      },
    ],
  },
  {
    id: "agents",
    label: "Agents",
    href: "/settings/agents",
    description: "Deployed agents, prompt configuration, and artifacts.",
    icon: Bot,
    subpages: [
      {
        id: "agents",
        label: "Agents",
        title: "Agents",
        href: "/settings/agents",
        description: "Deployed agents, marketplace coverage, and deployment status.",
        tabs: agentTabs,
        rightRail: "agents",
      },
      {
        id: "agent",
        label: "Agent Studio",
        title: "Agent Studio",
        href: "/settings/agent",
        description: "Edit system prompts, voices, languages, and model defaults.",
        tabs: agentTabs,
        rightRail: "hidden",
      },
      {
        id: "artifacts",
        label: "Artifacts",
        title: "Artifacts",
        href: "/settings/artifacts",
        description: "Search user artifacts, previews, and generation history.",
        tabs: agentTabs,
        rightRail: "agents",
      },
    ],
  },
  {
    id: "automation",
    label: "Automation",
    href: "/settings/automation",
    description: "Strategies, recurring jobs, guardians, and paymaster status.",
    icon: Workflow,
    subpages: [
      {
        id: "automation",
        label: "Automation",
        title: "Automation",
        href: "/settings/automation",
        description: "Task management, recurring jobs, guardians, and account abstraction controls.",
        tabs: automationTabs,
        rightRail: "agents",
      },
    ],
  },
  {
    id: "integrations",
    label: "Integrations",
    href: "/settings/connections",
    description: "Wallet connectors, providers, exchanges, and Polymarket.",
    icon: PlugZap,
    subpages: [
      {
        id: "connections",
        label: "Connections",
        title: "Connections",
        href: "/settings/connections",
        description: "OAuth providers, integration providers, exchange links, and connector health.",
        tabs: integrationTabs,
        rightRail: "integrations",
      },
      {
        id: "polymarket",
        label: "Polymarket",
        title: "Polymarket",
        href: "/settings/polymarket",
        description: "Credential management, geoblock state, and market connectivity.",
        tabs: integrationTabs,
        rightRail: "integrations",
      },
    ],
  },
  {
    id: "security",
    label: "Security",
    href: "/settings/security",
    description: "Providers, MFA, recovery, sessions, and risk controls.",
    icon: Shield,
    subpages: [
      {
        id: "security",
        label: "Security",
        title: "Security",
        href: "/settings/security",
        description: "Account providers, MFA, passkeys, recovery, active sessions, and spend controls.",
        tabs: securityTabs,
        rightRail: "security",
      },
    ],
  },
  {
    id: "workspace",
    label: "Workspace",
    href: "/settings/workspace",
    description: "Organization, projects, billing, launchpad, and rewards.",
    icon: BriefcaseBusiness,
    subpages: [
      {
        id: "workspace",
        label: "Workspace",
        title: "Workspace",
        href: "/settings/workspace",
        description: "Organization operations, launchpad entry points, billing, and referral rewards.",
        tabs: workspaceTabs,
        rightRail: "workspace",
      },
    ],
  },
  {
    id: "developer",
    label: "Developer",
    href: "/settings/developer",
    description: "Public API products, keys, billing, request logs, and cache controls.",
    icon: Code2,
    subpages: [
      {
        id: "api",
        label: "API Console",
        title: "API Console",
        href: "/settings/api",
        description: "Public API plans, usage analytics, spend tracking, request insights, and key management in one view.",
        tabs: developerTabs,
        rightRail: "developer",
      },
      {
        id: "developer",
        label: "Developer",
        title: "Developer",
        href: "/settings/developer",
        description: "Public API credentials, product docs, billing, logs, and cache operations for power users and workspace admins.",
        tabs: developerTabs,
        rightRail: "developer",
      },
    ],
  },
] as const;

export const settingsSubpageRegistry: readonly SettingsSubpageConfig[] = settingsSectionRegistry.flatMap(
  (section) => section.subpages,
);

export function normalizeSettingsPathname(pathname: string): string {
  const withLeadingSlash = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const normalized = withLeadingSlash.replace(/\/+$/, "");
  return normalized.length > 0 ? normalized : "/settings";
}

export function getSettingsSectionById(sectionId: SettingsSectionId): SettingsSectionConfig {
  return settingsSectionRegistry.find((section) => section.id === sectionId) ?? settingsSectionRegistry[0];
}

export function getSettingsSectionByPathname(pathname: string): SettingsSectionConfig {
  return getSettingsSectionById(getSettingsSubpageByPathname(pathname).sectionId);
}

export function getSettingsSubpageByPathname(pathname: string): SettingsSubpageConfig & { sectionId: SettingsSectionId } {
  const normalized = normalizeSettingsPathname(pathname);
  for (const section of settingsSectionRegistry) {
    const match = section.subpages.find((subpage) => normalizeSettingsPathname(subpage.href) === normalized);
    if (match) {
      return { ...match, sectionId: section.id };
    }
  }

  return {
    ...settingsSectionRegistry[0].subpages[0],
    sectionId: settingsSectionRegistry[0].id,
  };
}

type SearchParamsLike =
  | ReadonlyURLSearchParams
  | URLSearchParams
  | Record<string, string | string[] | undefined>
  | null
  | undefined;

export function readSettingsSearchParam(searchParams: SearchParamsLike, key: string): string | null {
  if (!searchParams) return null;
  if (hasSearchParamsGetter(searchParams)) {
    const value = searchParams.get(key);
    return typeof value === "string" && value.length > 0 ? value : null;
  }

  const value = searchParams[key];
  if (Array.isArray(value)) {
    return typeof value[0] === "string" && value[0].length > 0 ? value[0] : null;
  }
  return typeof value === "string" && value.length > 0 ? value : null;
}

function hasSearchParamsGetter(
  searchParams: SearchParamsLike,
): searchParams is URLSearchParams | ReadonlyURLSearchParams {
  return Boolean(searchParams && "get" in searchParams && typeof searchParams.get === "function");
}

function parseSettingsHref(href: string) {
  const url = new URL(href, "https://nex.local");
  return {
    pathname: normalizeSettingsPathname(url.pathname),
    params: Array.from(url.searchParams.entries()),
  };
}

export function isSettingsHrefActive(href: string, pathname: string, searchParams: SearchParamsLike): boolean {
  const currentPath = normalizeSettingsPathname(pathname);
  const target = parseSettingsHref(href);

  if (target.pathname !== currentPath) {
    return false;
  }

  if (target.params.length === 0) {
    return true;
  }

  return target.params.every(([key, value]) => readSettingsSearchParam(searchParams, key) === value);
}
