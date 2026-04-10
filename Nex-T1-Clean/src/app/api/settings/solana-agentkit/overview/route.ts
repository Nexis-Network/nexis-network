import { connection } from "next/server";

import { apiResponse } from "@/lib/api-platform";
import { withAuthedSupabase } from "@/server/api/helpers/with-auth-client";

function normalizeAddress(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.startsWith("0x") ? trimmed.toLowerCase() : trimmed;
}

export async function GET(_request: Request) {
  await connection();

  return withAuthedSupabase(async ({ userId, cookieBridge }) => {
    const [
      approvalsModule,
      repositoryModule,
      catalogModule,
      walletSelectionModule,
      walletAggregatorModule,
      detectKindModule,
      userWalletsModule,
      { listFreshSolanaAgentKitPositions },
    ] = await Promise.all([
      import("@/lib/approvals/state-machine"),
      import("@/server/services/solana-agent-kit/repository"),
      import("@/server/services/solana-agent-kit/settings-domain-catalog"),
      import("@/server/services/solana-agent-kit/wallet-selection"),
      import("@/server/settings/wallet-aggregator"),
      import("@/server/wallets/detect-kind"),
      import("@/server/wallets/user-wallets"),
      import("@/server/services/solana-agent-kit/position-pricing"),
    ]);

    const { getAutonomousActionPreferences, getUserAgentSettings } = approvalsModule;
    const {
      listSolanaAgentKitAutomationTasks,
      listSolanaAgentKitDeployments,
      listSolanaAgentKitTransactions,
    } = repositoryModule;
    const { getSolanaAgentKitSettingsCatalog } = catalogModule;
    const { resolveDefaultUserSolanaWalletAddress } = walletSelectionModule;
    const { getWalletHoldingsAggregate, getWalletHistoryAggregate } = walletAggregatorModule;
    const { detectWalletKind } = detectKindModule;
    const { resolveUserWallets } = userWalletsModule;
    const positionsPromise = listFreshSolanaAgentKitPositions(userId);

    const [wallets, holdings, history, domainCatalog, settings, defaultWalletAddress, transactions, deployments, positions, automationTasks] =
      await Promise.all([
        resolveUserWallets(userId),
        getWalletHoldingsAggregate(userId),
        getWalletHistoryAggregate(userId),
        getSolanaAgentKitSettingsCatalog(),
        getUserAgentSettings(userId),
        resolveDefaultUserSolanaWalletAddress(userId),
        listSolanaAgentKitTransactions(userId),
        listSolanaAgentKitDeployments(userId),
        positionsPromise,
        listSolanaAgentKitAutomationTasks(userId),
      ]);

    const solanaWalletAddresses = new Set(
      wallets
        .filter((wallet) => detectWalletKind(wallet) === "solana")
        .map((wallet) => normalizeAddress(wallet.address))
        .filter((value): value is string => Boolean(value)),
    );

    if (defaultWalletAddress) {
      solanaWalletAddresses.add(normalizeAddress(defaultWalletAddress) ?? defaultWalletAddress);
    }

    const tokens = holdings.tokens.filter((token) =>
      solanaWalletAddresses.has(normalizeAddress(token.walletAddress) ?? ""),
    );
    const nfts = holdings.nfts.filter((nft) =>
      solanaWalletAddresses.has(normalizeAddress(nft.walletAddress) ?? ""),
    );
    const events = history.events.filter((event) => {
      const normalizedWallet = normalizeAddress(event.walletAddress);
      return event.source === "solana" || (normalizedWallet ? solanaWalletAddresses.has(normalizedWallet) : false);
    });

    const response = apiResponse.success({
      generatedAt: new Date().toISOString(),
      defaultWalletAddress,
      domainCatalog,
      balances: {
        generatedAt: holdings.generatedAt,
        tokens,
        nfts,
      },
      history: {
        generatedAt: history.generatedAt,
        events,
        transactions,
      },
      deployments,
      positions,
      automation: {
        tasks: automationTasks,
        settings: {
          autonomousMode: settings.autonomousMode,
          riskTolerance: settings.riskTolerance,
          maxTransactionValueUsd: settings.maxTransactionValueUsd,
          preferredChains: settings.preferredChains,
          autonomousActions: getAutonomousActionPreferences(settings),
        },
      },
    });

    response.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=120");
    return cookieBridge.commit(response);
  });
}
