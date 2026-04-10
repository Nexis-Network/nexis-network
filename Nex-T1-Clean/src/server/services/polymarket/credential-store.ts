/**
 * Polymarket Credential Store
 *
 * Encrypted storage for user L2 API credentials in Supabase.
 * Uses pgcrypto for symmetric encryption at rest.
 *
 * Security:
 * - Credentials never leave the server
 * - RLS ensures tenant isolation (user_id = auth.uid())
 * - Encryption key from POLYMARKET_CRED_ENCRYPTION_KEY env var
 */

import { logger } from "@/lib/logger";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClobApiKeyCreds } from "./types";
import type { PolymarketSignatureType } from "./constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StoredCredential {
  id: string;
  user_id: string;
  poly_address: string;
  api_key_enc: string;
  secret_enc: string;
  passphrase_enc: string;
  signature_type: number;
  funder_address: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface DecryptedCredential {
  polyAddress: string;
  apiKey: string;
  secret: string;
  passphrase: string;
  signatureType: number;
  funderAddress: string | null;
}

// ---------------------------------------------------------------------------
// Encryption helpers
// ---------------------------------------------------------------------------

const ENCRYPTION_KEY = process.env.POLYMARKET_CRED_ENCRYPTION_KEY ?? "";
const IS_DEV = process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";

/**
 * Encrypt a value using pgcrypto's pgp_sym_encrypt via a Supabase RPC call.
 *
 * In development/test only, falls back to base64 when no key is configured.
 * In production, ALWAYS throws if the encryption key is missing — never
 * store credentials without real encryption.
 */
async function encryptValue(
  supabase: SupabaseClient,
  plaintext: string,
): Promise<string> {
  if (!ENCRYPTION_KEY) {
    if (!IS_DEV) {
      throw new Error(
        "POLYMARKET_CRED_ENCRYPTION_KEY is required in production. " +
          "Refusing to store credentials without encryption.",
      );
    }
    logger.warn("[polymarket:creds] DEV ONLY: No encryption key, using base64 fallback");
    return Buffer.from(plaintext).toString("base64");
  }

  const { data, error } = await supabase.rpc("pgp_sym_encrypt_text", {
    plaintext_val: plaintext,
    key_val: ENCRYPTION_KEY,
  });

  if (error) {
    logger.error("[polymarket:creds] encryption failed", error);
    throw new Error("Failed to encrypt credential");
  }

  return data as string;
}

/**
 * Decrypt a value using pgcrypto's pgp_sym_decrypt via a Supabase RPC call.
 */
async function decryptValue(
  supabase: SupabaseClient,
  ciphertext: string,
): Promise<string> {
  if (!ENCRYPTION_KEY) {
    if (!IS_DEV) {
      throw new Error(
        "POLYMARKET_CRED_ENCRYPTION_KEY is required in production. " +
          "Cannot decrypt credentials without the encryption key.",
      );
    }
    return Buffer.from(ciphertext, "base64").toString("utf-8");
  }

  const { data, error } = await supabase.rpc("pgp_sym_decrypt_text", {
    ciphertext_val: ciphertext,
    key_val: ENCRYPTION_KEY,
  });

  if (error) {
    logger.error("[polymarket:creds] decryption failed", error);
    throw new Error("Failed to decrypt credential");
  }

  return data as string;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

class CredentialStore {
  /**
   * Save L2 API credentials for a user. Encrypts before storage.
   * Upserts on (user_id, poly_address) unique constraint.
   */
  async save(
    supabase: SupabaseClient,
    userId: string,
    polyAddress: string,
    creds: ClobApiKeyCreds,
    signatureType: PolymarketSignatureType,
    funderAddress?: string,
  ): Promise<void> {
    const [apiKeyEnc, secretEnc, passphraseEnc] = await Promise.all([
      encryptValue(supabase, creds.apiKey),
      encryptValue(supabase, creds.secret),
      encryptValue(supabase, creds.passphrase),
    ]);

    const { error } = await supabase.from("polymarket_user_creds").upsert(
      {
        user_id: userId,
        poly_address: polyAddress.toLowerCase(),
        api_key_enc: apiKeyEnc,
        secret_enc: secretEnc,
        passphrase_enc: passphraseEnc,
        signature_type: signatureType,
        funder_address: funderAddress?.toLowerCase() ?? null,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,poly_address" },
    );

    if (error) {
      logger.error("[polymarket:creds] save failed", error);
      throw new Error("Failed to save Polymarket credentials");
    }
  }

  /**
   * Load and decrypt the active L2 credentials for a user.
   * Returns null if no credentials are stored.
   */
  async load(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<DecryptedCredential | null> {
    const { data, error } = await supabase
      .from("polymarket_user_creds")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      if (error?.code !== "PGRST116") {
        // PGRST116 = no rows (expected for new users)
        logger.error("[polymarket:creds] load failed", error);
      }
      return null;
    }

    const stored = data as StoredCredential;

    const [apiKey, secret, passphrase] = await Promise.all([
      decryptValue(supabase, stored.api_key_enc),
      decryptValue(supabase, stored.secret_enc),
      decryptValue(supabase, stored.passphrase_enc),
    ]);

    return {
      polyAddress: stored.poly_address,
      apiKey,
      secret,
      passphrase,
      signatureType: stored.signature_type,
      funderAddress: stored.funder_address,
    };
  }

  /**
   * Deactivate all credentials for a user (soft delete).
   */
  async deactivate(supabase: SupabaseClient, userId: string): Promise<void> {
    const { error } = await supabase
      .from("polymarket_user_creds")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    if (error) {
      logger.error("[polymarket:creds] deactivate failed", error);
      throw new Error("Failed to deactivate Polymarket credentials");
    }
  }

  /**
   * Check if a user has active Polymarket credentials.
   */
  async hasCredentials(supabase: SupabaseClient, userId: string): Promise<boolean> {
    const { count, error } = await supabase
      .from("polymarket_user_creds")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_active", true);

    if (error) {
      logger.error("[polymarket:creds] check failed", error);
      return false;
    }

    return (count ?? 0) > 0;
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

export const credentialStore = new CredentialStore();
export { CredentialStore };
export type { DecryptedCredential };
