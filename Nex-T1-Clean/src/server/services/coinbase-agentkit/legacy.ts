import "server-only";

import { AgentKit } from "@coinbase/agentkit";

import { CatalogWalletProvider, getCoinbaseAgentKitActionProviders } from "./provider-registry";
import { NexEmbeddedEvmWalletProvider } from "./wallet-provider";

type AgentKitInstance = Awaited<ReturnType<typeof AgentKit.from>>;

let cachedPromise: Promise<AgentKitInstance | null> | null = null;

export function isCoinbaseAgentKitConfigured(): boolean {
  return Boolean(process.env.CDP_API_KEY_ID?.trim() && process.env.CDP_API_KEY_SECRET?.trim());
}

async function resolveLegacyWalletProvider() {
  const fallbackUserId = process.env.COINBASE_AGENTKIT_LEGACY_USER_ID?.trim();

  if (fallbackUserId) {
    return NexEmbeddedEvmWalletProvider.configure({
      userId: fallbackUserId,
    });
  }

  return new CatalogWalletProvider();
}

export async function getLegacyCoinbaseAgentKitInstance(): Promise<AgentKitInstance | null> {
  if (cachedPromise) {
    return cachedPromise;
  }

  cachedPromise = (async () => {
    try {
      const walletProvider = await resolveLegacyWalletProvider();
      return AgentKit.from({
        walletProvider,
        actionProviders: getCoinbaseAgentKitActionProviders([
          "wallet",
          "defi",
          "builder",
          "identity",
          "market",
        ]),
      });
    } catch {
      return null;
    }
  })();

  return cachedPromise;
}

export function resetLegacyCoinbaseAgentKitCache(): void {
  cachedPromise = null;
}
