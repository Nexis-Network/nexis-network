import "server-only";

import { z } from "zod";

import { logger } from "@/lib/logger";
import {
  getNetworkCapabilities,
  resolveCdpSignAndSendNetwork,
} from "@/lib/networks/capabilities";
import { getCdpClient } from "@/server/services/cdp/client";
import { verifyCdpWalletOwnership } from "@/server/services/cdp/ownership";

const evmAddressRegex = /^0x[a-fA-F0-9]{40}$/;

const sendEvmTransactionSchema = z.object({
  fromAddress: z.string().regex(evmAddressRegex, "Invalid EVM fromAddress"),
  chainId: z.union([z.number().int().positive(), z.string().min(1)]),
  to: z.string().regex(evmAddressRegex, "Invalid EVM to address").optional(),
  data: z.string().regex(/^0x([a-fA-F0-9]{2})*$/, "Invalid hex calldata").optional(),
  valueWei: z
    .union([z.string().regex(/^\d+$/, "valueWei must be a base-unit integer string"), z.number().int().nonnegative()])
    .optional(),
}).superRefine((value, ctx) => {
  if (!value.to && !value.data) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Either `to` or `data` must be provided for an EVM transaction.",
      path: ["to"],
    });
  }
});

export type SendEvmTransactionParams = z.infer<typeof sendEvmTransactionSchema>;

export type SendEvmTransactionResult = {
  txHash: string;
  status: "submitted";
};

export async function sendEvmTransactionViaCdp(
  params: SendEvmTransactionParams,
  callerUserId: string,
  options?: { agentId?: string },
): Promise<SendEvmTransactionResult> {
  const parsed = sendEvmTransactionSchema.parse(params);

  const isOwner = await verifyCdpWalletOwnership(callerUserId, parsed.fromAddress, {
    agentId: options?.agentId,
  });
  if (!isOwner) {
    throw new Error("Wallet ownership verification failed. The address is not linked to your account.");
  }

  const cdp = await getCdpClient();
  if (!cdp) {
    throw new Error("CDP server client not available. Check CDP_API_KEY_ID and CDP_API_KEY_SECRET.");
  }

  const network = resolveCdpSignAndSendNetwork(parsed.chainId);
  const supportedChainIds = getNetworkCapabilities()
    .filter((capability) => capability.cdpSignAndSend)
    .map((capability) => capability.chainId)
    .join(", ");

  if (!network) {
    throw new Error(
      `Unsupported EVM chain for CDP: ${parsed.chainId}. Supported: ${supportedChainIds}`,
    );
  }

  logger.info("cdp_evm_tx_started", {
    userId: callerUserId,
    from: parsed.fromAddress,
    to: parsed.to ?? null,
    chainId: String(parsed.chainId),
    hasData: Boolean(parsed.data),
    agentId: options?.agentId ?? null,
  });

  const result = await cdp.evm.sendTransaction({
    address: parsed.fromAddress as `0x${string}`,
    transaction: {
      ...(parsed.to ? { to: parsed.to as `0x${string}` } : {}),
      ...(parsed.data ? { data: parsed.data as `0x${string}` } : {}),
      value: BigInt(parsed.valueWei ?? 0),
    },
    network,
  });

  return {
    txHash: result.transactionHash,
    status: "submitted",
  };
}
