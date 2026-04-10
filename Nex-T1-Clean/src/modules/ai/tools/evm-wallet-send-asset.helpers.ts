import { parseEther } from "viem";

import { getPrimaryChain } from "@/lib/chains";
import { listStoredWallets, type StoredAgentWallet } from "@/server/wallets/wallet-store";

const EVM_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;
const DECIMAL_AMOUNT_PATTERN = /^\d+(\.\d+)?$/;

export function getFallbackChainId(): number {
  try {
    return getPrimaryChain().id;
  } catch {
    return 1;
  }
}

export function assertEvmAddress(label: string, value: string | undefined): string {
  const normalized = value?.trim();
  if (!normalized || !EVM_ADDRESS_PATTERN.test(normalized)) {
    throw new Error(`${label} must be a valid 0x-prefixed EVM address.`);
  }
  return normalized;
}

export function assertAmount(value: string): string {
  const normalized = value.trim();
  if (!DECIMAL_AMOUNT_PATTERN.test(normalized) || Number.parseFloat(normalized) <= 0) {
    throw new Error("Amount must be a positive numeric string.");
  }
  return normalized;
}

export async function resolveStoredWallet(
  userId: string,
  fromAddress: string,
): Promise<StoredAgentWallet> {
  const normalizedAddress = fromAddress.toLowerCase();
  const storedWallets = await listStoredWallets(userId);
  const wallet = storedWallets.find(
    (candidate) => candidate.address?.toLowerCase() === normalizedAddress,
  );

  if (!wallet) {
    throw new Error(
      "The selected sender address is not one of your managed EVM wallets. Call `agent_wallet_list` first or create a wallet before sending.",
    );
  }

  return wallet;
}

export async function validateNativeTransfer(args: {
  amount: string;
  chainId: number;
  toAddress: string;
  tokenAddress?: string;
}): Promise<void> {
  if (args.tokenAddress) {
    return;
  }

  const { validateTransactionProposal } = await import("@/server/actions/governance");
  const policyResult = await validateTransactionProposal({
    chainId: args.chainId,
    data: "0x",
    to: args.toAddress,
    value: parseEther(args.amount).toString(),
  });

  if (!policyResult.allowed) {
    throw new Error(`Security Policy Blocked: ${policyResult.reason}`);
  }
}

export function buildTransferSummary(args: {
  amount: string;
  chainId: number;
  fromAddress: string;
  toAddress: string;
  tokenAddress?: string;
  txHash?: string;
}): string {
  const assetLabel = args.tokenAddress ? `token ${args.tokenAddress}` : "native asset";
  const transferLine = `Submitted ${args.amount} ${assetLabel} on chain ${args.chainId} from ${args.fromAddress} to ${args.toAddress}.`;
  return args.txHash ? `${transferLine} Transaction hash: ${args.txHash}` : transferLine;
}
