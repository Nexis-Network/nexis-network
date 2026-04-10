import {
  DocsEnhancementBlock,
  DocsWorkflowGrid,
} from "@/components/docs/docs-enhancement-primitives";

const WORKFLOW_PREVIEWS = [
  {
    href: "/portfolio",
    surface: "/portfolio",
    title: "Portfolio review",
    summary: "Start with holdings and balances, then move into research and a disciplined rebalance plan.",
    steps: [
      "Inspect concentrations, idle capital, and recent activity.",
      "Ask for a research brief or rebalance proposal without assuming execution.",
      "Verify wallet context, balances, and chain before acting.",
    ],
  },
  {
    href: "/daos",
    surface: "/daos",
    title: "DAO operations",
    summary: "Use the workspace as the source of truth for setup, proposal review, and treasury preparation.",
    steps: [
      "Confirm workspace bindings, governance model, and signer requirements.",
      "Generate a proposal memo or treasury action review with approval dependencies.",
      "Keep the final treasury or governance step explicitly human-approved.",
    ],
  },
  {
    href: "/app",
    surface: "/app",
    title: "Market and automation",
    summary: "Research first, then stage monitoring or automation only when dependencies are fully visible.",
    steps: [
      "Compare market setups, venue context, or Polymarket research before execution.",
      "Check whether exchange links, credentials, or a specific wallet are required.",
      "Start with read-first monitoring and add bounded task execution later.",
    ],
  },
] as const;

export function DocsExampleWorkflows() {
  return (
    <DocsEnhancementBlock
      title="Quick previews of the core operating patterns"
      description="These cards show how the main workflows usually start, what context they depend on, and where the human checkpoint belongs."
    >
      <DocsWorkflowGrid items={[...WORKFLOW_PREVIEWS]} />
    </DocsEnhancementBlock>
  );
}
