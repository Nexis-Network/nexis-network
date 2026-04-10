/**
 * AgentKit Result Parser
 *
 * AgentKit actions return `Promise<string>` — plain text descriptions
 * of what happened. Our tool pipeline expects structured objects.
 *
 * This module parses common AgentKit response patterns into structured
 * objects that the chat UI can render as rich cards.
 */

import { logger } from "@/lib/logger";

export interface ParsedAgentKitResult {
  /** Raw text from AgentKit */
  message: string;
  /** Extracted transaction hash, if any */
  txHash?: string;
  /** Extracted wallet address, if any */
  address?: string;
  /** Extracted amount, if any */
  amount?: string;
  /** Extracted token symbol, if any */
  token?: string;
  /** Whether the action succeeded (heuristic) */
  success: boolean;
  /** Any additional structured data extracted */
  data?: Record<string, unknown>;
}

// Common patterns in AgentKit response strings
const TX_HASH_PATTERN = /(?:transaction|tx)\s*(?:hash)?[:.]?\s*(0x[a-fA-F0-9]{64})/i;
const SOLANA_TX_PATTERN = /(?:transaction|signature)[:.]?\s*([1-9A-HJ-NP-Za-km-z]{87,88})/i;
const ADDRESS_PATTERN = /(?:address|to|from)[:.]?\s*(0x[a-fA-F0-9]{40})/i;
const AMOUNT_PATTERN = /(?:transferred|sent|swapped|deposited|withdrew|bridged)\s+([0-9.]+)\s*(\w+)/i;
const ERROR_INDICATORS = ["error", "failed", "insufficient", "rejected", "revert"];

/**
 * Parse an AgentKit action result string into structured data.
 */
export function parseAgentKitResult(raw: string, actionName?: string): ParsedAgentKitResult {
  const message = raw.trim();
  const lowered = message.toLowerCase();

  // Detect failure
  const success = !ERROR_INDICATORS.some((indicator) => lowered.includes(indicator));

  const result: ParsedAgentKitResult = { message, success };

  // Extract EVM transaction hash
  const txMatch = message.match(TX_HASH_PATTERN);
  if (txMatch?.[1]) {
    result.txHash = txMatch[1];
  }

  // Extract Solana transaction signature
  if (!result.txHash) {
    const solMatch = message.match(SOLANA_TX_PATTERN);
    if (solMatch?.[1]) {
      result.txHash = solMatch[1];
    }
  }

  // Extract address
  const addrMatch = message.match(ADDRESS_PATTERN);
  if (addrMatch?.[1]) {
    result.address = addrMatch[1];
  }

  // Extract amount + token
  const amountMatch = message.match(AMOUNT_PATTERN);
  if (amountMatch) {
    result.amount = amountMatch[1];
    result.token = amountMatch[2];
  }

  // Action-specific parsing
  if (actionName) {
    try {
      result.data = parseActionSpecific(message, actionName);
    } catch (err) {
      logger.warn("agentkit_result_parse_action_specific_failed", {
        actionName,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return result;
}

/**
 * Sanitize error messages before returning to the AI context/client.
 * Maps internal error patterns to generic user-facing messages.
 */
export function sanitizeToolError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();

  if (lower.includes("does not belong") || lower.includes("ownership"))
    return "Wallet ownership verification failed.";
  if (lower.includes("insufficient") || lower.includes("not enough"))
    return "Insufficient balance for this operation.";
  if (lower.includes("rate limit") || lower.includes("too many"))
    return "Rate limit exceeded. Please try again later.";
  if (lower.includes("not configured") || lower.includes("module_not_found"))
    return "Service temporarily unavailable.";
  if (lower.includes("reverted") || lower.includes("revert"))
    return "Transaction reverted on-chain. Check parameters and try again.";
  if (lower.includes("timeout") || lower.includes("timed out"))
    return "Operation timed out. Please try again.";
  if (lower.includes("rejected") || lower.includes("denied"))
    return "Operation was rejected.";

  // Generic fallback — never leak internal details
  return "Operation failed. Please try again.";
}

/**
 * Action-specific parsing for known AgentKit actions.
 */
function parseActionSpecific(
  message: string,
  actionName: string,
): Record<string, unknown> | undefined {
  switch (actionName) {
    case "get_wallet_details": {
      // Try to extract wallet address and network from the response
      const addressMatch = message.match(/(0x[a-fA-F0-9]{40})/);
      const networkMatch = message.match(/(?:network|chain)[:.]?\s*(\w[\w-]*)/i);
      if (addressMatch || networkMatch) {
        return {
          walletAddress: addressMatch?.[1],
          network: networkMatch?.[1],
        };
      }
      return undefined;
    }
    case "get_balance":
    case "get_erc20_token_address": {
      // Try to parse balance value
      const balanceMatch = message.match(/(?:balance|amount)[:.]?\s*([0-9.]+)/i);
      if (balanceMatch) {
        return { balance: balanceMatch[1] };
      }
      return undefined;
    }
    case "fetch_price": {
      // Try to extract price
      const priceMatch = message.match(/\$?([0-9,.]+)/);
      if (priceMatch) {
        return { price: priceMatch[1].replace(/,/g, "") };
      }
      return undefined;
    }
    default:
      return undefined;
  }
}
