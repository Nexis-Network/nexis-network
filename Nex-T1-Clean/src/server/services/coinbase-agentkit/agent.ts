import "server-only";

import { AgentKit } from "@coinbase/agentkit";

import type { CoinbaseAgentKitDomain } from "./catalog";
import {
  getCoinbaseAgentKitActionProviders,
  filterCoinbaseAgentKitActions,
} from "./provider-registry";
import { NexEmbeddedEvmWalletProvider } from "./wallet-provider";

export async function createUserScopedCoinbaseAgentKit(args: {
  userId: string;
  domains: readonly CoinbaseAgentKitDomain[];
  walletAddress?: string | null;
  chainId?: number | null;
}) {
  const walletProvider = await NexEmbeddedEvmWalletProvider.configure({
    userId: args.userId,
    walletAddress: args.walletAddress,
    chainId: args.chainId,
  });

  const agent = await AgentKit.from({
    walletProvider,
    actionProviders: getCoinbaseAgentKitActionProviders(args.domains),
  });

  const allowedActions = new Set(
    args.domains.flatMap((domain) => filterCoinbaseAgentKitActions(domain, agent.getActions())),
  );

  return {
    agent,
    walletProvider,
    walletAddress: walletProvider.getAddress(),
    chainId: walletProvider.getChainId(),
    allowedActions,
  };
}

