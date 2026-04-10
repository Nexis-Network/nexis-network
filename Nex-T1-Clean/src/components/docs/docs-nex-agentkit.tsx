import {
  DocsChecklistPanel,
  DocsEnhancementBlock,
  DocsFeatureGrid,
} from "@/components/docs/docs-enhancement-primitives";

const AGENTKIT_WORKFLOWS = [
  {
    label: "Wallets",
    title: "Portfolio and account-aware research",
    description:
      "Use Nex AgentKit when you need wallet-aware analysis, balance context, and chain-specific review before taking the next step.",
  },
  {
    label: "DAOs",
    title: "Governance and treasury coordination",
    description:
      "It supports DAO setup, governance review, treasury planning, and signer-aware preparation where the workspace bindings already exist.",
  },
  {
    label: "Markets",
    title: "Trading and market-prep workflows",
    description:
      "That includes market research, venue comparison, prediction-market prep, and execution planning that still respects credentials and approvals.",
  },
  {
    label: "Automation",
    title: "Settings-governed task execution",
    description:
      "Automation stays bounded by task definitions, approval rules, connected accounts, and whatever the current workflow actually allows.",
  },
] as const;

const AGENTKIT_BOUNDARIES = [
  "It does not remove the need to confirm wallet ownership, chain context, or signer authority.",
  "Capabilities that depend on exchange links, Polymarket credentials, or DAO bindings only work when that setup is already in place.",
  "High-impact actions should still keep a human review step even when the research or prep work was heavily assisted.",
] as const;

export function DocsNexAgentKit() {
  return (
    <div className="space-y-8">
      <DocsEnhancementBlock
        title="The workflow families Nex AgentKit brings together"
        description="Think of it as the user-facing capability layer behind the main product experiences, not as a separate tool you have to learn."
      >
        <DocsFeatureGrid items={[...AGENTKIT_WORKFLOWS]} />
      </DocsEnhancementBlock>

      <DocsEnhancementBlock
        title="What keeps it controlled"
        description="Capability breadth only matters if users can still tell what is allowed, what is blocked, and what still needs approval."
      >
        <DocsChecklistPanel
          title="Keep these boundaries explicit"
          items={[...AGENTKIT_BOUNDARIES]}
        />
      </DocsEnhancementBlock>
    </div>
  );
}
