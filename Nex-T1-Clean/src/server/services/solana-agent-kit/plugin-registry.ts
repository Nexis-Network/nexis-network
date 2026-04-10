import "server-only";

import type { Action, Plugin } from "solana-agent-kit";

import {
  SOLANA_AGENTKIT_PLUGIN_MODULE_IDS,
  SOLANA_AGENTKIT_REPRESENTATIVE_ACTIONS,
  type SolanaAgentKitDomain,
  type SolanaAgentKitDomainCatalogSnapshot,
} from "./catalog";

export type { SolanaAgentKitDomain } from "./catalog";

export type SolanaAgentKitDomainCatalog =
  SolanaAgentKitDomainCatalogSnapshot & {
    actions: string[];
  };

type PluginModule = {
  default?: unknown;
};

const PLUGIN_LOADERS: Record<
  SolanaAgentKitDomain,
  () => Promise<PluginModule>
> = {
  token: () => import("@solana-agent-kit/plugin-token"),
  nft: () => import("@solana-agent-kit/plugin-nft"),
  defi: () => import("@solana-agent-kit/plugin-defi"),
  misc: () => import("@solana-agent-kit/plugin-misc"),
  blinks: () => import("@solana-agent-kit/plugin-blinks"),
};

const pluginCache = new Map<SolanaAgentKitDomain, Plugin>();

function normalizePlugin(moduleValue: unknown, moduleId: string): Plugin {
  const candidate = ((moduleValue as { default?: unknown })?.default ??
    moduleValue) as Plugin | undefined;

  if (
    !candidate ||
    typeof candidate.name !== "string" ||
    !candidate.actions ||
    !candidate.methods ||
    typeof candidate.initialize !== "function"
  ) {
    throw new Error(`Invalid Solana AgentKit plugin export from ${moduleId}`);
  }

  return candidate;
}

export async function loadSolanaAgentKitPlugin(
  domain: SolanaAgentKitDomain,
): Promise<Plugin> {
  const cached = pluginCache.get(domain);
  if (cached) {
    return cached;
  }

  const moduleId = SOLANA_AGENTKIT_PLUGIN_MODULE_IDS[domain];
  const loaded = await PLUGIN_LOADERS[domain]();
  const plugin = normalizePlugin(loaded, moduleId);
  pluginCache.set(domain, plugin);
  return plugin;
}

export async function loadSolanaAgentKitPlugins(
  domains: readonly SolanaAgentKitDomain[],
): Promise<Plugin[]> {
  return Promise.all(domains.map((domain) => loadSolanaAgentKitPlugin(domain)));
}

export async function getSolanaAgentKitDomainCatalog(): Promise<
  SolanaAgentKitDomainCatalog[]
> {
  const domains = Object.keys(
    SOLANA_AGENTKIT_PLUGIN_MODULE_IDS,
  ) as SolanaAgentKitDomain[];
  const plugins = await loadSolanaAgentKitPlugins(domains);

  return plugins.map((plugin, index) => {
    const domain = domains[index];
    const actions = plugin.actions.map((action: Action) => action.name);

    return {
      domain,
      pluginName: plugin.name,
      actionCount: actions.length,
      actions,
      representativeActions: SOLANA_AGENTKIT_REPRESENTATIVE_ACTIONS[
        domain
      ].filter((action) => actions.includes(action)),
    };
  });
}
