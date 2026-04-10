import {
  AuthApiError,
  type SignInWithOAuthCredentials,
  type SupabaseClient,
} from "@supabase/supabase-js";
import type { QueryClient } from "@tanstack/react-query";

import { syncBackendSessions } from "@/lib/auth/session-sync";
import { getProviderConfig } from "@/lib/auth/config";
import { getSupabaseConfig } from "@/lib/supabase/config";

import { logger } from "@/lib/logger";
type OAuthProviderConfig = {
  id: string;
  label: string;
};

type SupabaseWebAuthnAuthClient = SupabaseClient["auth"] & {
  signInWithWebAuthn?: (params: {
    email?: string;
  }) => Promise<{ error: Error | AuthApiError | null }>;
  signUpWithWebAuthn?: (params: {
    email: string;
    options?: { emailRedirectTo?: string; data?: Record<string, string> };
  }) => Promise<{ error: Error | AuthApiError | null }>;
};

export type LoginControllerCoreDeps = {
  supabaseClient: SupabaseClient | null;
  queryClient: QueryClient;
  normalizedInviteCode?: string | null;
};

export class LoginControllerCore {
  private readonly supabaseClient: SupabaseClient | null;
  private readonly queryClient: QueryClient;
  private readonly normalizedInviteCode: string | null | undefined;

  constructor(params: LoginControllerCoreDeps) {
    this.supabaseClient = params.supabaseClient;
    this.queryClient = params.queryClient;
    this.normalizedInviteCode = params.normalizedInviteCode;
  }

  async requestPhoneOtp(
    phone: string,
    metadata?: { inviteCode?: string | null; mode?: string },
  ): Promise<void> {
    const response = await fetch("/api/auth/phone/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        phone,
        invite_code: metadata?.inviteCode ?? this.normalizedInviteCode,
        mode: metadata?.mode,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      const message =
        typeof payload?.message === "string"
          ? payload.message
          : "Failed to request verification code.";
      throw new Error(message);
    }
  }

  async verifyPhoneOtp(
    phone: string,
    token: string,
  ): Promise<{ accessToken: string | null }> {
    const response = await fetch("/api/auth/phone/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ phone, token }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message =
        typeof payload?.message === "string"
          ? payload.message
          : "Invalid or expired verification code.";
      throw new Error(message);
    }

    const sessionPayload = payload?.session;
    if (sessionPayload) {
      await this.applySupabaseSessionFromPayload(sessionPayload);
    }

    const accessToken =
      typeof sessionPayload?.access_token === "string"
        ? sessionPayload.access_token
        : null;

    await this.refreshSession({ supabaseAccessToken: accessToken });
    if (accessToken && this.normalizedInviteCode) {
      await this.applyInviteMetadata();
    }

    return { accessToken };
  }

  async verifyEmailOtp(
    email: string,
    token: string,
  ): Promise<{ accessToken: string | null }> {
    if (!this.supabaseClient) {
      throw new Error("Supabase is not configured for email OTP verification.");
    }

    const { data, error } = await this.supabaseClient.auth.verifyOtp({
      email,
      token,
      type: "email",
    });

    if (error) {
      throw new Error(error.message);
    }

    const sessionPayload = data?.session ?? null;
    if (sessionPayload) {
      await this.applySupabaseSessionFromPayload(sessionPayload);
    }

    const accessToken =
      typeof sessionPayload?.access_token === "string"
        ? sessionPayload.access_token
        : null;

    await this.refreshSession({ supabaseAccessToken: accessToken });
    if (accessToken && this.normalizedInviteCode) {
      await this.applyInviteMetadata();
    }

    return { accessToken };
  }

  async signInWithPassword(email: string, password: string): Promise<void> {
    if (!this.supabaseClient) {
      throw new Error("Supabase is not configured for credential sign-in.");
    }
    const { error } = await this.supabaseClient.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      throw new Error(error.message);
    }
    await this.refreshSession();
  }

  async signUpWithPassword(
    email: string,
    password: string,
    options?: { redirectTo?: string },
  ): Promise<void> {
    if (!this.supabaseClient) {
      throw new Error("Supabase is not configured for credential sign-up.");
    }

    const signUpOptions: Parameters<SupabaseClient["auth"]["signUp"]>[0] = {
      email,
      password,
      options: {
        ...(options?.redirectTo ? { emailRedirectTo: options.redirectTo } : {}),
        ...(this.normalizedInviteCode
          ? { data: { invite_code: this.normalizedInviteCode } }
          : {}),
      },
    };

    const { error } = await this.supabaseClient.auth.signUp(signUpOptions);
    if (error) {
      throw new Error(error.message);
    }

    await this.refreshSession();
    await this.applyInviteMetadata();
  }

  async resetPassword(
    email: string,
    options?: { redirectTo?: string },
  ): Promise<void> {
    if (!this.supabaseClient) {
      throw new Error("Supabase is not configured for password reset.");
    }

    const { error } = await this.supabaseClient.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: options?.redirectTo,
      },
    );

    if (error) {
      throw new Error(error.message);
    }
  }

  async signInWithPasskey(email?: string): Promise<void> {
    if (!this.supabaseClient) {
      throw new Error("Supabase is not configured for passkey sign-in.");
    }
    const authClient = this.supabaseClient.auth as SupabaseWebAuthnAuthClient;
    const webAuthn = authClient.signInWithWebAuthn;
    if (typeof webAuthn !== "function") {
      throw new Error(
        "Passkeys are not enabled: upgrade @supabase/supabase-js and enable WebAuthn in Supabase Auth settings.",
      );
    }

    const { error } = await webAuthn({
      email,
    });
    if (error) {
      throw new Error(error.message);
    }
    // Note: signInWithWebAuthn might not immediately complete if it requires browser interaction.
    // The session refresh usually happens after the browser flow completes.
  }

  async signUpWithPasskey(
    email: string,
    options?: { redirectTo?: string },
  ): Promise<void> {
    if (!this.supabaseClient) {
      throw new Error("Supabase is not configured for passkey sign-up.");
    }
    const authClient = this.supabaseClient.auth as SupabaseWebAuthnAuthClient;
    const webAuthnSignup = authClient.signUpWithWebAuthn;
    if (typeof webAuthnSignup !== "function") {
      throw new Error(
        "Passkeys are not enabled: upgrade @supabase/supabase-js and enable WebAuthn in Supabase Auth settings.",
      );
    }

    const { error } = await webAuthnSignup({
      email,
      options: {
        ...(options?.redirectTo ? { emailRedirectTo: options.redirectTo } : {}),
        ...(this.normalizedInviteCode
          ? { data: { invite_code: this.normalizedInviteCode } }
          : {}),
      },
    });
    if (error) {
      throw new Error(error.message);
    }
  }

  async handleOAuthProvider(
    provider: OAuthProviderConfig,
    options: { redirectTo?: string },
  ) {
    if (!this.supabaseClient) {
      throw new Error("Supabase is not configured for OAuth sign-in.");
    }

    const providerSlug = provider.id;
    const config = getProviderConfig(providerSlug);
    const scopes = config?.scopes;
    const queryParams = config?.queryParams;
    const providerForSupabase = (config?.id ?? providerSlug) as SignInWithOAuthCredentials["provider"];

    // For local development, rewrite provider callback origins back to the
    // local app origin when the browser is running on localhost.
    let redirectTo = options.redirectTo;
    if (
      process.env.NODE_ENV === "development" &&
      typeof window !== "undefined" &&
      redirectTo
    ) {
      try {
        const url = new URL(redirectTo);
        const isLocalBrowser =
          window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1";
        const isAuthCallback = url.pathname === "/auth/callback";
        if (isLocalBrowser && isAuthCallback && url.origin !== window.location.origin) {
          url.protocol = window.location.protocol;
          url.hostname = window.location.hostname;
          url.port = window.location.port;
          redirectTo = url.toString();
        }
      } catch {
        // If URL parsing fails, keep original
      }
    }

    const { error, data } = await this.supabaseClient.auth.signInWithOAuth({
      provider: providerForSupabase,
      options: {
        redirectTo,
        scopes,
        queryParams,
      },
    });

    if (error) {
      throw error;
    }

    const url = data?.url ?? null;
    if (!url) {
      return null;
    }

    // Defensive guard: when a provider is misconfigured, Supabase can return the
    // project root (which responds with {"error":"requested path is invalid"}).
    // Avoid navigating users there; surface an actionable error instead.
    if (!/^https?:\/\//iu.test(url)) {
      throw new Error("Supabase returned an invalid OAuth redirect URL.");
    }

    try {
      const resolved = new URL(url);
      const supabaseBase = getSupabaseConfig()?.url;
      if (supabaseBase) {
        const base = new URL(supabaseBase);
        const normalizedPath = resolved.pathname.replace(/\/+$/, "") || "/";
        if (resolved.origin === base.origin && normalizedPath === "/") {
          throw new Error(
            "OAuth provider redirect is misconfigured. Ensure the provider callback URL is set to /auth/v1/callback in the provider console.",
          );
        }
      }
    } catch (parseError) {
      if (parseError instanceof Error) {
        throw parseError;
      }
      throw new Error("Supabase returned an invalid OAuth redirect URL.");
    }

    return url;
  }

  async refreshSession(options?: { supabaseAccessToken?: string | null }) {
    if (!this.supabaseClient) {
      return;
    }

    let accessToken: string | null = options?.supabaseAccessToken ?? null;
    if (!accessToken) {
      try {
        const { data } = await this.supabaseClient.auth.getSession();
        accessToken = data.session?.access_token ?? null;
      } catch (error) {
        const handled = await this.handleSupabaseSessionErrorInternal(error);
        if (!handled) {
          logger.warn("supabase_session_fetch_failed", error);
        }
        if (handled) {
          return;
        }
      }
    }

    if (!accessToken) {
      this.queryClient.invalidateQueries({ queryKey: ["auth-status"] });
      return;
    }

    try {
      await syncBackendSessions(accessToken);
    } catch (error) {
      logger.warn("supabase_backend_session_sync_failed", error);
    }

    this.queryClient.invalidateQueries({ queryKey: ["auth-status"] });
    this.queryClient.invalidateQueries({ queryKey: ["profile-aggregate"] });
    this.queryClient.invalidateQueries({ queryKey: ["smart-wallets"] });
  }

  async handleSessionError(error: UntypedJson): Promise<boolean> {
    return this.handleSupabaseSessionErrorInternal(error);
  }

  async applySessionFromPayload(
    payload: Record<string, UntypedJson> | null | undefined,
  ) {
    if (!payload) return;
    await this.applySupabaseSessionFromPayload(payload);
  }

  private async handleSupabaseSessionErrorInternal(
    error: UntypedJson,
  ): Promise<boolean> {
    if (
      error instanceof AuthApiError &&
      (error.code === "refresh_token_not_found" ||
        (typeof error.message === "string" &&
          error.message.toLowerCase().includes("refresh token")))
    ) {
      logger.warn("supabase_refresh_token_missing", error);
      try {
        await this.supabaseClient?.auth.signOut();
      } catch (signOutError) {
        logger.warn(
          "supabase_sign_out_after_refresh_token_error_failed",
          signOutError,
        );
      }
      this.queryClient.invalidateQueries({ queryKey: ["auth-status"] });
      this.queryClient.invalidateQueries({ queryKey: ["profile-aggregate"] });
      this.queryClient.invalidateQueries({ queryKey: ["smart-wallets"] });
      return true;
    }
    return false;
  }

  private async applySupabaseSessionFromPayload(
    payload: Record<string, UntypedJson>,
  ) {
    const accessToken =
      typeof payload?.access_token === "string"
        ? payload.access_token
        : typeof payload?.accessToken === "string"
          ? payload.accessToken
          : undefined;
    const refreshToken =
      typeof payload?.refresh_token === "string"
        ? payload.refresh_token
        : typeof payload?.refreshToken === "string"
          ? payload.refreshToken
          : undefined;

    if (!accessToken || !refreshToken || !this.supabaseClient) {
      return;
    }

    const { error } = await this.supabaseClient.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error && error.message !== "No user after sign in") {
      logger.warn("supabase_set_session_failed", error.message);
    }
  }

  async provisionWallet() {
    if (!this.supabaseClient) return;

    try {
      // 1. Check if we need to register a signer (Non-Custodial Flow)
      // Ideally, we check this via an API, but for now we can infer it or try to register.
      // Optimization: We could check `wallet_signers` existence first, but let's try to register if missing.

      const {
        data: { user },
      } = await this.supabaseClient.auth.getUser();
      if (!user) return; // Should be logged in

      // NOTE: In a real app, we should check if the user *already* has a wallet before prompting.
      // For this implementation, we assume if `provisionWallet` is called (e.g. on fresh login),
      // we might need to prompt. However, prompting every time is bad UX.
      // We should rely on the UI to trigger this explicitly if missing.

      // For now, we will keep the provisioning trigger separate from the keys.
      // The UI (e.g. `<WalletGuard>`) should be responsible for prompting "Create Passkey" if missing.
      // BUT, since the user asked for "Assign to Socials", we can attempt to auto-trigger the flow here
      // IF we know they don't have one?

      // better approach: Just trigger provisioning. If it hangs (waiting for signer),
      // the UI should reflect "Waiting for Signer".

      // Trigger background wallet provisioning
      await fetch("/api/wallets/provision", {
        method: "POST",
      });
    } catch (error) {
      logger.warn("wallet_provision_trigger_failed", error);
    }
  }

  async applyInviteMetadata() {
    if (!this.normalizedInviteCode || !this.supabaseClient) {
      return;
    }
    try {
      const { data } = await this.supabaseClient.auth.getUser();
      const user = data?.user;
      if (!user) return;

      // Also trigger wallet provisioning here to ensure it happens for new users
      this.provisionWallet();

      const createdAt = user.created_at
        ? new Date(user.created_at).getTime()
        : NaN;
      const lastSignInAt = user.last_sign_in_at
        ? new Date(user.last_sign_in_at).getTime()
        : NaN;
      const isFreshAccount =
        Number.isFinite(createdAt) &&
        Number.isFinite(lastSignInAt) &&
        Math.abs(lastSignInAt - createdAt) < 5 * 60 * 1000;
      if (!isFreshAccount) {
        return;
      }
      await this.supabaseClient.auth.updateUser({
        data: {
          invite_code: this.normalizedInviteCode,
        },
      });
    } catch (error) {
      logger.warn("invite_metadata_update_failed", error);
    }
  }
}
