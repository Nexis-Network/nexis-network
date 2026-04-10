import {
  BookOpen,
  Bot,
  Building2,
  Compass,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Workflow,
  Wrench,
} from "lucide-react";

import type {
  AudienceBlueprint,
  CategoryDefinition,
} from "@/modules/docs/sidebar-navigation.types";

export const CATEGORY_DEFINITIONS: Record<string, CategoryDefinition> = {
  "start-here": {
    title: "Start Here",
    description: "Foundational docs to orient new readers quickly.",
    icon: BookOpen,
    pageIds: ["platform-overview", "faq"],
  },
  "workspace-guides": {
    title: "Workspace Guides",
    description: "Core product flows, wallets, and chain context.",
    icon: LayoutDashboard,
    pageIds: ["nex-copilot", "wallet-infrastructure", "supported-chains"],
  },
  builders: {
    title: "Builders & Agents",
    description: "AgentKit, execution flows, and developer-facing automation.",
    icon: Bot,
    pageIds: ["nex-agentkit", "ai-agents-automation"],
  },
  "dao-operations": {
    title: "DAO Operations",
    description: "Create workspaces, govern treasuries, and coordinate teams.",
    icon: Building2,
    pageIds: ["dao-creation", "dao-automation-governance"],
  },
  markets: {
    title: "Markets & Trading",
    description: "Research, prediction markets, and connected exchange flows.",
    icon: TrendingUp,
    pageIds: [
      "trading-market-research",
      "prediction-markets",
      "cex-integrations",
    ],
  },
  playbooks: {
    title: "Playbooks",
    description: "Examples and prompt patterns for real workflows.",
    icon: Workflow,
    pageIds: ["example-workflows", "example-prompts"],
  },
  "safe-operations": {
    title: "Safe Operations",
    description: "Guardrails, approval habits, and security expectations.",
    icon: ShieldCheck,
    pageIds: ["security-model", "best-practices"],
  },
  updates: {
    title: "Updates",
    description: "Release history and roadmap context.",
    icon: Sparkles,
    pageIds: ["changelog", "roadmap"],
  },
};

export const AUDIENCE_BLUEPRINTS: AudienceBlueprint[] = [
  {
    id: "users",
    title: "Users",
    description: "Product guides for day-to-day operators.",
    icon: Compass,
    groups: [
      { id: "foundation", title: "Foundation", categoryIds: ["start-here", "workspace-guides"] },
      { id: "operate", title: "Operate", categoryIds: ["safe-operations", "playbooks"] },
      { id: "follow", title: "Follow Product", categoryIds: ["updates"] },
    ],
  },
  {
    id: "developers",
    title: "Developers",
    description: "Integration and automation references.",
    icon: Wrench,
    groups: [
      { id: "foundation", title: "Foundation", categoryIds: ["start-here", "workspace-guides"] },
      { id: "build", title: "Build", categoryIds: ["builders", "playbooks"] },
      { id: "operate", title: "Operate", categoryIds: ["safe-operations", "updates"] },
    ],
  },
  {
    id: "daos",
    title: "DAOs",
    description: "Governance, treasury, and coordination docs.",
    icon: Building2,
    groups: [
      { id: "foundation", title: "Foundation", categoryIds: ["start-here", "dao-operations"] },
      { id: "operate", title: "Operate", categoryIds: ["workspace-guides", "playbooks"] },
      { id: "trust", title: "Trust", categoryIds: ["safe-operations", "updates"] },
    ],
  },
  {
    id: "traders",
    title: "Traders",
    description: "Research, execution, and market-ops docs.",
    icon: TrendingUp,
    groups: [
      { id: "foundation", title: "Foundation", categoryIds: ["start-here", "markets"] },
      { id: "execute", title: "Execute", categoryIds: ["workspace-guides", "playbooks"] },
      { id: "trust", title: "Trust", categoryIds: ["safe-operations", "updates"] },
    ],
  },
];
