import "server-only";

import {
  type Abi,
  type ContractFunctionArgs,
  type ContractFunctionName,
  type ReadContractParameters,
  type ReadContractReturnType,
  createPublicClient,
  http,
} from "viem";
import { baseSepolia } from "viem/chains";
import {
  type ActionProvider,
  AgentKit,
  EvmWalletProvider,
  basenameActionProvider,
  cdpEvmWalletActionProvider,
  clankerActionProvider,
  compoundActionProvider,
  erc20ActionProvider,
  erc721ActionProvider,
  flaunchActionProvider,
  morphoActionProvider,
  pythActionProvider,
  walletActionProvider,
  wethActionProvider,
  wowActionProvider,
  zoraActionProvider,
} from "@coinbase/agentkit";

import {
  COINBASE_AGENTKIT_ALLOWED_ACTIONS,
  COINBASE_AGENTKIT_REPRESENTATIVE_ACTIONS,
  type CoinbaseAgentKitDomain,
  type CoinbaseAgentKitDomainCatalogSnapshot,
} from "./catalog";

type AgentKitPublicClient = ReturnType<EvmWalletProvider["getPublicClient"]>;
type AgentActionProvider = ActionProvider;

export type CoinbaseAgentKitDomainCatalog = CoinbaseAgentKitDomainCatalogSnapshot & {
  actions: string[];
};

export class CatalogWalletProvider extends EvmWalletProvider {
  readonly publicClient: AgentKitPublicClient;

  constructor() {
    super();
    this.publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(),
    }) as AgentKitPublicClient;
  }

  getAddress(): string {
    return "0x1111111111111111111111111111111111111111";
  }

  getNetwork() {
    return {
      protocolFamily: "evm" as const,
      chainId: String(baseSepolia.id),
      networkId: "base-sepolia",
    };
  }

  getName(): string {
    return "Coinbase AgentKit Catalog Wallet";
  }

  async getBalance(): Promise<bigint> {
    return 0n;
  }

  async nativeTransfer(
    ..._args: Parameters<EvmWalletProvider["nativeTransfer"]>
  ): ReturnType<EvmWalletProvider["nativeTransfer"]> {
    return `0x${"1".repeat(64)}`;
  }

  async sign(
    ..._args: Parameters<EvmWalletProvider["sign"]>
  ): ReturnType<EvmWalletProvider["sign"]> {
    throw new Error("Catalog wallet cannot sign.");
  }

  async signMessage(
    ..._args: Parameters<EvmWalletProvider["signMessage"]>
  ): ReturnType<EvmWalletProvider["signMessage"]> {
    throw new Error("Catalog wallet cannot sign messages.");
  }

  async signTypedData(
    ..._args: Parameters<EvmWalletProvider["signTypedData"]>
  ): ReturnType<EvmWalletProvider["signTypedData"]> {
    throw new Error("Catalog wallet cannot sign typed data.");
  }

  async signTransaction(
    ..._args: Parameters<EvmWalletProvider["signTransaction"]>
  ): ReturnType<EvmWalletProvider["signTransaction"]> {
    throw new Error("Catalog wallet cannot sign transactions.");
  }

  async sendTransaction(
    ..._args: Parameters<EvmWalletProvider["sendTransaction"]>
  ): ReturnType<EvmWalletProvider["sendTransaction"]> {
    return `0x${"1".repeat(64)}`;
  }

  async waitForTransactionReceipt(
    ..._args: Parameters<EvmWalletProvider["waitForTransactionReceipt"]>
  ): ReturnType<EvmWalletProvider["waitForTransactionReceipt"]> {
    return Promise.resolve({ status: "success" }) as ReturnType<
      EvmWalletProvider["waitForTransactionReceipt"]
    >;
  }

  // AgentKit binds this through its own bundled viem types, so we keep the boundary loose here.
  async readContract<
    const TAbi extends Abi | readonly unknown[],
    TFunctionName extends ContractFunctionName<TAbi, "pure" | "view">,
    const TArgs extends ContractFunctionArgs<TAbi, "pure" | "view", TFunctionName>,
  >(
    _params: ReadContractParameters<TAbi, TFunctionName, TArgs>,
  ): Promise<ReadContractReturnType<TAbi, TFunctionName, TArgs>> {
    return 0n as ReadContractReturnType<TAbi, TFunctionName, TArgs>;
  }

  getPublicClient(): AgentKitPublicClient {
    return this.publicClient;
  }

  getClient() {
    return {
      evm: {
        getSwapPrice: async () => ({
          liquidityAvailable: true,
          approveTransaction: null,
          transaction: {
            to: "0x1111111111111111111111111111111111111111",
            value: 0n,
            data: "0x",
          },
          fromAmount: 1n,
          toAmount: 1n,
          minToAmount: 1n,
        }),
        getAccount: async () => ({
          useSpendPermission: async () => ({
            transactionHash: `0x${"1".repeat(64)}`,
          }),
        }),
      },
    };
  }

  getCdpSdkNetwork(): "base-sepolia" {
    return "base-sepolia";
  }
}

function createBuilderProviders(): AgentActionProvider[] {
  const providers: AgentActionProvider[] = [
    erc721ActionProvider(),
    wowActionProvider(),
    clankerActionProvider(),
    flaunchActionProvider(),
  ];

  if (process.env.PINATA_JWT?.trim()) {
    providers.push(zoraActionProvider());
  }

  return providers;
}

const DOMAIN_PROVIDERS: Record<
  CoinbaseAgentKitDomain,
  () => AgentActionProvider[]
> = {
  wallet: () => [
    walletActionProvider(),
    erc20ActionProvider(),
    wethActionProvider(),
    cdpEvmWalletActionProvider(),
  ],
  defi: () => [compoundActionProvider(), morphoActionProvider()],
  builder: createBuilderProviders,
  identity: () => [basenameActionProvider()],
  market: () => [pythActionProvider()],
};

export function getCoinbaseAgentKitActionProviders(
  domains: readonly CoinbaseAgentKitDomain[],
): AgentActionProvider[] {
  return domains.flatMap((domain) => DOMAIN_PROVIDERS[domain]());
}

export function filterCoinbaseAgentKitActions(
  domain: CoinbaseAgentKitDomain,
  actions: Array<{ name: string }>,
): string[] {
  const allowed = new Set(COINBASE_AGENTKIT_ALLOWED_ACTIONS[domain]);
  return actions
    .map((action) => action.name)
    .filter((actionName) => allowed.has(actionName));
}

export async function getCoinbaseAgentKitDomainCatalog(): Promise<
  CoinbaseAgentKitDomainCatalog[]
> {
  const walletProvider = new CatalogWalletProvider();
  const domains = Object.keys(DOMAIN_PROVIDERS) as CoinbaseAgentKitDomain[];

  return Promise.all(
    domains.map(async (domain) => {
      const agent = await AgentKit.from({
        walletProvider,
        actionProviders: DOMAIN_PROVIDERS[domain](),
      });
      const actions = filterCoinbaseAgentKitActions(domain, agent.getActions());

      return {
        domain,
        providerNames: [...DOMAIN_PROVIDERS[domain]().map((provider) => provider.name)],
        actionCount: actions.length,
        actions,
        representativeActions: COINBASE_AGENTKIT_REPRESENTATIVE_ACTIONS[domain].filter(
          (actionName) => actions.includes(actionName),
        ),
      };
    }),
  );
}
