import { Connection, Keypair } from "@solana/web3.js";
import * as multisig from "@sqds/multisig";
import { derivePasskeyVerifierPda, type P256Coordinates } from "@/server/wallets/solana/passkey-service";

/**
 * Create a new Squads Multisig controlled by a Passkey.
 * 
 * @param connection Solana Connection
 * @param creatorKeypair The payer/creator keypair (Relayer)
 * @param passkeyCoords The user's Passkey X,Y coordinates
 */
export async function createSolanaSquad(
  connection: Connection,
  creatorKeypair: Keypair,
  passkeyCoords: P256Coordinates
) {
  const [passkeyPda] = derivePasskeyVerifierPda(passkeyCoords);

  // 1. Create the Multisig
  // We use the creatorKeypair (Relayer) to pay for initialization.
  // The ONLY member is the Passkey PDA.
  // Threshold is 1.
  
  const createKey = Keypair.generate(); // Unique key for this multisig creation

  // Derive the multisig PDA before sending the create instruction.
  const [multisigPda] = multisig.getMultisigPda({
    createKey: createKey.publicKey,
  });

  const signature = await multisig.rpc.multisigCreate({
    connection,
    createKey,
    creator: creatorKeypair,
    multisigPda,
    configAuthority: null, // Immutable or set to PDA? Set to null for now (immutable config)
    timeLock: 0,
    members: [{
      key: passkeyPda,
      permissions: multisig.types.Permissions.all(),
    }],
    threshold: 1,
  });
  
  return {
    multisigAddress: multisigPda,
    transactionSignature: signature,
    createKey: createKey.publicKey
  };
}
