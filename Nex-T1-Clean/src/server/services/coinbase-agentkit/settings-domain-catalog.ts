import "server-only";

import {
  getStaticCoinbaseAgentKitDomainCatalog,
  type CoinbaseAgentKitDomainCatalogSnapshot,
} from "./catalog";

export async function getCoinbaseAgentKitSettingsCatalog(): Promise<
  CoinbaseAgentKitDomainCatalogSnapshot[]
> {
  const staticCatalog = getStaticCoinbaseAgentKitDomainCatalog();

  try {
    const { getCoinbaseAgentKitDomainCatalog } = await import("./provider-registry");
    const dynamicCatalog = await getCoinbaseAgentKitDomainCatalog();
    const byDomain = new Map(dynamicCatalog.map((entry) => [entry.domain, entry]));

    return staticCatalog.map((entry) => {
      const dynamicEntry = byDomain.get(entry.domain);
      if (!dynamicEntry) {
        return entry;
      }

      return {
        ...entry,
        providerNames: dynamicEntry.providerNames,
        actionCount: dynamicEntry.actionCount,
        representativeActions:
          dynamicEntry.representativeActions.length > 0
            ? dynamicEntry.representativeActions
            : entry.representativeActions,
      };
    });
  } catch {
    return staticCatalog;
  }
}
