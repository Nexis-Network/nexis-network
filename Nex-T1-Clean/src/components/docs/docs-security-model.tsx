import {
  DocsChecklistPanel,
  DocsEnhancementBlock,
  DocsFeatureGrid,
} from "@/components/docs/docs-enhancement-primitives";

const SECURITY_CONTROLS = [
  {
    label: "Identity",
    title: "The signed-in user should match the decision-maker",
    description:
      "Account protection only matters if the authenticated session still reflects the person who should be authorizing the workflow.",
  },
  {
    label: "Session",
    title: "Session continuity matters during high-impact work",
    description:
      "When you switch contexts or step away, reconfirm who is signed in before you approve wallet, treasury, or credential-sensitive operations.",
  },
  {
    label: "Wallets",
    title: "Wallet and treasury scope must stay explicit",
    description:
      "Research can span multiple accounts, but sensitive actions still need one clear wallet, signer, or treasury authority in scope.",
  },
  {
    label: "Credentials",
    title: "Stored integrations should stay narrowly permissioned",
    description:
      "Exchange links and prediction-market credentials should only expose the minimum access needed for the workflow you are actually running.",
  },
] as const;

const MANUAL_REVIEW_AREAS = [
  "Any step that moves funds or changes position size.",
  "Treasury operations that affect signer authority or governance state.",
  "Changes to exchange permissions, sensitive wallet settings, or credential-linked access.",
  "Automations that would act on live capital without a clear review checkpoint.",
] as const;

export function DocsSecurityModel() {
  return (
    <div className="space-y-8">
      <DocsEnhancementBlock
        title="The control layers that protect sensitive workflows"
        description="Security in Nex-T1 is mostly about keeping identity, authority, and account-linked access readable at the moment you need them."
      >
        <DocsFeatureGrid items={[...SECURITY_CONTROLS]} />
      </DocsEnhancementBlock>

      <DocsEnhancementBlock
        title="Where human review should stay in the loop"
        description="Automation and assisted research are useful, but some decision points still need deliberate confirmation."
      >
        <DocsChecklistPanel
          title="Keep these workflows manually reviewed"
          items={[...MANUAL_REVIEW_AREAS]}
        />
      </DocsEnhancementBlock>
    </div>
  );
}
