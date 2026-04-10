import {
  DocsChecklistPanel,
  DocsEnhancementBlock,
  DocsFeatureGrid,
} from "@/components/docs/docs-enhancement-primitives";

const COPILOT_PATTERNS = [
  {
    label: "Analysis",
    title: "Pull context together across surfaces",
    description:
      "Use Copilot when the answer depends on wallets, portfolios, DAO state, market research, or settings that live in more than one place.",
  },
  {
    label: "Comparison",
    title: "Pressure-test choices before you commit",
    description:
      "Ask it to compare chains, assets, market setups, treasury options, or exchange-linked paths before you move into approvals.",
  },
  {
    label: "Review",
    title: "Turn action requests into checklists",
    description:
      "Copilot is strongest when it restates what the workflow depends on, what is blocked, and what still needs human review.",
  },
  {
    label: "Clarity",
    title: "Make missing context obvious",
    description:
      "If credentials, DAO bindings, or wallet access are missing, the useful outcome is a clearer constraint list, not false confidence.",
  },
] as const;

const COPILOT_PROMPT_CHECKLIST = [
  "Name the wallet, chain, asset, DAO, or market involved so the answer stays scoped.",
  "Say whether you want research, a checklist, a comparison, or a review before any action.",
  "If execution might follow, ask Copilot to restate the dependencies and approvals first.",
] as const;

export function DocsNexCopilot() {
  return (
    <div className="space-y-8">
      <DocsEnhancementBlock
        title="Where Nex Copilot earns its keep"
        description="Use it when the task needs judgment across multiple product surfaces, not just a single isolated screen."
      >
        <DocsFeatureGrid items={[...COPILOT_PATTERNS]} />
      </DocsEnhancementBlock>

      <DocsEnhancementBlock
        title="Prompt structure that leads to better output"
        description="A little more framing produces a materially better review path."
      >
        <DocsChecklistPanel
          title="Prompt with the operating context first"
          items={[...COPILOT_PROMPT_CHECKLIST]}
        />
      </DocsEnhancementBlock>
    </div>
  );
}
