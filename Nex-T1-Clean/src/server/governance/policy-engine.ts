import { formatEther } from "viem";

export interface TransactionIntent {
  to: string;
  value: string; // in wei, represented as string to avoid precision loss
  data?: string;
  chainId: number;
}

export interface SecurityPolicy {
  globalSpendingLimitUsd: number; // Max daily spend in USD
  dailySpendAccumulatorUsd: number; // Current spend today
  whitelistedAddresses: string[]; // Allowed destinations
  whitelistedMethods?: string[]; // Allowed function selectors
  requiresHumanApproval: boolean; // If true, ALWAYS block and require manual sign
}

export interface ValidationResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Deterministic Policy Engine
 * 
 * This class MUST remain pure and deterministic. 
 * It takes a Policy and an Intent, and returns a Verdict.
 * It does NOT fetch data, it does NOT use AI.
 */
export class PolicyEngine {
  
  /**
   * Validates a transaction against a specific security policy.
   */
  static validate(intent: TransactionIntent, policy: SecurityPolicy, tokenPriceUsd: number = 0): ValidationResult {
    
    // 1. Check for Forced Human Approval
    if (policy.requiresHumanApproval) {
      return { allowed: false, reason: "Policy requires manual human approval for all AI transactions." };
    }

    // 2. Validate Whitelist (Strict Mode)
    // If whitelist is empty, we assume "Allow All" OR "Deny All" depending on config?
    // Safety first: If whitelist has items, we MUST match.
    if (policy.whitelistedAddresses.length > 0) {
      const isWhitelisted = policy.whitelistedAddresses.some(
        addr => addr.toLowerCase() === intent.to.toLowerCase()
      );
      if (!isWhitelisted) {
        return { allowed: false, reason: `Target address ${intent.to} is not in the whitelist.` };
      }
    }

    // 3. Validate Spending Limit
    // Convert intent value (Wei) -> USD
    // We need an Oracle price for this. Passed as arg to keep this function pure.
    if (tokenPriceUsd > 0 && intent.value !== "0") {
      const valueEth = Number(formatEther(BigInt(intent.value)));
      const valueUsd = valueEth * tokenPriceUsd;

      const projectedSpend = policy.dailySpendAccumulatorUsd + valueUsd;

      if (projectedSpend > policy.globalSpendingLimitUsd) {
        return { 
          allowed: false, 
          reason: `Daily spending limit exceeded. Attempted: $${valueUsd.toFixed(2)}, Limit: $${policy.globalSpendingLimitUsd.toFixed(2)}, Current: $${policy.dailySpendAccumulatorUsd.toFixed(2)}`
        };
      }
    }

    // 4. Basic Safety Checks (examples)
    // Prevent sending to Null Address unless burning?
    if (intent.to === "0x0000000000000000000000000000000000000000") {
        return { allowed: false, reason: "Transfer to zero address prevented." };
    }

    return { allowed: true };
  }
}
