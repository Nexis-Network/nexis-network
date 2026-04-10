"use client";

/**
 * OAuth Authentication Hook
 * 
 * Domain: Authentication
 * Responsibility: Handles OAuth social provider sign-in flows (Google, GitHub, etc.)
 * Depends on: LoginControllerCore, sonner for toasts
 */

import { useState, useCallback } from "react";
import type { LoginControllerCore } from "@/lib/auth/login-controller-core";
import type { ProviderButton } from "@/components/auth/login/types";


export interface OAuthAuthState {
  oauthLoading: boolean;
}

export interface UseOAuthAuthOptions {
  loginCore: LoginControllerCore;
  inviteCode: string | null;
  redirectTo?: string | null;
  onSuccess: () => void;
}

export interface UseOAuthAuthReturn extends OAuthAuthState {
  handleOAuth: (provider: ProviderButton) => Promise<void>;
}

export function useOAuthAuth({
  loginCore,
  inviteCode,
  redirectTo,
  onSuccess: _onSuccess,
}: UseOAuthAuthOptions): UseOAuthAuthReturn {
  const [oauthLoading, setOauthLoading] = useState(false);


  const handleOAuth = useCallback(
    async (provider: ProviderButton) => {
      if (oauthLoading) return;
      const providerSlug = provider.id;

      const redirectFallback = redirectTo && redirectTo.trim().length > 0 ? redirectTo.trim() : "/app";

      const appOrigin =
        typeof window !== "undefined"
          ? window.location.origin
          : process.env.NEXT_PUBLIC_SITE_URL?.trim() ??
            process.env.NEXT_PUBLIC_APP_URL?.trim() ??
            "http://localhost:3000";

      const callbackUrl = new URL("/auth/callback", appOrigin);
      callbackUrl.searchParams.set("provider", providerSlug);
      if (redirectFallback) {
        callbackUrl.searchParams.set("redirectTo", redirectFallback);
      }

      let callbackRedirect = callbackUrl.toString();

      if (inviteCode) {
        try {
          const url = new URL(callbackRedirect);
          url.searchParams.set("invite", inviteCode);
          callbackRedirect = url.toString();
        } catch {
          /* noop */
        }
      }

      setOauthLoading(true);

      try {
        const url = await loginCore.handleOAuthProvider(
          {
            id: providerSlug,
            label: provider.label,
          },
          { redirectTo: callbackRedirect },
        );

        // When skipBrowserRedirect is enabled by the SDK/client, we may receive the
        // provider URL here and need to navigate manually.
        if (url && typeof window !== "undefined") {
          window.location.assign(url);
        }
      } finally {
        // In normal success flow we navigate away before this executes.
        // Keep this for local/testing and early-failure paths.
        setOauthLoading(false);
      }
    },
    [inviteCode, loginCore, oauthLoading, redirectTo]
  );

  return {
    oauthLoading,
    handleOAuth,
  };
}
