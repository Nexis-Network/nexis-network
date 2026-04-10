const marketingLabelKeys: Record<string, string> = {
  AI: "ai",
  Apps: "apps",
  Protocol: "protocol",
  Developers: "developers",
  Resources: "resources",
  Pricing: "pricing",
  Token: "token",
  Blog: "blog",
  "Try Nex": "tryNex",
  Learn: "learn",
  Build: "build",
  Programs: "programs",
  Community: "community",
  Company: "company",
  "AI Tools": "aiTools",
  Platform: "platform",
  "Security + Data": "securityData",
  Network: "network",
  Tokenomics: "tokenomics",
  Documentation: "documentation",
  Research: "research",
  Tutorials: "tutorials",
  "API Docs": "apiDocs",
  "API Reference": "apiReference",
  Hackathon: "hackathon",
  "Bug Bounty": "bugBounty",
  GitHub: "github",
  "Nex-T1 API": "nexT1Api",
  "Prompting Guide": "promptingGuide",
  "Supported Chains": "supportedChains",
  "Supported Protocols": "supportedProtocols",
  "List your MCP": "listYourMcp",
  "Agent Marketplace": "agentMarketplace",
  "AI Arena": "aiArena",
  "Agent Builder": "agentBuilder",
  "Agent Launchpad": "agentLaunchpad",
  "Nex Console": "nexConsole",
  "Nex Cloud": "nexCloud",
  "Nex Runtime": "nexRuntime",
  Screener: "screener",
  "Nex Verify": "nexVerify",
  "Nex Grid": "nexGrid",
  Ecosystem: "ecosystem",
  "Nexis AI Chain": "nexisAiChain",
  About: "about",
  "Brand Guidelines": "brandGuidelines",
  Careers: "careers",
  Contact: "contact",
  Twitter: "twitter",
  "X / Twitter": "twitter",
  Discord: "discord",
  Portal: "portal",
};

const appNavLabelKeys: Record<string, string> = {
  Chat: "chat",
  Trade: "trade",
  "Trading Terminal": "tradingTerminal",
  Swap: "swap",
  Liquidity: "liquidity",
  Build: "build",
  "Agent Builder": "agentBuilder",
  "Workflow Builder": "workflowBuilder",
  Agents: "agents",
  "Agent Marketplace": "agentMarketplace",
  "Agent Launchpad": "agentLaunchpad",
  "AI Leaderboard": "aiLeaderboard",
  "My Agents": "myAgents",
  "MCP Directory": "mcpDirectory",
  "Agent Analytics": "agentAnalytics",
  Launch: "launch",
  "AI Launchpad": "aiLaunchpad",
  "Launch Agent": "launchAgent",
  "Manage Launch": "manageLaunch",
  Profile: "profile",
  Portfolio: "portfolio",
  "Agent Wallets": "agentWallets",
  Vesting: "vesting",
  "Nexis Portal": "nexisPortal",
  Settings: "settings",
};

const settingsLabelKeys: Record<string, string> = {
  Overview: "sections.overview",
  Profile: "sections.profile",
  Wallets: "sections.wallets",
  Portfolio: "sections.portfolio",
  Activity: "sections.activity",
  Agents: "sections.agents",
  Automation: "sections.automation",
  Integrations: "sections.integrations",
  Security: "sections.security",
  Workspace: "sections.workspace",
  Developer: "sections.developer",
  Identity: "tabs.identity",
  "Public Profile": "tabs.publicProfile",
  Icons: "tabs.icons",
  Alerts: "tabs.alerts",
  Sessions: "tabs.sessions",
  Embedded: "tabs.embedded",
  Connectors: "tabs.connectors",
  AgentKit: "tabs.agentkit",
  Transactions: "tabs.transactions",
  Watchlist: "tabs.watchlist",
  "Chat History": "tabs.chatHistory",
  Notifications: "tabs.notifications",
  Deployed: "tabs.deployed",
  "Agent Studio": "tabs.agentStudio",
  Artifacts: "tabs.artifacts",
  Strategies: "tabs.strategies",
  Schedules: "tabs.schedules",
  Guardians: "tabs.guardians",
  "Session Keys": "tabs.sessionKeys",
  Paymaster: "tabs.paymaster",
  Connections: "tabs.connections",
  Polymarket: "tabs.polymarket",
  Providers: "tabs.providers",
  MFA: "tabs.mfa",
  Recovery: "tabs.recovery",
  "Risk Controls": "tabs.riskControls",
  Organization: "tabs.organization",
  Projects: "tabs.projects",
  Launchpad: "tabs.launchpad",
  Billing: "tabs.billing",
  Rewards: "tabs.rewards",
  "API Keys": "tabs.apiKeys",
  Cache: "tabs.cache",
};

const settingsDescriptionKeys: Record<string, string> = {
  "Command center, health, recent activity, and quick actions.":
    "descriptions.overview",
  "Identity, public profile, icon choices, and session controls.":
    "descriptions.profile",
  "Nex Wallets, external connectors, and wallet security.":
    "descriptions.wallets",
  "Net worth, holdings, transactions, and watchlist.":
    "descriptions.portfolio",
  "Chat history and notification activity.": "descriptions.activity",
  "Deployed agents, prompt configuration, and artifacts.":
    "descriptions.agents",
  "Strategies, recurring jobs, guardians, and paymaster status.":
    "descriptions.automation",
  "Wallet connectors, providers, exchanges, and Polymarket.":
    "descriptions.integrations",
  "Providers, MFA, recovery, sessions, and risk controls.":
    "descriptions.security",
  "Organization, projects, billing, launchpad, and rewards.":
    "descriptions.workspace",
  "API keys, cache tools, and developer runtime controls.":
    "descriptions.developer",
};

export function translateMarketingLabel(t: (key: string) => string, label: string) {
  const key = marketingLabelKeys[label];
  return key ? t(key) : label;
}

export function translateAppNavLabel(t: (key: string) => string, label: string) {
  const key = appNavLabelKeys[label];
  return key ? t(key) : label;
}

export function translateSettingsLabel(t: (key: string) => string, label: string) {
  const key = settingsLabelKeys[label];
  return key ? t(key) : label;
}

export function translateSettingsDescription(t: (key: string) => string, description: string) {
  const key = settingsDescriptionKeys[description];
  return key ? t(key) : description;
}
