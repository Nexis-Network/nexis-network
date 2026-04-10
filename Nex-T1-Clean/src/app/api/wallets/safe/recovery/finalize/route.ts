/**
 * @deprecated Safe Recovery finalize route is deprecated.
 *
 * Safe Core Smart Wallets are being replaced by Nex Wallets.
 * This route previously marked DB records as "finalized" but NEVER called
 * `encodeExecuteRecoveryData` or submitted an on-chain transaction, making
 * the finalization a no-op stub.
 *
 * The route now returns a 410 Gone response to prevent false promises of
 * on-chain recovery execution. Historical DB records in
 * `wallet_recovery_requests` are preserved for audit purposes.
 */

import { apiResponse } from "@/lib/api-platform";
import { logger } from "@/lib/logger";


export async function POST() {
  logger.warn("safe_recovery_finalize_deprecated", {
    message: "Client attempted to call deprecated Safe recovery finalize endpoint",
  });

  return apiResponse.error(
    "FEATURE_DEPRECATED",
    "Safe recovery finalization is no longer available. Safe Core Smart Wallets are being replaced by Nex Wallets. Existing recovery records are preserved for audit purposes.",
    410,
  );
}
