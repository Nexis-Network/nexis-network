import "server-only";

import { getAddress } from "viem";

import { getErrorMessage } from "@/lib/utils/error";
import { enqueueJob } from "@/server/queues/enqueue";
import { invalidateProfileAggregate } from "@/server/profile/profile-cache";
import { invalidateUserWalletsCache } from "@/server/wallets/user-wallets";

import {
  claimMainnetSubname,
  setBaseReverseName,
  setMainnetReverseName,
} from "./subnames.onchain";
import {
  getClaimRecord,
  updateClaimRecord,
} from "./subnames.repository";
import { setProfileUsername, setWalletLabel } from "./subnames.wallets";
import type { UserEnsSubnameRecord } from "./subnames.types";

function getSignatureExpiryEpoch(claim: UserEnsSubnameRecord): number {
  if (!claim.signature_expiry) {
    throw new Error("ENS claim is missing signature expiry.");
  }

  const parsed = Date.parse(claim.signature_expiry);
  if (!Number.isFinite(parsed)) {
    throw new Error("ENS claim has an invalid signature expiry.");
  }

  return Math.floor(parsed / 1000);
}

function requireSignature(
  signature: string | null,
  field: "mainnet" | "base",
): `0x${string}` {
  if (!signature || !/^0x[0-9a-fA-F]+$/.test(signature)) {
    throw new Error(`ENS claim is missing the ${field} reverse signature.`);
  }

  return signature as `0x${string}`;
}

export async function enqueueEnsSubnameClaim(userId: string): Promise<void> {
  await enqueueJob("ens_subname_claim", { userId });
}

export async function processQueuedEnsSubnameClaim(userId: string): Promise<void> {
  const claim = await getClaimRecord(userId);
  if (!claim) {
    throw new Error("No ENS claim was found for this user.");
  }

  if (claim.status === "active") {
    return;
  }

  const walletAddress = getAddress(claim.wallet_address);
  const signatureExpiry = getSignatureExpiryEpoch(claim);

  await updateClaimRecord(userId, {
    status: "processing",
    last_error: null,
  });

  try {
    const mainnetClaimTxHash =
      claim.mainnet_claim_tx_hash ??
      (await claimMainnetSubname(walletAddress, claim.label));

    const mainnetReverseTxHash =
      claim.mainnet_reverse_tx_hash ??
      (await setMainnetReverseName({
        walletAddress,
        ensName: claim.ens_name,
        signature: requireSignature(claim.mainnet_reverse_signature, "mainnet"),
        signatureExpiry,
      }));

    const baseReverseTxHash =
      claim.base_reverse_tx_hash ??
      (await setBaseReverseName({
        walletAddress,
        ensName: claim.ens_name,
        signature: requireSignature(claim.base_reverse_signature, "base"),
        signatureExpiry,
      }));

    await updateClaimRecord(userId, {
      status: "active",
      mainnet_claim_tx_hash: mainnetClaimTxHash,
      mainnet_reverse_tx_hash: mainnetReverseTxHash,
      base_reverse_tx_hash: baseReverseTxHash,
      mainnet_claimed_at: claim.mainnet_claimed_at ?? new Date().toISOString(),
      reverse_name_set_at: new Date().toISOString(),
      last_error: null,
    });

    await Promise.all([
      setProfileUsername(userId, claim.label, true),
      setWalletLabel(userId, walletAddress, claim.ens_name),
      invalidateProfileAggregate(userId),
      invalidateUserWalletsCache(userId),
    ]);
  } catch (error) {
    await updateClaimRecord(userId, {
      status: "failed",
      last_error: getErrorMessage(error, "ENS claim failed."),
    });
    throw error;
  }
}
