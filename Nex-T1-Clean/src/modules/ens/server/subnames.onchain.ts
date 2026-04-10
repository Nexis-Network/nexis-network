import "server-only";

import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  toCoinType,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, mainnet } from "viem/chains";

import {
  BASE_L2_REVERSE_REGISTRAR_ADDRESS,
  DEFAULT_REVERSE_REGISTRAR_ADDRESS,
} from "@/modules/ens/shared/claim-helpers";
import {
  getEnsBaseRpcUrl,
  getEnsMainnetRpcUrl,
  getEnsRegistrarAddress,
  getEnsRelayerPrivateKey,
} from "@/modules/ens/server/subnames.runtime";

const ENS_SUBNAME_REGISTRAR_ABI = parseAbi([
  "function claim(address owner, string label) returns (bytes32 node)",
]);

const DEFAULT_REVERSE_REGISTRAR_ABI = parseAbi([
  "function setNameForAddrWithSignature(address addr,uint256 signatureExpiry,string name,bytes signature)",
]);

const BASE_L2_REVERSE_REGISTRAR_ABI = parseAbi([
  "function setNameForAddrWithSignature(address addr,uint256 signatureExpiry,string name,uint256[] coinTypes,bytes signature)",
]);

function getRelayerAccount() {
  return privateKeyToAccount(getEnsRelayerPrivateKey());
}

function buildMainnetPublicClient() {
  return createPublicClient({
    chain: mainnet,
    transport: http(getEnsMainnetRpcUrl()),
  });
}

function buildBasePublicClient() {
  return createPublicClient({
    chain: base,
    transport: http(getEnsBaseRpcUrl()),
  });
}

function buildMainnetRelayerClient() {
  return createWalletClient({
    account: getRelayerAccount(),
    chain: mainnet,
    transport: http(getEnsMainnetRpcUrl()),
  });
}

function buildBaseRelayerClient() {
  return createWalletClient({
    account: getRelayerAccount(),
    chain: base,
    transport: http(getEnsBaseRpcUrl()),
  });
}

type MainnetPublicClient = ReturnType<typeof buildMainnetPublicClient>;
type BasePublicClient = ReturnType<typeof buildBasePublicClient>;
type MainnetRelayerClient = ReturnType<typeof buildMainnetRelayerClient>;
type BaseRelayerClient = ReturnType<typeof buildBaseRelayerClient>;

let mainnetPublicClient: MainnetPublicClient | null = null;
let basePublicClient: BasePublicClient | null = null;
let mainnetRelayerClient: MainnetRelayerClient | null = null;
let baseRelayerClient: BaseRelayerClient | null = null;

function getMainnetPublicClient(): MainnetPublicClient {
  if (mainnetPublicClient) {
    return mainnetPublicClient;
  }

  const client = buildMainnetPublicClient();
  mainnetPublicClient = client;
  return client;
}

function getBasePublicClient(): BasePublicClient {
  if (basePublicClient) {
    return basePublicClient;
  }

  const client = buildBasePublicClient();
  basePublicClient = client;
  return client;
}

function getMainnetRelayerClient(): MainnetRelayerClient {
  if (mainnetRelayerClient) {
    return mainnetRelayerClient;
  }

  const client = buildMainnetRelayerClient();
  mainnetRelayerClient = client;
  return client;
}

function getBaseRelayerClient(): BaseRelayerClient {
  if (baseRelayerClient) {
    return baseRelayerClient;
  }

  const client = buildBaseRelayerClient();
  baseRelayerClient = client;
  return client;
}

export async function claimMainnetSubname(
  walletAddress: Address,
  label: string,
): Promise<Hex> {
  const relayer = getMainnetRelayerClient();

  if (!relayer.account) {
    throw new Error("ENS relayer account is not configured.");
  }

  const txHash = await relayer.writeContract({
    account: relayer.account,
    address: getEnsRegistrarAddress(),
    abi: ENS_SUBNAME_REGISTRAR_ABI,
    functionName: "claim",
    args: [walletAddress, label],
    chain: mainnet,
  });

  await getMainnetPublicClient().waitForTransactionReceipt({ hash: txHash });
  return txHash;
}

export async function setMainnetReverseName(params: {
  walletAddress: Address;
  ensName: string;
  signature: Hex;
  signatureExpiry: number;
}): Promise<Hex> {
  const relayer = getMainnetRelayerClient();

  if (!relayer.account) {
    throw new Error("ENS relayer account is not configured.");
  }

  const txHash = await relayer.writeContract({
    account: relayer.account,
    address: DEFAULT_REVERSE_REGISTRAR_ADDRESS,
    abi: DEFAULT_REVERSE_REGISTRAR_ABI,
    functionName: "setNameForAddrWithSignature",
    args: [
      params.walletAddress,
      BigInt(params.signatureExpiry),
      params.ensName,
      params.signature,
    ],
    chain: mainnet,
  });

  await getMainnetPublicClient().waitForTransactionReceipt({ hash: txHash });
  return txHash;
}

export async function setBaseReverseName(params: {
  walletAddress: Address;
  ensName: string;
  signature: Hex;
  signatureExpiry: number;
}): Promise<Hex> {
  const relayer = getBaseRelayerClient();

  if (!relayer.account) {
    throw new Error("ENS relayer account is not configured.");
  }

  const txHash = await relayer.writeContract({
    account: relayer.account,
    address: BASE_L2_REVERSE_REGISTRAR_ADDRESS,
    abi: BASE_L2_REVERSE_REGISTRAR_ABI,
    functionName: "setNameForAddrWithSignature",
    args: [
      params.walletAddress,
      BigInt(params.signatureExpiry),
      params.ensName,
      [toCoinType(base.id)],
      params.signature,
    ],
    chain: base,
  });

  await getBasePublicClient().waitForTransactionReceipt({ hash: txHash });
  return txHash;
}
