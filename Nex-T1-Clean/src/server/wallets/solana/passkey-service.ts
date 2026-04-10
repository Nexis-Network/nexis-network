import { PublicKey } from "@solana/web3.js";

// --- Configuration ---

export const PASSKEY_VERIFIER_PROGRAM_ID = new PublicKey("2fAdneumFjckZ7ADXy8bKVDVNe7ofx2zzkx5PDtE6gx5");

/**
 * P-256 Coordinates (BigInt)
 */
export interface P256Coordinates {
  x: bigint;
  y: bigint;
}

function bigintToFixedBytesBE(value: bigint, size: number): Buffer {
  if (size <= 0) throw new Error("invalid_size");
  if (value < 0n) throw new Error("negative_bigint_not_supported");
  const hex = value.toString(16).padStart(size * 2, "0");
  if (hex.length > size * 2) {
    throw new Error("bigint_overflow");
  }
  return Buffer.from(hex, "hex");
}

/**
 * Derive the PDA that represents this Passkey on Solana.
 * This PDA will be the "Member" of the Squads Multisig.
 */
export function derivePasskeyVerifierPda(coords: P256Coordinates): [PublicKey, number] {
  // Seeds: [b"passkey_signer", x_bytes (32), y_bytes (32)]
  const xBytes = bigintToFixedBytesBE(coords.x, 32);
  const yBytes = bigintToFixedBytesBE(coords.y, 32);

  return PublicKey.findProgramAddressSync(
    [Buffer.from("passkey_signer"), xBytes, yBytes],
    PASSKEY_VERIFIER_PROGRAM_ID,
  );
}
