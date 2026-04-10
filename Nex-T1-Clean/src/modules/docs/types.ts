import type { LucideIcon } from "lucide-react";

export type DocsPageSection = {
  id: string;
  title: string;
};

export type DocsPageEnhancementId =
  | "platform-overview"
  | "nex-copilot"
  | "nex-agentkit"
  | "supported-chains"
  | "wallet-infrastructure"
  | "security-model"
  | "example-workflows"
  | "example-prompts"
  | "changelog"
  | "roadmap";

export type DocsPageEnhancementPlacement = "after-intro" | "after-sections";

export type DocsPageRenderMode = "markdown" | "hybrid";

export type DocsPageRecord = {
  id: string;
  href: string;
  slug: string[];
  aliases?: string[][];
  icon: LucideIcon;
  title: string;
  summary: string;
  lastUpdated: string;
  sections: DocsPageSection[];
  markdownPath: string;
  renderMode?: DocsPageRenderMode;
  enhancement?: DocsPageEnhancementId;
  enhancementPlacement?: DocsPageEnhancementPlacement;
};
