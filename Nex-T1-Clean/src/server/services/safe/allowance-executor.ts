// Domain: wallets (Safe)
// Responsibility: Execute Allowance Module transfers (delegate path) with server-held delegate key.
// Depends on: Supabase admin, wallet-vault, safe module deployments, viem
// Notes:
// - On-chain enforcement is performed by the Allowance module.
// - Server-side policy checks are defense-in-depth and reduce blast radius on accidental misuse.

import { createWalletClient, createPublicClient, http, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { decryptSecret, type VaultCipher } from "@/server/security/wallet-vault";
import { resolveSafeDeployments } from "@/server/services/safe/deployments";
import { getSafeTargetChains } from "@/server/services/safe/chains";
import { assertUserOwnsSafeWallet } from "@/server/services/safe/ownership";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

const ALLOWANCE_MODULE_ABI = [
  {
    type: "function",
    name: "executeAllowanceTransfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "safe", type: "address" },
      { name: "token", type: "address" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "paymentToken", type: "address" },
      { name: "payment", type: "uint256" },
      { name: "delegate", type: "address" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
  },
] as const;

type AllowancePolicy = {
  allowances?: Array<{ token: string; maxAmountWei: string }>;
};

function resolveChain(chainId: number) {
  const chain = getSafeTargetChains().find((c) => c.chainId === chainId);
  if (!chain) throw new Error(`Unsupported chainId for Safe: ${chainId}`);
  return chain;
}

function ensureAddress(value: string, field: string): Address {
  const trimmed = value.trim();
  if (!/^0x[0-9a-fA-F]{40}$/u.test(trimmed)) {
    throw new Error(`Invalid ${field}: must be 20-byte hex address`);
  }
  return trimmed as Address;
}

function parseDecimalWei(amountWei: string): bigint {
  if (!/^\d+$/u.test(amountWei)) {
    throw new Error("Invalid amountWei: must be base-10 integer string");
  }
  return BigInt(amountWei);
}

export function assertWithinAllowancePolicy(params: {
  policy: AllowancePolicy;
  token: Address;
  amountWei: bigint;
}): void {
  const allowances = Array.isArray(params.policy.allowances) ? params.policy.allowances : [];
  const allowance = allowances.find((entry) => (entry?.token ?? "").toLowerCase() === String(params.token).toLowerCase());
  if (!allowance) {
    throw new Error("no_allowance_for_token");
  }
  const max = parseDecimalWei(String(allowance.maxAmountWei ?? "0"));
  if (params.amountWei > max) {
    throw new Error("allowance_exceeded");
  }
}

export async function executeAllowanceTransfer(params: {
  userId: string;
  chainId: number;
  safeAddress: string;
  tokenAddress?: string | null; // null/undefined => native
  to: string;
  amountWei: string;
}): Promise<{ txHash: string }>
{
  const chain = resolveChain(params.chainId);
  const deployments = resolveSafeDeployments(chain.chainId);
  if (!deployments.allowanceModule) {
    throw new Error("allowance_module_unavailable");
  }

  await assertUserOwnsSafeWallet({
    userId: params.userId,
    chainId: chain.chainId,
    safeAddress: params.safeAddress,
    requireReady: true,
  });

  const safeAddress = ensureAddress(params.safeAddress, "safeAddress");
  const to = ensureAddress(params.to, "to");
  const token = params.tokenAddress ? ensureAddress(params.tokenAddress, "tokenAddress") : (ZERO_ADDRESS as Address);
  const amount = parseDecimalWei(params.amountWei);

  const supabase = getSupabaseAdminClient();

  // Defense-in-depth: validate policy.
  const { data: policyRow } = await supabase
    .from("agent_policies")
    .select("enabled,policy")
    .eq("user_id", params.userId)
    .eq("chain_id", chain.chainId)
    .maybeSingle();

  if (!policyRow?.enabled) {
    throw new Error("policy_disabled");
  }

  const policy = (policyRow.policy ?? {}) as AllowancePolicy;
  assertWithinAllowancePolicy({ policy, token, amountWei: amount });

  // Load and decrypt server-managed delegate signer.
  const { data: signerRows } = await supabase
    .from("wallet_signers")
    .select("address,server_cipher")
    .eq("user_id", params.userId)
    .eq("signer_kind", "allowance_delegate")
    .limit(1);

  const delegateAddress = (signerRows?.[0]?.address as string | undefined)?.trim() ?? "";
  const cipher = signerRows?.[0]?.server_cipher as VaultCipher | null | undefined;

  if (!delegateAddress || !cipher) {
    throw new Error("missing_allowance_delegate");
  }

  const privateKey = decryptSecret(cipher) as `0x${string}`;
  const account = privateKeyToAccount(privateKey);

  // Send the allowance-module call as the delegate.
  const walletClient = createWalletClient({ account, transport: http(chain.rpcUrl) });
  const publicClient = createPublicClient({ transport: http(chain.rpcUrl) });

  const txHash = await walletClient.writeContract({
    chain: null,
    address: deployments.allowanceModule,
    abi: ALLOWANCE_MODULE_ABI,
    functionName: "executeAllowanceTransfer",
    args: [
      safeAddress,
      token,
      to,
      amount,
      ZERO_ADDRESS,
      0n,
      ensureAddress(delegateAddress, "delegate"),
      "0x", // delegate-as-sender path
    ],
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });

  return { txHash };
}
