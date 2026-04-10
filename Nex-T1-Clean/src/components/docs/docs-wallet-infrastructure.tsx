import { DocsCallout } from "@/components/docs/docs-primitives";
import {
  DocsChecklistPanel,
  DocsEnhancementBlock,
  DocsFeatureGrid,
} from "@/components/docs/docs-enhancement-primitives";

const WALLET_CONTEXTS = [
  {
    label: "Connected wallet",
    title: "Direct wallet context for balances and approvals",
    description:
      "Use this when you want the wallet you already control to anchor research, asset review, and any approval-aware follow-up.",
  },
  {
    label: "Managed wallet",
    title: "Integrated wallet experience when supported",
    description:
      "Where the product offers a managed path, Coinbase Embedded Wallets can keep the flow inside Nex-T1 while still depending on the right account context.",
  },
  {
    label: "Linked accounts",
    title: "Venue context stays separate from wallet context",
    description:
      "Exchange-linked workflows can inform research and execution planning, but they do not replace the need to confirm which wallet or signer is actually in scope.",
  },
] as const;

const PRE_SIGN_CHECKS = [
  "Confirm the exact wallet or treasury signer that will authorize the step.",
  "Recheck the chain, asset, amount, and destination before approving anything sensitive.",
  "Make sure the funds or permissions you expect are actually available in that context.",
  "If the explanation is vague, ask for a restatement or a checklist before you continue.",
] as const;

export function DocsWalletInfrastructure() {
  return (
    <div className="space-y-8">
      <DocsEnhancementBlock
        title="The account contexts users actually work with"
        description="Wallet clarity matters because research can span multiple accounts while approvals still need one explicit authority."
      >
        <DocsFeatureGrid items={[...WALLET_CONTEXTS]} />
      </DocsEnhancementBlock>

      <DocsEnhancementBlock
        title="The review path before you sign"
        description="Treat every sensitive action like a context check first and a signature second."
      >
        <DocsChecklistPanel title="Pre-sign review" items={[...PRE_SIGN_CHECKS]} />
        <DocsCallout title="When to stop and ask for clarity">
          <p>
            Stop at the review stage when the wallet, signer, destination, or chain is still
            ambiguous. A better restatement is safer than pushing through uncertainty.
          </p>
        </DocsCallout>
      </DocsEnhancementBlock>
    </div>
  );
}
