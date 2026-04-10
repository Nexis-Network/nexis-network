"use client";

import { toast } from "sonner";

import type { AuthMethod, ProviderButton } from "@/components/auth/login/types";

import type { AuthTranslationFn } from "./login-controller-utils";
import { isWalletAuthMethod } from "./login-controller-utils";
import type { UseOAuthAuthReturn } from "./use-oauth-auth";
import type { UsePasskeyAuthReturn } from "./use-passkey-auth";
import type { UseWalletAuthReturn } from "./use-wallet-auth";

type CreateLoginControllerProviderActionsOptions = {
  authMethod: AuthMethod;
  normalizedIdentifierValue: string;
  t: AuthTranslationFn;
  passkeyAuth: Pick<UsePasskeyAuthReturn, "handlePasskeyAuth">;
  walletAuth: Pick<UseWalletAuthReturn, "handleWalletAuth">;
  oauthAuth: Pick<UseOAuthAuthReturn, "handleOAuth">;
};

export function createLoginControllerProviderActions({
  authMethod,
  normalizedIdentifierValue,
  oauthAuth,
  passkeyAuth,
  t,
  walletAuth,
}: CreateLoginControllerProviderActionsOptions) {
  const handlePasskeyAuth = async () => {
    await passkeyAuth.handlePasskeyAuth(normalizedIdentifierValue || undefined);
  };

  const handleWalletAuth = async () => {
    if (!isWalletAuthMethod(authMethod)) {
      toast.error(t("toasts.selectWallet"));
      return;
    }

    await walletAuth.handleWalletAuth(authMethod);
  };

  const handleOAuth = async (provider: ProviderButton) => {
    try {
      await oauthAuth.handleOAuth(provider);
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : t("toasts.oauthStartFailed");
      toast.error(message);
    }
  };

  return {
    handlePasskeyAuth,
    handleWalletAuth,
    handleOAuth,
  } as const;
}
