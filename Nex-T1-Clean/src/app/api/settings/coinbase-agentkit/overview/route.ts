import { connection } from "next/server";

import { apiResponse } from "@/lib/api-platform";
import { withAuthedSupabase } from "@/server/api/helpers/with-auth-client";

function normalizeAddress(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
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
      { listFreshCoinbaseAgentKitPositions },
    ] = await Promise.all([
      import("@/lib/approvals/state-machine"),
      import("@/server/services/coinbase-agentkit/repository"),
      import("@/server/services/coinbase-agentkit/settings-domain-catalog"),
      import("@/server/services/coinbase-agentkit/wallet-selection"),
      import("@/server/settings/wallet-aggregator"),
      import("@/server/wallets/detect-kind"),
      import("@/server/wallets/user-wallets"),
      import("@/server/services/coinbase-agentkit/position-pricing"),
    ]);

    const {
      getAutonomousActionPreferences,
      getUserAgentSettings,
    } = approvalsModule;
    const {
      listCoinbaseAgentKitAutomationTasks,
      listCoinbaseAgentKitDeployments,
      listCoinbaseAgentKitTransactions,
    } = repositoryModule;
    const { getCoinbaseAgentKitSettingsCatalog } = catalogModule;
    const { resolveDefaultUserCoinbaseAgentKitWalletAddress } = walletSelectionModule;
    const { getWalletHoldingsAggregate, getWalletHistoryAggregate } = walletAggregatorModule;
    const { detectWalletKind } = detectKindModule;
    const { resolveUserWallets } = userWalletsModule;
    const positionsPromise = listFreshCoinbaseAgentKitPositions(userId);

    const [
      wallets,
      holdings,
      history,
      domainCatalog,
      settings,
      defaultWalletAddress,
      transactions,
      deployments,
      positions,
      automationTasks,
    ] = await Promise.all([
      resolveUserWallets(userId),
      getWalletHoldingsAggregate(userId),
      getWalletHistoryAggregate(userId),
      getCoinbaseAgentKitSettingsCatalog(),
      getUserAgentSettings(userId),
      resolveDefaultUserCoinbaseAgentKitWalletAddress(userId),
      listCoinbaseAgentKitTransactions(userId),
      listCoinbaseAgentKitDeployments(userId),
      positionsPromise,
      listCoinbaseAgentKitAutomationTasks(userId),
    ]);

    const evmWalletAddresses = new Set(
      wallets
        .filter((wallet) => detectWalletKind(wallet) === "evm")
        .map((wallet) => normalizeAddress(wallet.address))
        .filter((value): value is string => Boolean(value)),
    );

    if (defaultWalletAddress) {
      evmWalletAddresses.add(defaultWalletAddress.toLowerCase());
    }

    const response = apiResponse.success({
      generatedAt: new Date().toISOString(),
      defaultWalletAddress,
      wallets: wallets
        .filter((wallet) => detectWalletKind(wallet) === "evm")
        .map((wallet) => ({
          walletId: wallet.walletId,
          address: wallet.address,
          label: wallet.label,
          providerName: wallet.providerName,
          chainId:
            typeof wallet.metadata?.chainId === "number" ? wallet.metadata.chainId : null,
        })),
      domainCatalog,
      balances: {
        generatedAt: holdings.generatedAt,
        tokens: holdings.tokens.filter((token) =>
          evmWalletAddresses.has(normalizeAddress(token.walletAddress) ?? ""),
        ),
        nfts: holdings.nfts.filter((nft) =>
          evmWalletAddresses.has(normalizeAddress(nft.walletAddress) ?? ""),
        ),
      },
      history: {
        generatedAt: history.generatedAt,
        events: history.events.filter((event) => {
          const normalizedWallet = normalizeAddress(event.walletAddress);
          return (
            event.source === "evm" ||
            (normalizedWallet ? evmWalletAddresses.has(normalizedWallet) : false)
          );
        }),
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
