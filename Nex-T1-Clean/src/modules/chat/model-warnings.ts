export type ModelWarning = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

export const DEGEN_MODEL_WARNING: ModelWarning = {
  title: "Proceed in Degen mode at your own risk",
  description:
    "Degen taps into an experimental agent with relaxed guardrails to chase high-risk, high-reward on-chain plays. Double-check every signature, expect volatile behavior, and accept full responsibility for the outcomes. Nexis Labs, Nex-T1 & affiliates are not responsible for any financial losses.\n\nBy proceeding you agree to Terms and Conditions.",
  confirmLabel: "I understand the risks",
  cancelLabel: "Stay on safer model",
};
