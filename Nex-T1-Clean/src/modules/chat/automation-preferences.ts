export const AUTONOMOUS_ACTION_KEYS = ["bridge", "deploy", "buy", "sell", "stake"] as const;

export type AutonomousActionKey = (typeof AUTONOMOUS_ACTION_KEYS)[number];

export type AutomationState = Record<AutonomousActionKey, boolean>;

export const DEFAULT_AUTOMATION_STATE: AutomationState = {
  bridge: false,
  deploy: false,
  buy: false,
  sell: false,
  stake: false,
};

export const normalizeAutomationState = (
  value: Partial<Record<string, UntypedJson>> | undefined,
): AutomationState => {
  const normalized: AutomationState = { ...DEFAULT_AUTOMATION_STATE };

  if (!value) {
    return normalized;
  }

  for (const key of AUTONOMOUS_ACTION_KEYS) {
    const incoming = value[key];
    if (typeof incoming === "boolean") {
      normalized[key] = incoming;
    }
  }

  return normalized;
};

export const AUTONOMOUS_ACTION_LABELS: Record<
  AutonomousActionKey,
  { label: string; verb: string; requiresApproval: string }
> = {
  bridge: {
    label: "bridging",
    verb: "bridge assets between networks",
    requiresApproval: "Do not execute bridging operations without explicit human approval.",
  },
  deploy: {
    label: "contract deployment",
    verb: "deploy new smart contracts",
    requiresApproval: "Avoid deploying contracts unless the user confirms the action in real time.",
  },
  buy: {
    label: "buy orders",
    verb: "place buy-side trades",
    requiresApproval: "Only suggest buy-side trades; wait for user confirmation before execution.",
  },
  sell: {
    label: "sell orders",
    verb: "place sell-side trades",
    requiresApproval: "Only suggest sell-side trades; require explicit approval before acting.",
  },
  stake: {
    label: "staking",
    verb: "stake or unstake funds",
    requiresApproval: "Staking flows must remain manual; provide instructions instead of auto-executing.",
  },
};

export type AutomationDirective = {
  summary: string;
  disabled: AutonomousActionKey[];
  enabled: AutonomousActionKey[];
  directive: string;
};

export const summarizeAutomationPreferences = (
  state: AutomationState,
): AutomationDirective => {
  const disabled: AutonomousActionKey[] = [];
  const enabled: AutonomousActionKey[] = [];

  for (const key of AUTONOMOUS_ACTION_KEYS) {
    if (state[key]) {
      enabled.push(key);
    } else {
      disabled.push(key);
    }
  }

  let directive = "";

  if (disabled.length === AUTONOMOUS_ACTION_KEYS.length) {
    directive =
      "Autonomous execution is disabled. Provide guidance only and require explicit human approval before bridging, deploying, buying, selling, or staking.";
  } else if (disabled.length > 0) {
    const requirements = disabled
      .map((key) => `- ${AUTONOMOUS_ACTION_LABELS[key].requiresApproval}`)
      .join("\n");
    directive = `Respect the user's automation preferences. The following operations require manual approval:\n${requirements}`;
  } else {
    directive =
      "Autonomous execution is enabled for all supported operations. Still surface estimated costs and provide a confirmation summary before performing irreversible actions.";
  }

  const summaryParts: string[] = [];
  if (enabled.length > 0) {
    summaryParts.push(`Enabled: ${enabled.map((key) => AUTONOMOUS_ACTION_LABELS[key].label).join(", ")}`);
  }
  if (disabled.length > 0) {
    summaryParts.push(`Manual approval: ${disabled.map((key) => AUTONOMOUS_ACTION_LABELS[key].label).join(", ")}`);
  }

  return {
    summary: summaryParts.join(" | ") || "Automation preferences not specified",
    disabled,
    enabled,
    directive,
  };
};
