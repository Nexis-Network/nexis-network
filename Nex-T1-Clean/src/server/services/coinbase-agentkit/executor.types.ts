import type { classifyCoinbaseAgentKitAction } from "./action-policy";
import type { CoinbaseAgentKitDomain } from "./catalog";

export type CoinbaseAgentKitActionLike = {
  name: string;
  description: string;
  schema: {
    parse: (input: unknown) => unknown;
  };
  invoke: (input: unknown) => Promise<unknown>;
};

export type CoinbaseAgentKitActionPolicy = ReturnType<typeof classifyCoinbaseAgentKitAction>;

export type ExecuteCoinbaseAgentKitActionInput = {
  userId: string;
  domain: CoinbaseAgentKitDomain;
  actionName: string;
  args?: Record<string, UntypedJson>;
  walletAddress?: string | null;
  chainId?: number | null;
  invocationSource?: string;
};

export type ExecuteCoinbaseAgentKitActionResult = {
  status: "success" | "error" | "rejected";
  domain: CoinbaseAgentKitDomain;
  actionName: string;
  walletAddress: string | null;
  chainId: number | null;
  approvalId?: string;
  approvalRequired: boolean;
  policy: CoinbaseAgentKitActionPolicy;
  result?: Record<string, unknown>;
  error?: string;
};

