import {
  createTool,
  createToolSchema,
  stringProp,
  booleanProp,
  type ToolExecutionContext,
} from "./create-tool";
import type { SolanaAgentKitDomain } from "@/server/services/solana-agent-kit/catalog";

const REPRESENTATIVE_ACTIONS: Record<SolanaAgentKitDomain, string[]> = {
  token: [
    "TRANSFER",
    "SWAP",
    "TRADE",
    "STAKE_WITH_JUPITER",
    "COMPRESSED_AIRDROP",
    "LAUNCH_PUMPFUN_TOKEN",
  ],
  nft: [
    "DEPLOY_COLLECTION",
    "MINT_NFT",
    "LIST_NFT_FOR_SALE",
    "CREATE_3LAND_COLLECTIBLE",
  ],
  defi: [
    "LULO_LEND",
    "OPEN_PERP_TRADE_LONG",
    "CREATE_METEORA_DLMM_POOL",
    "RAYDIUM_CREATE_CPMM",
    "CREATE_ORCA_SINGLE_SIDED_WHIRLPOOL",
    "DEBRIDGE_CREATE_BRIDGE_ORDER",
  ],
  misc: [
    "REGISTER_DOMAIN",
    "RESOLVE_SOL_DOMAIN",
    "GET_COINGECKO_TOP_GAINERS",
    "CREATE_GIBWORK_TASK",
  ],
  blinks: ["PLAY_ROCK_PAPER_SCISSORS"],
};

type SolanaAgentKitToolInput = {
  action: string;
  walletAddress?: string;
  args?: Record<string, UntypedJson>;
  requiresFreshWalletCheck?: boolean;
};

const baseSchema = createToolSchema(
  {
    action: stringProp(
      "Exact Solana AgentKit action name. Use the documented uppercase action identifier for this domain.",
      {
        minLength: 2,
      },
    ),
    walletAddress: stringProp(
      "Optional Solana Nex Wallet address to force for this action. Omit to use the user's default embedded Solana wallet.",
    ),
    args: {
      type: "object",
      description: "Arguments for the selected Solana AgentKit action.",
      additionalProperties: true,
    },
    requiresFreshWalletCheck: booleanProp(
      "Set true when the user explicitly asks to use a newly provisioned or specific Solana wallet.",
      false,
    ),
  },
  ["action"],
  { additionalProperties: false },
);

function buildDescription(domain: SolanaAgentKitDomain): string {
  const examples = REPRESENTATIVE_ACTIONS[domain].join(", ");
  return `Execute Solana AgentKit ${domain} actions through the user's CDP-backed embedded Solana wallet. Load only when the request clearly belongs to the ${domain} domain. Representative actions: ${examples}. Write actions automatically route through Nex approval controls and CDP signing.`;
}

async function executeDomainTool(
  domain: SolanaAgentKitDomain,
  input: SolanaAgentKitToolInput,
  context?: ToolExecutionContext,
) {
  const userId = context?.userId;
  if (!userId) {
    throw new Error("Authenticated user context is required for Solana AgentKit execution.");
  }

  const { executeSolanaAgentKitAction } = await import(
    "@/server/services/solana-agent-kit/executor"
  );

  return executeSolanaAgentKitAction({
    userId,
    domain,
    actionName: input.action,
    args: input.args ?? {},
    walletAddress: input.walletAddress,
    invocationSource:
      typeof context?.metadata?.invocationSource === "string"
        ? context.metadata.invocationSource
        : undefined,
  });
}

function createDomainTool(domain: SolanaAgentKitDomain) {
  return createTool<SolanaAgentKitToolInput>({
    description: buildDescription(domain),
    schema: baseSchema,
    execute: (input, context) => executeDomainTool(domain, input, context),
  });
}

export const solanaAgentKitTokenTool = createDomainTool("token");
export const solanaAgentKitNftTool = createDomainTool("nft");
export const solanaAgentKitDefiTool = createDomainTool("defi");
export const solanaAgentKitMiscTool = createDomainTool("misc");
export const solanaAgentKitBlinksTool = createDomainTool("blinks");
