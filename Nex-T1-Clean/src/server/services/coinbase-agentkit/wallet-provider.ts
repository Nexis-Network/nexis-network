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
import {
  EvmWalletProvider,
  type Network,
} from "@coinbase/agentkit";
import {
  arbitrum,
  avalanche,
  base,
  baseSepolia,
  mainnet,
  optimism,
  polygon,
  sepolia,
} from "viem/chains";

import {
  getDefaultCdpEvmCapability,
  getNetworkCapabilityByChainId,
  resolveCdpSignAndSendNetwork,
} from "@/lib/networks/capabilities";
import { getCdpClient } from "@/server/services/cdp/client";

import {
  resolveUserCoinbaseAgentKitWallet,
  type CoinbaseAgentKitWalletSelection,
} from "./wallet-selection";

const CHAIN_BY_ID = {
  1: mainnet,
  10: optimism,
  137: polygon,
  8453: base,
  84532: baseSepolia,
  42161: arbitrum,
  43114: avalanche,
  11155111: sepolia,
} as const;

type SupportedCdpEvmNetwork =
  | "arbitrum"
  | "avalanche"
  | "base"
  | "base-sepolia"
  | "ethereum"
  | "ethereum-sepolia"
  | "optimism"
  | "polygon";

type ConfigureArgs = {
  userId: string;
  walletAddress?: string | null;
  chainId?: number | null;
};

type AgentKitPublicClient = ReturnType<EvmWalletProvider["getPublicClient"]>;

function getPublicChain(chainId: number) {
  return CHAIN_BY_ID[chainId as keyof typeof CHAIN_BY_ID] ?? base;
}

function getNetwork(chainId: number): Network {
  const capability =
    getNetworkCapabilityByChainId(chainId) ?? getDefaultCdpEvmCapability();

  return {
    protocolFamily: "evm",
    chainId: String(capability.chainId),
    networkId: capability.networkKey,
  };
}

function requireCdpNetwork(chainId: number): SupportedCdpEvmNetwork {
  const network = resolveCdpSignAndSendNetwork(chainId);
  if (!network) {
    throw new Error(`Unsupported CDP EVM chain ID: ${chainId}`);
  }
  return network;
}

export class NexEmbeddedEvmWalletProvider extends EvmWalletProvider {
  readonly selection: CoinbaseAgentKitWalletSelection;
  readonly network: Network;
  readonly publicClient: AgentKitPublicClient;

  private constructor(selection: CoinbaseAgentKitWalletSelection) {
    super();
    this.selection = selection;
    this.network = getNetwork(selection.chainId);
    this.publicClient = createPublicClient({
      chain: getPublicChain(selection.chainId),
      transport: http(),
    }) as AgentKitPublicClient;
  }

  static async configure(args: ConfigureArgs): Promise<NexEmbeddedEvmWalletProvider> {
    const selection = await resolveUserCoinbaseAgentKitWallet(args);
    if (!selection) {
      throw new Error(
        "Provision an embedded Nex Wallet (EVM) before attempting Coinbase AgentKit EVM actions.",
      );
    }

    return new NexEmbeddedEvmWalletProvider(selection);
  }

  getAddress(): string {
    return this.selection.address;
  }

  getChainId(): number {
    return this.selection.chainId;
  }

  getNetwork(): Network {
    return this.network;
  }

  getName(): string {
    return "Nex Embedded EVM Wallet";
  }

  getPublicClient(): AgentKitPublicClient {
    return this.publicClient;
  }

  async getBalance(): Promise<bigint> {
    return this.publicClient.getBalance({
      address: this.selection.address,
    });
  }

  async nativeTransfer(
    ...args: Parameters<EvmWalletProvider["nativeTransfer"]>
  ): ReturnType<EvmWalletProvider["nativeTransfer"]> {
    const [to, value] = args;
    return this.sendTransaction({
      to: to as `0x${string}`,
      value: BigInt(value),
    });
  }

  async sign(
    ..._args: Parameters<EvmWalletProvider["sign"]>
  ): ReturnType<EvmWalletProvider["sign"]> {
    throw new Error("Raw hash signing is not supported for embedded EVM wallets in chat execution.");
  }

  async signMessage(
    ..._args: Parameters<EvmWalletProvider["signMessage"]>
  ): ReturnType<EvmWalletProvider["signMessage"]> {
    throw new Error("Message signing is not supported for embedded EVM wallets in chat execution.");
  }

  async signTypedData(
    ..._args: Parameters<EvmWalletProvider["signTypedData"]>
  ): ReturnType<EvmWalletProvider["signTypedData"]> {
    throw new Error("Typed-data signing is not supported for embedded EVM wallets in chat execution.");
  }

  async signTransaction(
    ..._args: Parameters<EvmWalletProvider["signTransaction"]>
  ): ReturnType<EvmWalletProvider["signTransaction"]> {
    throw new Error("Offline transaction signing is not supported for embedded EVM wallets in chat execution.");
  }

  async sendTransaction(
    transaction: Parameters<EvmWalletProvider["sendTransaction"]>[0],
  ): ReturnType<EvmWalletProvider["sendTransaction"]> {
    const cdp = await this.getClient();
    const to = transaction.to;

    if (!to) {
      throw new Error("Transaction target is required for embedded EVM execution.");
    }

    const result = await cdp.evm.sendTransaction({
      address: this.selection.address,
      network: this.getCdpSdkNetwork(),
      transaction: {
        to: to as `0x${string}`,
        value: BigInt(transaction.value ?? 0n),
        data: (transaction.data ?? "0x") as `0x${string}`,
      },
    });

    return result.transactionHash as `0x${string}`;
  }

  async waitForTransactionReceipt(
    txHash: Parameters<EvmWalletProvider["waitForTransactionReceipt"]>[0],
  ): ReturnType<EvmWalletProvider["waitForTransactionReceipt"]> {
    return this.publicClient.waitForTransactionReceipt({ hash: txHash }) as ReturnType<
      EvmWalletProvider["waitForTransactionReceipt"]
    >;
  }

  // AgentKit binds this through its own bundled viem types, so we keep the boundary loose here.
  async readContract<
    const TAbi extends Abi | readonly unknown[],
    TFunctionName extends ContractFunctionName<TAbi, "pure" | "view">,
    const TArgs extends ContractFunctionArgs<TAbi, "pure" | "view", TFunctionName>,
  >(
    params: ReadContractParameters<TAbi, TFunctionName, TArgs>,
  ): Promise<ReadContractReturnType<TAbi, TFunctionName, TArgs>> {
    return this.publicClient.readContract(params as never) as Promise<
      ReadContractReturnType<TAbi, TFunctionName, TArgs>
    >;
  }

  async getClient() {
    const client = await getCdpClient();
    if (!client) {
      throw new Error("CDP server client not available.");
    }
    return client;
  }

  getCdpSdkNetwork(): SupportedCdpEvmNetwork {
    return requireCdpNetwork(this.selection.chainId);
  }
}
