import "server-only";

import {
  getStaticSolanaAgentKitDomainCatalog,
  type SolanaAgentKitDomainCatalogSnapshot,
} from "./catalog";
import { getSolanaAgentKitDomainCatalog } from "./plugin-registry";

export async function getSolanaAgentKitSettingsCatalog(): Promise<
  SolanaAgentKitDomainCatalogSnapshot[]
> {
  const staticCatalog = getStaticSolanaAgentKitDomainCatalog();

  try {
    const dynamicCatalog = await getSolanaAgentKitDomainCatalog();
    const byDomain = new Map(dynamicCatalog.map((entry) => [entry.domain, entry]));

    return staticCatalog.map((entry) => {
      const dynamicEntry = byDomain.get(entry.domain);
      if (!dynamicEntry) {
        return entry;
      }

      return {
        ...entry,
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
