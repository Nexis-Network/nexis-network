import {
  booleanProp,
  createTool,
  createToolSchema,
  numberProp,
  stringProp,
  type ToolExecutionContext,
} from "./create-tool";
import type { CoinbaseAgentKitDomain } from "@/server/services/coinbase-agentkit/catalog";

const REPRESENTATIVE_ACTIONS: Record<CoinbaseAgentKitDomain, string[]> = {
  wallet: [
    "WalletActionProvider_get_wallet_details",
    "WalletActionProvider_native_transfer",
    "ERC20ActionProvider_transfer",
    "WethActionProvider_wrap_eth",
    "CdpEvmWalletActionProvider_swap",
  ],
  defi: [
    "CompoundActionProvider_supply",
    "CompoundActionProvider_withdraw",
    "CompoundActionProvider_borrow",
    "MorphoActionProvider_deposit",
  ],
  builder: [
    "Erc721ActionProvider_mint",
    "WowActionProvider_create_token",
    "ClankerActionProvider_clank_token",
    "FlaunchActionProvider_flaunch",
  ],
  identity: ["BasenameActionProvider_register_basename"],
  market: [
    "PythActionProvider_fetch_price_feed",
    "PythActionProvider_fetch_price",
  ],
};

type CoinbaseAgentKitToolInput = {
  action: string;
  walletAddress?: string;
  chainId?: number;
  args?: Record<string, UntypedJson>;
  requiresFreshWalletCheck?: boolean;
};

const baseSchema = createToolSchema(
  {
    action: stringProp(
      "Exact Coinbase AgentKit action name for this domain. Use the full action identifier.",
      { minLength: 2 },
    ),
    walletAddress: stringProp(
      "Optional Nex embedded EVM wallet address. Omit to use the user's default embedded EVM wallet.",
    ),
    chainId: numberProp(
      "Optional EVM chain ID override. Defaults to the selected embedded wallet chain.",
    ),
    args: {
      type: "object",
      description: "Arguments for the selected Coinbase AgentKit action.",
      additionalProperties: true,
    },
    requiresFreshWalletCheck: booleanProp(
      "Set true when the user explicitly wants a newly provisioned or specific embedded EVM wallet.",
      false,
    ),
  },
  ["action"],
  { additionalProperties: false },
);

function buildDescription(domain: CoinbaseAgentKitDomain): string {
  return `Execute Coinbase AgentKit ${domain} actions through the user's CDP embedded EVM wallet. Use only for EVM chains and protocols. Representative actions: ${REPRESENTATIVE_ACTIONS[domain].join(", ")}. Do not use this tool for Solana requests.`;
}

async function executeDomainTool(
  domain: CoinbaseAgentKitDomain,
  input: CoinbaseAgentKitToolInput,
  context?: ToolExecutionContext,
) {
  if (!context?.userId) {
    throw new Error("Authenticated user context is required for Coinbase AgentKit execution.");
  }

  const { executeCoinbaseAgentKitAction } = await import(
    "@/server/services/coinbase-agentkit/executor"
  );

  return executeCoinbaseAgentKitAction({
    userId: context.userId,
    domain,
    actionName: input.action,
    args: input.args ?? {},
    walletAddress: input.walletAddress,
    chainId: input.chainId,
    invocationSource:
      typeof context.metadata?.invocationSource === "string"
        ? context.metadata.invocationSource
        : undefined,
  });
}

function createDomainTool(domain: CoinbaseAgentKitDomain) {
  return createTool<CoinbaseAgentKitToolInput>({
    description: buildDescription(domain),
    schema: baseSchema,
    execute: (input, context) => executeDomainTool(domain, input, context),
  });
}

export const coinbaseAgentKitWalletTool = createDomainTool("wallet");
export const coinbaseAgentKitDefiTool = createDomainTool("defi");
export const coinbaseAgentKitBuilderTool = createDomainTool("builder");
export const coinbaseAgentKitIdentityTool = createDomainTool("identity");
export const coinbaseAgentKitMarketTool = createDomainTool("market");
