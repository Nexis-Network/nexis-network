
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { decodeCredentialPublicKey, cose } from "@simplewebauthn/server/helpers";
import { P256Coordinates } from "@/server/wallets/solana/passkey-service";

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const buf = Buffer.from(padded, "base64");
  return new Uint8Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
}

function toBigInt(bytes: Uint8Array): bigint {
  const hex = Buffer.from(bytes).toString("hex") || "00";
  return BigInt(`0x${hex}`);
}

export function extractP256Coordinates(publicKeyB64Url: string): P256Coordinates {
  const coseBytes = fromBase64Url(publicKeyB64Url);
  const decoded = decodeCredentialPublicKey(new Uint8Array(coseBytes)) as UntypedJson as Map<number, UntypedJson>;
  
  const xBytes = decoded.get(cose.COSEKEYS.x);
  const yBytes = decoded.get(cose.COSEKEYS.y);
  
  if (!(xBytes instanceof Uint8Array) || !(yBytes instanceof Uint8Array)) {
    throw new Error("passkey_public_key_missing_xy");
  }
  
  return { x: toBigInt(xBytes), y: toBigInt(yBytes) };
}

export async function getLatestUserPasskeyCoords(userId: string): Promise<P256Coordinates | null> {
  const supabase = getSupabaseAdminClient();
  
  const { data: passkeys } = await supabase
    .from("wallet_passkeys")
    .select("public_key_b64url")
    .eq("user_id", userId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1);

  if (!passkeys?.[0]?.public_key_b64url) {
    return null;
  }

  return extractP256Coordinates(passkeys[0].public_key_b64url);
}
