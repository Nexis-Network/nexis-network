import type { Address, Hex } from "viem";

export type EnsClaimStatus =
  | "pending_signature"
  | "queued"
  | "processing"
  | "pending_mainnet"
  | "pending_reverse"
  | "active"
  | "failed";

export type UserEnsSubnameRecord = {
  id: string;
  user_id: string;
  wallet_address: string;
  label: string;
  ens_name: string;
  chain_id: number;
  status: EnsClaimStatus;
  mainnet_claim_tx_hash: string | null;
  mainnet_reverse_tx_hash: string | null;
  base_reverse_tx_hash: string | null;
  base_reverse_user_op_hash: string | null;
  signature_expiry: string | null;
  mainnet_reverse_signature: string | null;
  base_reverse_signature: string | null;
  mainnet_claimed_at: string | null;
  reverse_name_set_at: string | null;
  last_error: string | null;
  metadata: Record<string, UntypedJson> | null;
  created_at: string;
  updated_at: string;
};

export type UserEnsSubnameStatus = {
  claim: UserEnsSubnameRecord | null;
  walletAddress: string | null;
  canClaim: boolean;
  claimAvailabilityError: string | null;
  suggestedLabel: string;
  validationError: string | null;
};

export type PrepareEnsSubnameClaimResult = {
  claim: UserEnsSubnameRecord;
  walletAddress: Address;
  signatureExpiry: number;
  mainnetReverseHash: Hex;
  baseReverseHash: Hex;
};
