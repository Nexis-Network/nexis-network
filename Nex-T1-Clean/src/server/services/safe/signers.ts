// Domain: wallets (Safe)
// Responsibility: Ensure allowance delegate signer exists (server-managed).
// Depends on: Supabase admin client, wallet-vault, viem/accounts
// Notes:
// - User owner keys are client-generated and verified via signature challenge.
// - Server signers are encrypted at rest using wallet-vault.

import type { Address, Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

import { encryptSecret } from "@/server/security/wallet-vault";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";

type SignerKind = "allowance_delegate";

export type ServerSignerRecord = {
  kind: SignerKind;
  address: Address;
};

export type PasskeyOwnerSource = {
  credentialId: string;
  publicKeyB64Url: string;
};

export type OwnerSources = {
  eoaOwner: Address | null;
  passkey: PasskeyOwnerSource | null;
};

function newServerSigner() {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  return { privateKey: privateKey as Hex, address: account.address as Address };
}

export async function ensureServerSigners(userId: string): Promise<ServerSignerRecord[]> {
  const supabase = getSupabaseAdminClient();

  const { data } = await supabase
    .from("wallet_signers")
    .select("signer_kind,address")
    .eq("user_id", userId)
    .in("signer_kind", ["allowance_delegate"]);

  const existing = new Map<SignerKind, Address>();
  (data ?? []).forEach((row) => {
    if (row?.signer_kind === "allowance_delegate") {
      if (typeof row.address === "string" && row.address.startsWith("0x")) {
        existing.set(row.signer_kind, row.address as Address);
      }
    }
  });

  const toCreate: Array<{ kind: SignerKind; privateKey: Hex; address: Address }> = [];
  for (const kind of ["allowance_delegate"] as const) {
    if (!existing.has(kind)) {
      const signer = newServerSigner();
      toCreate.push({ kind, privateKey: signer.privateKey, address: signer.address });
    }
  }

  if (toCreate.length) {
    const rows = toCreate.map((entry) => ({
      user_id: userId,
      signer_kind: entry.kind,
      address: entry.address,
      server_cipher: encryptSecret(entry.privateKey),
      metadata: { managedBy: "server", createdBy: "safe-provisioner" },
    }));

    const insert = await supabase.from("wallet_signers").insert(rows);
    if (insert.error) {
      throw new Error(`Failed to persist server signers: ${insert.error.message}`);
    }
  }

  return (["allowance_delegate"] as const).map((kind) => ({
    kind,
    address: (existing.get(kind) ?? toCreate.find((c) => c.kind === kind)?.address)!,
  }));
}

export function parseUserOwnerAddress(row: { address?: string | null; metadata?: Record<string, UntypedJson> | null }): Address | null {
  const address = typeof row.address === "string" ? row.address.trim() : "";
  if (!address || !address.startsWith("0x")) return null;
  const meta = row.metadata ?? {};
  const ownerKind = typeof meta?.ownerKind === "string" ? meta.ownerKind : (typeof meta?.type === "string" ? meta.type : "");
  if (ownerKind === "passkey") return null;
  return address as Address;
}

export async function resolveOwnerSources(userId: string): Promise<OwnerSources> {
  const supabase = getSupabaseAdminClient();

  const { data: ownerRows } = await supabase
    .from("wallet_signers")
    .select("address,metadata")
    .eq("user_id", userId)
    .eq("signer_kind", "user_owner")
    .limit(1);

  const eoaOwner = ownerRows?.[0] ? parseUserOwnerAddress(ownerRows[0] as { address?: string | null; metadata?: Record<string, UntypedJson> | null }) : null;

  const { data: passkeys } = await supabase
    .from("wallet_passkeys")
    .select("credential_id,public_key_b64url")
    .eq("user_id", userId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1);

  const passkeyRow = passkeys?.[0] as { credential_id?: string | null; public_key_b64url?: string | null } | undefined;
  const passkey =
    passkeyRow?.credential_id && passkeyRow?.public_key_b64url
      ? { credentialId: passkeyRow.credential_id, publicKeyB64Url: passkeyRow.public_key_b64url }
      : null;

  return { eoaOwner, passkey };
}
