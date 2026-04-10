import type { classifySolanaAgentKitAction } from "./action-policy";
import type { SolanaAgentKitDomain } from "./plugin-registry";

export type SolanaAgentKitActionLike = {
  name: string;
  description: string;
  schema: {
    parse: (input: unknown) => unknown;
  };
  handler: (agent: unknown, input: unknown) => Promise<Record<string, unknown>>;
};

export type SolanaAgentKitActionPolicy = ReturnType<typeof classifySolanaAgentKitAction>;

export type ExecuteSolanaAgentKitActionInput = {
  userId: string;
  domain: SolanaAgentKitDomain;
  actionName: string;
  args?: Record<string, UntypedJson>;
  walletAddress?: string | null;
  invocationSource?: string;
};

export type ExecuteSolanaAgentKitActionResult = {
  status: "success" | "error" | "rejected";
  domain: SolanaAgentKitDomain;
  actionName: string;
  walletAddress: string | null;
  approvalId?: string;
  approvalRequired: boolean;
  policy: SolanaAgentKitActionPolicy;
  result?: Record<string, unknown>;
  error?: string;
};
