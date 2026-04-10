import { defaultEvmWalletMcpClient } from "@/server/services/mcp/evm-wallet-client";

import {
  createTool,
  createToolSchema,
  numberProp,
  stringProp,
  type ToolExecutionContext,
} from "./create-tool";
import { inferChainIdFromArgs, inferProviderUrl, sanitizeProviderUrl } from "./evm-wallet";
import {
  assertAmount,
  assertEvmAddress,
  buildTransferSummary,
  getFallbackChainId,
  resolveStoredWallet,
  validateNativeTransfer,
} from "./evm-wallet-send-asset.helpers";

type EvmWalletSendAssetInput = {
  fromAddress: string;
  toAddress: string;
  amount: string;
  chainId?: number;
  chain?: string;
  tokenAddress?: string;
  providerURL?: string;
};

type EvmWalletSendAssetOutput = {
  approvalRequired: true;
  amount: string;
  chainId: number;
  command: "wallet_send_transaction";
  fromAddress: string;
  text: string;
  toAddress: string;
  tokenAddress?: string;
  txHash?: string;
};

const evmWalletSendAssetSchema = createToolSchema(
  {
    fromAddress: stringProp(
      "The sender agent-wallet address. Call `agent_wallet_list` first if you need to discover the user's managed EVM wallet.",
    ),
    toAddress: stringProp("The EVM recipient address."),
    amount: stringProp("The transfer amount as a decimal string, for example `0.01`."),
    chainId: numberProp("Optional EVM chain ID, for example 8453 for Base."),
    chain: stringProp("Optional chain alias such as Base, Ethereum, Arbitrum, or Optimism."),
    tokenAddress: stringProp(
      "Optional ERC-20 token contract address. Omit for native asset transfers like ETH.",
    ),
    providerURL: stringProp("Optional RPC endpoint override."),
  },
  ["fromAddress", "toAddress", "amount"],
  {
    additionalProperties: false,
    description:
      "Send a native asset or ERC-20 token from one of the user's agent-created EVM wallets. Approval is always required.",
  },
);

export const evmWalletSendAssetTool = createTool<
  EvmWalletSendAssetInput,
  EvmWalletSendAssetOutput
>({
  description:
    "Send a native EVM asset or ERC-20 token from one of the user's agent-created EVM wallets. Use `agent_wallet_list` first when the sender address is not already known.",
  schema: evmWalletSendAssetSchema,
  needsApproval: true,
  execute: async (
    input: EvmWalletSendAssetInput,
    context?: ToolExecutionContext,
  ): Promise<EvmWalletSendAssetOutput> => {
    if (!context?.userId) {
      throw new Error("User ID is required to send assets from a managed EVM wallet.");
    }

    const fromAddress = assertEvmAddress("Sender address", input.fromAddress);
    const toAddress = assertEvmAddress("Recipient address", input.toAddress);
    const amount = assertAmount(input.amount);
    const tokenAddress = input.tokenAddress
      ? assertEvmAddress("Token address", input.tokenAddress)
      : undefined;
    const storedWallet = await resolveStoredWallet(context.userId, fromAddress);
    const requestedChainId =
      inferChainIdFromArgs("wallet_send_transaction", {
        chain: input.chain,
        chainId: input.chainId,
      }) ?? storedWallet.chainId ?? getFallbackChainId();

    const providerURL = inferProviderUrl(
      { chain: input.chain, chainId: requestedChainId },
      sanitizeProviderUrl(input.providerURL) ?? sanitizeProviderUrl(storedWallet.providerURL),
      requestedChainId,
    );

    if (providerURL) {
      const providerResult = await defaultEvmWalletMcpClient.invokeRaw("wallet_provider_set", {
        providerURL,
      });
      if (!providerResult.ok) {
        throw new Error(providerResult.text);
      }
    }

    await validateNativeTransfer({
      amount,
      chainId: requestedChainId,
      toAddress,
      tokenAddress,
    });

    const invocation = await defaultEvmWalletMcpClient.invokeRaw("wallet_send_transaction", {
      amount,
      chainId: requestedChainId,
      from: storedWallet.address,
      metadata: {
        source: "chat.evm_wallet_send_asset",
      },
      recipients: [{ address: toAddress, amount }],
      ...(tokenAddress
        ? { token: tokenAddress, txType: "erc20Transfer" }
        : { txType: "nativeTransfer" }),
    });

    if (!invocation.ok) {
      throw new Error(invocation.text);
    }

    const toolResult = invocation.toolResult as Record<string, UntypedJson> | undefined;
    const txHash =
      typeof toolResult?.transactionHash === "string"
        ? toolResult.transactionHash
        : typeof toolResult?.hash === "string"
          ? toolResult.hash
          : undefined;

    return {
      approvalRequired: true,
      amount,
      chainId: requestedChainId,
      command: "wallet_send_transaction",
      fromAddress: storedWallet.address,
      text: buildTransferSummary({
        amount,
        chainId: requestedChainId,
        fromAddress: storedWallet.address,
        toAddress,
        tokenAddress,
        txHash,
      }),
      toAddress,
      ...(tokenAddress ? { tokenAddress } : {}),
      ...(txHash ? { txHash } : {}),
    };
  },
});
