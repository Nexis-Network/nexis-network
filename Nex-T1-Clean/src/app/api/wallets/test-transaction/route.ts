import { z } from "zod";
import type { NextRequest } from "next/server";

import { apiResponse } from "@/lib/api-platform";
import { createClient } from "@/server/services/supabase/server";
import {
  runWalletTestTransaction,
  isWalletTestTransactionEnabled,
} from "@/server/services/wallets/test-transaction";
import { checkRateLimit, txExecuteRateLimit } from "@/server/security/rate-limit";

const RequestSchema = z.object({
  walletId: z.string().min(1),
  chainType: z.enum(["evm", "solana", "stellar"]),
  to: z.string().min(1),
  amount: z.string().min(1),
  confirmationCode: z.string().min(1),
});

export async function POST(request: NextRequest) {
  if (!isWalletTestTransactionEnabled()) {
    return apiResponse.forbidden("Wallet test transactions are disabled.");
  }

  const supabase = await createClient();
  if (!supabase) {
    return apiResponse.serviceUnavailable("Service unavailable");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return apiResponse.unauthorized("Unauthorized");
  }

  const rl = await checkRateLimit(user.id, txExecuteRateLimit);
  if (!rl.success) {
    return apiResponse.error(
      "RATE_LIMITED",
      "Too many wallet test transaction requests",
      429,
    );
  }

  let parsed: z.infer<typeof RequestSchema>;
  try {
    parsed = RequestSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiResponse.validationError(error);
    }
    return apiResponse.badRequest("Invalid request body");
  }

  if (parsed.confirmationCode.trim().toUpperCase() !== "CONFIRM") {
    return apiResponse.forbidden(
      "Confirmation required. Type CONFIRM before submitting.",
    );
  }

  try {
    const result = await runWalletTestTransaction({
      userId: user.id,
      walletId: parsed.walletId,
      chainType: parsed.chainType,
      to: parsed.to,
      amount: parsed.amount,
    });

    return apiResponse.success({
      walletId: parsed.walletId,
      chainType: result.chainType,
      txId: result.txId,
      status: result.status,
      simulated: result.simulated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "wallet_not_found") {
      return apiResponse.error("WALLET_NOT_FOUND", "Wallet not found", 404);
    }
    if (message === "wallet_chain_mismatch") {
      return apiResponse.error(
        "WALLET_CHAIN_MISMATCH",
        "Wallet and chain type do not match.",
        409,
      );
    }
    if (message === "wallet_test_transactions_disabled") {
      return apiResponse.forbidden("Wallet test transactions are disabled.");
    }
    if (message.startsWith("wallet_lookup_failed:")) {
      return apiResponse.serviceUnavailable("Wallet lookup failed.");
    }

    return apiResponse.error(
      "WALLET_TEST_TRANSACTION_FAILED",
      message || "Failed to execute wallet test transaction",
      400,
    );
  }
}

