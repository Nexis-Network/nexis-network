import { createPublicClient, decodeFunctionData, http, type Address, type Hex } from "viem";

import { getSafeTargetChains } from "@/server/services/safe/chains";

type VerifyEvmTransactionOptions = {
  networkId: string;
  txHash: string;
  assetId?: string | null;
  expectedTo?: string | null;
  minValueBaseUnits?: string | null;
};

export function parseEip155ChainId(networkId: string): number {
  const match = /^eip155:(\d+)$/.exec(networkId.trim());
  if (!match) {
    throw new Error("networkId must use EVM CAIP-2 format eip155:<chainId>.");
  }
  return Number(match[1]);
}

function isHexHash(value: string): value is Hex {
  return /^0x[a-fA-F0-9]{64}$/.test(value);
}

function normalizeAddress(value: string | null | undefined): Address | null {
  if (!value) return null;
  if (!/^0x[a-fA-F0-9]{40}$/.test(value)) return null;
  return value as Address;
}

function normalizeAssetId(assetId: string | null | undefined): string {
  const value = assetId?.trim();
  if (!value || value === "native") return "native";
  return value;
}

function parseErc20AssetAddress(assetId: string, chainId: number): Address | null {
  const match = /^eip155:(\d+)\/erc20:(0x[a-fA-F0-9]{40})$/.exec(assetId.trim());
  if (!match) return null;
  if (Number(match[1]) !== chainId) return null;
  return match[2] as Address;
}

const ERC20_TRANSFER_ABI = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export async function verifyEvmTransaction(options: VerifyEvmTransactionOptions): Promise<void> {
  const chainId = parseEip155ChainId(options.networkId);
  const chain = getSafeTargetChains().find((item) => item.chainId === chainId);
  if (!chain) {
    throw new Error(`Unsupported chain for tx verification: ${chainId}`);
  }

  if (!isHexHash(options.txHash)) {
    throw new Error("Invalid txHash format.");
  }

  const client = createPublicClient({
    transport: http(chain.rpcUrl),
  });

  const [tx, receipt] = await Promise.all([
    client.getTransaction({ hash: options.txHash }),
    client.getTransactionReceipt({ hash: options.txHash }),
  ]);

  if (receipt.status !== "success") {
    throw new Error("Transaction receipt status is not success.");
  }

  const expectedTo = normalizeAddress(options.expectedTo ?? null);
  if (expectedTo && tx.to?.toLowerCase() !== expectedTo.toLowerCase()) {
    const normalizedAssetId = normalizeAssetId(options.assetId);
    if (normalizedAssetId === "native") {
      throw new Error("Transaction recipient does not match campaign destination.");
    }
  }

  const minValue = options.minValueBaseUnits ? BigInt(options.minValueBaseUnits) : null;
  const normalizedAssetId = normalizeAssetId(options.assetId);
  if (normalizedAssetId === "native") {
    if (expectedTo && tx.to?.toLowerCase() !== expectedTo.toLowerCase()) {
      throw new Error("Transaction recipient does not match campaign destination.");
    }
    if (minValue !== null && tx.value < minValue) {
      throw new Error("Transaction value is below required contribution amount.");
    }
    return;
  }

  const tokenAddress = parseErc20AssetAddress(normalizedAssetId, chainId);
  if (!tokenAddress) {
    throw new Error("Unsupported ERC-20 asset identifier for EVM verification.");
  }
  if (!tx.to || tx.to.toLowerCase() !== tokenAddress.toLowerCase()) {
    throw new Error("ERC-20 transfer transaction target does not match token address.");
  }

  const decoded = decodeFunctionData({
    abi: ERC20_TRANSFER_ABI,
    data: tx.input,
  });
  if (decoded.functionName !== "transfer") {
    throw new Error("ERC-20 transaction is not a transfer call.");
  }

  const [transferTo, transferAmount] = decoded.args as readonly [Address, bigint];
  if (expectedTo && transferTo.toLowerCase() !== expectedTo.toLowerCase()) {
    throw new Error("ERC-20 transfer recipient does not match campaign destination.");
  }
  if (minValue !== null && transferAmount < minValue) {
    throw new Error("ERC-20 transfer amount is below required contribution amount.");
  }
}
