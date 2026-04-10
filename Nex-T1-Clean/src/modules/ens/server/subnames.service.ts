import "server-only";

import { type Hex } from "viem";

import {
  buildBaseReverseMessageHash,
  buildDefaultReverseMessageHash,
  buildEnsFullName,
  validateEnsSubnameLabel,
} from "@/modules/ens/shared/claim-helpers";
import {
  ENS_SUBNAME_RUNTIME_UNAVAILABLE_MESSAGE,
  assertEnsSubnameRuntimeReady,
  getEnsSubnameRuntimeReadiness,
} from "@/modules/ens/server/subnames.runtime";

import {
  getClaimRecord,
  getCurrentProfileLabel,
  isLabelReservedByAnotherUser,
  lookupEnsSubnameByAddress,
  updateClaimRecord,
  upsertClaimRecord,
} from "./subnames.repository";
import { enqueueEnsSubnameClaim } from "./subnames.worker";
import { ensureSmartWalletAddress } from "./subnames.wallets";
import type {
  PrepareEnsSubnameClaimResult,
  UserEnsSubnameStatus,
} from "./subnames.types";

const SIGNATURE_TTL_SECONDS = 30 * 60;

function isMissingEnsClaimStoreError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : "";
  return (
    message.includes("user_ens_subnames") &&
    (message.includes("schema cache") || message.includes("does not exist"))
  );
}

function toSignatureExpiryIso(): { epochSeconds: number; iso: string } {
  const epochSeconds = Math.floor(Date.now() / 1000) + SIGNATURE_TTL_SECONDS;
  return { epochSeconds, iso: new Date(epochSeconds * 1000).toISOString() };
}

export async function hasActiveEnsSubname(userId: string): Promise<boolean> {
  const claim = await getClaimRecord(userId).catch((error) => {
    if (isMissingEnsClaimStoreError(error)) {
      return null;
    }

    throw error;
  });
  return claim?.status === "active";
}

export async function getActiveEnsNameForUser(userId: string): Promise<string | null> {
  const claim = await getClaimRecord(userId).catch((error) => {
    if (isMissingEnsClaimStoreError(error)) {
      return null;
    }

    throw error;
  });
  return claim?.status === "active" ? claim.ens_name : null;
}

export { lookupEnsSubnameByAddress };

export async function isEnsSubnameLabelAvailable(params: {
  userId: string;
  label: string;
}): Promise<{ available: boolean; reason: string | null; normalizedLabel: string }> {
  const validation = validateEnsSubnameLabel(params.label);
  if (!validation.success) {
    return {
      available: false,
      reason: validation.error,
      normalizedLabel: params.label.trim().toLowerCase(),
    };
  }

  const reserved = await isLabelReservedByAnotherUser(
    params.userId,
    validation.normalizedLabel,
  );

  return {
    available: !reserved,
    reason: reserved ? "Username is already taken." : null,
    normalizedLabel: validation.normalizedLabel,
  };
}

export async function getEnsSubnameStatus(
  userId: string,
  email?: string | null,
): Promise<UserEnsSubnameStatus> {
  const readiness = getEnsSubnameRuntimeReadiness();
  let claimStoreUnavailable = false;
  const [claim, profileLabel] = await Promise.all([
    getClaimRecord(userId).catch((error) => {
      if (isMissingEnsClaimStoreError(error)) {
        claimStoreUnavailable = true;
        return null;
      }

      throw error;
    }),
    getCurrentProfileLabel(userId),
  ]);

  const normalizedSuggestion = profileLabel?.trim().toLowerCase() ?? "";
  const validation = normalizedSuggestion
    ? validateEnsSubnameLabel(normalizedSuggestion)
    : { success: true as const, normalizedLabel: "" };

  const walletAddress = await ensureSmartWalletAddress(userId, email).catch(() => null);
  const canClaim =
    !claimStoreUnavailable &&
    readiness.ready &&
    (!claim ||
      claim.status === "failed" ||
      claim.status === "pending_signature");
  const claimAvailabilityError = claimStoreUnavailable
    ? ENS_SUBNAME_RUNTIME_UNAVAILABLE_MESSAGE
    : readiness.message;

  return {
    claim,
    walletAddress,
    canClaim,
    claimAvailabilityError: claim?.status === "active" ? null : claimAvailabilityError,
    suggestedLabel: validation.success ? validation.normalizedLabel : "",
    validationError:
      validation.success || !normalizedSuggestion ? null : validation.error,
  };
}

export async function prepareEnsSubnameClaim(params: {
  userId: string;
  email?: string | null;
  requestedLabel: string;
}): Promise<PrepareEnsSubnameClaimResult> {
  assertEnsSubnameRuntimeReady();

  const validation = validateEnsSubnameLabel(params.requestedLabel);
  if (!validation.success) {
    throw new Error(validation.error);
  }

  const existingClaim = await getClaimRecord(params.userId);
  if (existingClaim?.status === "active") {
    throw new Error("You already have an active ENS subname.");
  }

  if (
    !existingClaim ||
    existingClaim.label !== validation.normalizedLabel ||
    existingClaim.status === "failed"
  ) {
    const reserved = await isLabelReservedByAnotherUser(
      params.userId,
      validation.normalizedLabel,
    );
    if (reserved) {
      throw new Error("Username is already taken.");
    }
  }

  const walletAddress = await ensureSmartWalletAddress(params.userId, params.email);
  const ensName = buildEnsFullName(validation.normalizedLabel);
  const { epochSeconds, iso } = toSignatureExpiryIso();

  const claim = await upsertClaimRecord(params.userId, {
    wallet_address: walletAddress.toLowerCase(),
    label: validation.normalizedLabel,
    ens_name: ensName,
    status: "pending_signature",
    signature_expiry: iso,
    mainnet_reverse_signature: null,
    base_reverse_signature: null,
    mainnet_reverse_tx_hash: null,
    base_reverse_tx_hash: null,
    mainnet_claim_tx_hash: null,
    last_error: null,
    metadata: {
      source: "app",
      requestedAt: new Date().toISOString(),
    },
  });

  return {
    claim,
    walletAddress,
    signatureExpiry: epochSeconds,
    mainnetReverseHash: buildDefaultReverseMessageHash({
      address: walletAddress,
      expiry: BigInt(epochSeconds),
      name: ensName,
    }),
    baseReverseHash: buildBaseReverseMessageHash({
      address: walletAddress,
      expiry: BigInt(epochSeconds),
      name: ensName,
    }),
  };
}

export async function submitEnsSubnameClaim(params: {
  userId: string;
  claimId: string;
  mainnetReverseSignature: Hex;
  baseReverseSignature: Hex;
}) {
  assertEnsSubnameRuntimeReady();

  const claim = await getClaimRecord(params.userId);
  if (!claim || claim.id !== params.claimId) {
    throw new Error("ENS claim session not found.");
  }

  if (claim.status === "active") {
    return claim;
  }

  const updated = await updateClaimRecord(params.userId, {
    status: "queued",
    mainnet_reverse_signature: params.mainnetReverseSignature,
    base_reverse_signature: params.baseReverseSignature,
    last_error: null,
  });

  await enqueueEnsSubnameClaim(params.userId);
  return updated;
}
