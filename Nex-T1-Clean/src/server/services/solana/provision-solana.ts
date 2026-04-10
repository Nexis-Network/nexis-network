
import { Connection, Keypair } from "@solana/web3.js";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { createSolanaSquad } from "./squads-manager";
import { P256Coordinates } from "@/server/wallets/solana/passkey-service";
import { getLatestUserPasskeyCoords } from "@/server/services/identity/passkeys";
import { provisionLogger } from "@/server/logging/logger";
import bs58 from "bs58";

// Env config
const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";
const RELAYER_PRIVATE_KEY = process.env.SOLANA_RELAYER_PRIVATE_KEY;

export async function provisionSolanaSquad(userId: string, explicitCoords?: P256Coordinates) {
  // 0. Resolve Passkey
  const passkeyCoords = explicitCoords ?? await getLatestUserPasskeyCoords(userId);
  if (!passkeyCoords) {
    throw new Error("No active passkey found for user");
  }
  const supabase = getSupabaseAdminClient();
  const connection = new Connection(RPC_URL, "confirmed");

  // Load Relayer (Fee Payer)
  if (!RELAYER_PRIVATE_KEY) {
    throw new Error("Missing SOLANA_RELAYER_PRIVATE_KEY");
  }
  const relayerKeypair = Keypair.fromSecretKey(bs58.decode(RELAYER_PRIVATE_KEY));

  try {
    provisionLogger.info({ userId }, "Starting Solana Squad provisioning");

    // 1. Create Squad
    const { multisigAddress, transactionSignature, createKey } = await createSolanaSquad(
      connection,
      relayerKeypair,
      passkeyCoords
    );

    provisionLogger.info({ userId, signature: transactionSignature }, "Squads multisig created");

    // 2. Derive deterministic address (sanity check, usually same as multisigAddress)
    // The multisigAddress IS the Smart Wallet address.

    // 3. Store in DB
    // We store the 'createKey' in metadata just in case we need to re-derive or recover.
    const { error } = await supabase.from("wallet_accounts").upsert({
      user_id: userId,
      wallet_type: "squads_v4", // New type we need to add to DB enum
      chain_id: 900, // Solana Chain ID (pseudo-standard: 900 or 101/102/103) - convention: 900=Solana
      address: multisigAddress.toBase58(),
      platform: "svm",
      provider: "squads",
      status: "ready",
      metadata: {
        createKey: createKey.toBase58(),
        passkeyCoords: {
            x: passkeyCoords.x.toString(), // Store as string to avoid BigInt JSON issues
            y: passkeyCoords.y.toString()
        },
        threshold: 1,
      }
    }, { onConflict: "user_id,chain_id,wallet_type" });

    if (error) {
      throw error;
    }

    return multisigAddress.toBase58();

  } catch (error) {
    provisionLogger.error({ userId, error }, "Failed to provision Solana Squad");
    throw error;
  }
}
