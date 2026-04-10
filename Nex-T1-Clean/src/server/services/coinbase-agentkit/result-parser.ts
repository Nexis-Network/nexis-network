import "server-only";

const TX_HASH_PATTERN = /(?:transaction|tx)\s*(?:hash)?[:.]?\s*(0x[a-fA-F0-9]{64})/i;
const ADDRESS_PATTERN = /(?:address|to|from|receiver)[:.]?\s*(0x[a-fA-F0-9]{40})/i;
const ERROR_INDICATORS = ["error", "failed", "insufficient", "rejected", "revert"];

export type ParsedCoinbaseAgentKitResult = {
  message: string;
  success: boolean;
  txHash?: string;
  address?: string;
  data?: Record<string, unknown>;
};

export function parseCoinbaseAgentKitResult(
  raw: unknown,
  actionName?: string,
): ParsedCoinbaseAgentKitResult {
  if (typeof raw !== "string") {
    return {
      message: JSON.stringify(raw ?? null),
      success: true,
      data: typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : undefined,
    };
  }

  const message = raw.trim();
  if (message.startsWith("{") || message.startsWith("[")) {
    try {
      const data = JSON.parse(message) as Record<string, unknown>;
      const txHashCandidate = [data.transactionHash, data.txHash, data.hash].find(
        (value) => typeof value === "string" && value.trim(),
      ) as string | undefined;
      const addressCandidate = [data.address, data.tokenAddress].find(
        (value) => typeof value === "string" && value.trim(),
      ) as string | undefined;
      const success =
        typeof data.success === "boolean"
          ? data.success
          : !ERROR_INDICATORS.some((indicator) => message.toLowerCase().includes(indicator));

      return {
        message:
          typeof data.error === "string"
            ? data.error
            : typeof data.message === "string"
              ? data.message
              : message,
        success,
        txHash: txHashCandidate,
        address: addressCandidate,
        data,
      };
    } catch {
      // Fall through to plain-string parsing.
    }
  }

  const lowered = message.toLowerCase();
  const result: ParsedCoinbaseAgentKitResult = {
    message,
    success: !ERROR_INDICATORS.some((indicator) => lowered.includes(indicator)),
  };

  const txMatch = message.match(TX_HASH_PATTERN);
  if (txMatch?.[1]) {
    result.txHash = txMatch[1];
  }

  const addressMatch = message.match(ADDRESS_PATTERN);
  if (addressMatch?.[1]) {
    result.address = addressMatch[1];
  }

  if (actionName === "WalletActionProvider_get_wallet_details") {
    const lines = message.split("\n").map((line) => line.trim());
    const networkLine = lines.find((line) => line.includes("Network ID"));
    const chainLine = lines.find((line) => line.includes("Chain ID"));
    const balanceLine = lines.find((line) => line.includes("Native Balance"));

    result.data = {
      networkId: networkLine?.split(":").at(-1)?.trim() ?? null,
      chainId: chainLine?.split(":").at(-1)?.trim() ?? null,
      nativeBalance: balanceLine?.split(":").at(-1)?.trim() ?? null,
    };
  }

  return result;
}

export function sanitizeCoinbaseAgentKitError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const lowered = message.toLowerCase();

  if (lowered.includes("ownership")) return "Wallet ownership verification failed.";
  if (lowered.includes("insufficient")) return "Insufficient balance for this operation.";
  if (lowered.includes("allowance")) return "Token allowance is missing or insufficient.";
  if (lowered.includes("unsupported")) return "This action is not supported on the selected chain.";
  if (lowered.includes("revert")) return "Transaction reverted on-chain. Check parameters and try again.";
  if (lowered.includes("timeout")) return "Operation timed out. Please try again.";

  return "Coinbase AgentKit execution failed.";
}
