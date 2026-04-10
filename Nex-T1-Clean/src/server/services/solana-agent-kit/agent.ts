import "server-only";

import { SolanaAgentKit } from "solana-agent-kit";

import { logger } from "@/lib/logger";

import {
  loadSolanaAgentKitPlugins,
  type SolanaAgentKitDomain,
} from "./plugin-registry";
import { resolveDefaultUserSolanaWalletAddress } from "./wallet-selection";
import {
  CdpSolanaEmbeddedWalletAdapter,
  patchSolanaAgentKitConnection,
} from "./wallet-adapter";

function resolveSolanaRpcUrl(): string {
  return (
    process.env.SOLANA_RPC_URL?.trim() ||
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.trim() ||
    "https://api.mainnet-beta.solana.com"
  );
}

function buildSolanaAgentKitConfig() {
  return {
    OPENAI_API_KEY:
      process.env.NEX_OPENAI_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim(),
    COINGECKO_PRO_API_KEY: process.env.COINGECKO_API_KEY?.trim(),
    COINGECKO_DEMO_API_KEY: process.env.COINGECKO_DEMO_API_KEY?.trim(),
    PRIORITY_LEVEL: "high" as const,
    // Do not pass HELIUS_API_KEY here yet. The published package signs a
    // legacy transaction locally for Helius priority-fee estimation, which
    // would require local private-key access and would weaken the current CDP
    // custody boundary.
  };
}

function normalizeWalletAddress(address: string | null | undefined): string | null {
  const value = address?.trim();
  return value && value.length > 0 ? value : null;
}

export async function createUserScopedSolanaAgentKit(args: {
  userId: string;
  walletAddress?: string | null;
  domains: readonly SolanaAgentKitDomain[];
}): Promise<{
  agent: SolanaAgentKit;
  walletAddress: string | null;
  availableActions: string[];
}> {
  const walletAddress =
    normalizeWalletAddress(args.walletAddress) ??
    (await resolveDefaultUserSolanaWalletAddress(args.userId));

  const wallet = new CdpSolanaEmbeddedWalletAdapter({
    userId: args.userId,
    walletAddress,
  });
  const agent = new SolanaAgentKit(
    wallet,
    resolveSolanaRpcUrl(),
    buildSolanaAgentKitConfig(),
  );

  patchSolanaAgentKitConnection(agent.connection, wallet);

  const plugins = await loadSolanaAgentKitPlugins(args.domains);
  for (const plugin of plugins) {
    agent.use(plugin);
  }

  const availableActions = agent.actions.map((action) => action.name);

  logger.debug("solana_agentkit_agent_ready", {
    userId: args.userId,
    walletAddress,
    domains: args.domains,
    actionCount: availableActions.length,
  });

  return {
    agent,
    walletAddress,
    availableActions,
  };
}
