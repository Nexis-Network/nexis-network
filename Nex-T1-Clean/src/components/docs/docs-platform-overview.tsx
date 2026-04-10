import {
  DocsEnhancementBlock,
  DocsFeatureGrid,
  DocsRouteGrid,
} from "@/components/docs/docs-enhancement-primitives";

const PLATFORM_CAPABILITIES = [
  {
    label: "Research",
    title: "Inspect positions before you move capital",
    description:
      "Work from wallet, portfolio, market, and chain context so a decision starts with a clearer read of the situation.",
  },
  {
    label: "Operations",
    title: "Coordinate DAO and treasury work with more context",
    description:
      "Move from setup questions into proposal review, treasury planning, and signer-aware workflows without losing track of approvals.",
  },
  {
    label: "Execution prep",
    title: "Compare on-chain and venue-linked paths before acting",
    description:
      "Use market, exchange, and prediction-market context to plan the next step before you commit to a live action.",
  },
  {
    label: "Automation",
    title: "Roll out monitoring and recurring tasks in bounded stages",
    description:
      "Start with read-first monitoring, then add tighter scopes and approval checkpoints where the workflow actually supports them.",
  },
] as const;

const PLATFORM_SURFACES = [
  {
    href: "/app",
    title: "Conversational workspace",
    contextLabel: "/app",
    description: "Best for cross-surface questions, research synthesis, approvals prep, and turning a loose idea into a plan.",
  },
  {
    href: "/portfolio",
    title: "Portfolio and wallet views",
    contextLabel: "/portfolio",
    description: "Use this when you want holdings, balances, recent activity, and wallet-level context before making a decision.",
  },
  {
    href: "/daos",
    title: "DAO workspaces",
    contextLabel: "/daos",
    description: "Open this when governance, treasury review, DAO setup, or signer-aware operations are the center of the task.",
  },
  {
    href: "/settings",
    title: "Settings and access control",
    contextLabel: "/settings",
    description: "Manage wallet security, automation settings, exchange links, and Polymarket access when a workflow depends on setup.",
  },
] as const;

export function DocsPlatformOverview() {
  return (
    <div className="space-y-8">
      <DocsEnhancementBlock
        title="What teams actually use Nex-T1 for"
        description="These are the common operating lanes that show up across the rest of the docs."
      >
        <DocsFeatureGrid items={[...PLATFORM_CAPABILITIES]} />
      </DocsEnhancementBlock>

      <DocsEnhancementBlock
        title="Start in the right product surface"
        description="The docs read faster when you map each job to the area that already owns it in the app."
      >
        <DocsRouteGrid items={[...PLATFORM_SURFACES]} />
      </DocsEnhancementBlock>
    </div>
  );
}
