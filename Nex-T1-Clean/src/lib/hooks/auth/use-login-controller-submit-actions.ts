"use client";

import type { AuthMethod, Mode, Step } from "@/components/auth/login/types";

import type { UseCredentialAuthReturn } from "./use-credential-auth";
import type { AuthTranslationFn } from "./login-controller-utils";
import type { UseMagicLinkAuthReturn } from "./use-magic-link-auth";
import type { UseOAuthAuthReturn } from "./use-oauth-auth";
import type { UseOtpAuthReturn } from "./use-otp-auth";
import type { UsePasskeyAuthReturn } from "./use-passkey-auth";
import type { UseWalletAuthReturn } from "./use-wallet-auth";
import { createLoginControllerCredentialActions } from "./use-login-controller-credential-actions";
import { createLoginControllerProviderActions } from "./use-login-controller-provider-actions";

type UseLoginControllerSubmitActionsOptions = {
  authMethod: AuthMethod;
  mode: Mode;
  identifier: string;
  normalizedIdentifierValue: string;
  hasAcceptedPolicies: boolean;
  magicLinkCountdown: number;
  setIdentifier: (identifier: string) => void;
  setStep: (step: Step) => void;
  t: AuthTranslationFn;
  credentialAuth: Pick<
    UseCredentialAuthReturn,
    "loading" | "resetPassword" | "signInWithPassword" | "signUpWithPassword"
  >;
  otpAuth: Pick<
    UseOtpAuthReturn,
    "resendOtp" | "sendEmailOtp" | "sendPhoneOtp" | "verifyOtp"
  >;
  magicLinkAuth: Pick<UseMagicLinkAuthReturn, "sendMagicLink">;
  passkeyAuth: Pick<UsePasskeyAuthReturn, "handlePasskeyAuth">;
  walletAuth: Pick<UseWalletAuthReturn, "handleWalletAuth">;
  oauthAuth: Pick<UseOAuthAuthReturn, "handleOAuth">;
};

export function useLoginControllerSubmitActions({
  authMethod,
  credentialAuth,
  hasAcceptedPolicies,
  identifier,
  magicLinkAuth,
  magicLinkCountdown,
  mode,
  normalizedIdentifierValue,
  oauthAuth,
  otpAuth,
  passkeyAuth,
  setIdentifier,
  setStep,
  t,
  walletAuth,
}: UseLoginControllerSubmitActionsOptions) {
  const credentialActions = createLoginControllerCredentialActions({
    authMethod,
    mode,
    identifier,
    normalizedIdentifierValue,
    hasAcceptedPolicies,
    magicLinkCountdown,
    setIdentifier,
    setStep,
    t,
    credentialAuth,
    otpAuth,
    magicLinkAuth,
  });
  const providerActions = createLoginControllerProviderActions({
    authMethod,
    normalizedIdentifierValue,
    t,
    passkeyAuth,
    walletAuth,
    oauthAuth,
  });

  return {
    ...credentialActions,
    ...providerActions,
  } as const;
}
