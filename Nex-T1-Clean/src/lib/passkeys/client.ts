// Domain: wallets (Safe)
// Responsibility: Client-side WebAuthn (wallet passkeys) helpers.
// Depends on: @simplewebauthn/browser
// Notes:
// - This is NOT Supabase Auth passkeys. These are wallet-scoped passkeys.

import {
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
import { createClient as createSupabaseBrowserClient } from "@/lib/supabase/client";

import { logger } from "@/lib/logger";
export type WalletPasskeyListItem = {
  id: string;
  credential_id: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
  transports: string[] | null;
};

async function resolveSupabaseAuthHeaders(): Promise<Record<string, string>> {
  try {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token?.trim();
    if (!token) {
      return {};
    }
    return {
      Authorization: `Bearer ${token}`,
      "X-Supabase-Auth": token,
    };
  } catch {
    return {};
  }
}

export async function listWalletPasskeys(): Promise<WalletPasskeyListItem[]> {
  const authHeaders = await resolveSupabaseAuthHeaders();
  const res = await fetch("/api/wallets/passkeys/list", {
    credentials: "include",
    headers: authHeaders,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorObj = json?.error;
    throw new Error(String(errorObj?.message ?? errorObj ?? "list_failed"));
  }
  return (json.data?.items ?? []) as WalletPasskeyListItem[];
}

export async function registerWalletPasskey(params?: { email?: string }) {
  const authHeaders = await resolveSupabaseAuthHeaders();
  const res = await fetch("/api/wallets/passkeys/register/options", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...authHeaders },
    body: JSON.stringify({ email: params?.email }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const errorObj = json?.error;
    const errorMsg = errorObj?.message ?? errorObj;
    if (!errorMsg) {
      logger.error(
        "[Passkey Client] Registration failed without error message:",
        {
          status: res.status,
          statusText: res.statusText,
          body: json,
        },
      );
    }
    throw new Error(String(errorMsg ?? "register_options_failed"));
  }

  const options = json.data?.options as PublicKeyCredentialCreationOptionsJSON;
  const challengeToken = json.data?.challengeToken as string | null;

  let attestation;
  try {
    attestation = await startRegistration({ optionsJSON: options });
  } catch (error: UntypedJson) {
    if (error instanceof Error && error.name === "NotAllowedError") {
      throw new Error("Passkey creation cancelled or timed out.");
    }
    throw error;
  }

  const verify = await fetch("/api/wallets/passkeys/register/verify", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...authHeaders },
    body: JSON.stringify({ response: attestation, challengeToken }),
  });
  const verifyJson = await verify.json().catch(() => ({}));
  if (!verify.ok) {
    const errorObj = verifyJson?.error;
    throw new Error(
      String(errorObj?.message ?? errorObj ?? "register_verify_failed"),
    );
  }

  return verifyJson.data as {
    ok: true;
    credentialId: string;
    alreadyExisted?: boolean;
  };
}

export async function authenticateWalletPasskey() {
  const authHeaders = await resolveSupabaseAuthHeaders();
  const res = await fetch("/api/wallets/passkeys/auth/options", {
    method: "POST",
    credentials: "include",
    headers: authHeaders,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorObj = json?.error;
    throw new Error(
      String(errorObj?.message ?? errorObj ?? "auth_options_failed"),
    );
  }

  const options = json.data?.options as PublicKeyCredentialRequestOptionsJSON;
  const challengeToken = json.data?.challengeToken as string | null;

  const assertion = await startAuthentication({ optionsJSON: options });

  const verify = await fetch("/api/wallets/passkeys/auth/verify", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...authHeaders },
    body: JSON.stringify({ response: assertion, challengeToken }),
  });
  const verifyJson = await verify.json().catch(() => ({}));
  if (!verify.ok) {
    const errorObj = verifyJson?.error;
    throw new Error(
      String(errorObj?.message ?? errorObj ?? "auth_verify_failed"),
    );
  }

  return verifyJson.data as { ok: true; credentialId: string };
}

export async function revokeWalletPasskey(id: string) {
  const authHeaders = await resolveSupabaseAuthHeaders();
  const res = await fetch("/api/wallets/passkeys/revoke", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...authHeaders },
    body: JSON.stringify({ id }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorObj = json?.error;
    throw new Error(String(errorObj?.message ?? errorObj ?? "revoke_failed"));
  }
  return { ok: true } as const;
}
