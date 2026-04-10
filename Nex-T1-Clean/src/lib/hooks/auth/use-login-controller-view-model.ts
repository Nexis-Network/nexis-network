"use client";

import { useMemo } from "react";

import type { AuthMethod, Mode, Step } from "@/components/auth/login/types";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

import { getLoginHeader, isPasskeyEnabled, type AuthTranslationFn } from "./login-controller-utils";
import type { ProviderMap } from "./use-auth-providers";
import { createSafeProviderFallbackMap } from "@/lib/supabase/providers";
import type { UseCredentialAuthReturn } from "./use-credential-auth";
import type { UseMagicLinkAuthReturn } from "./use-magic-link-auth";
import type { UseOAuthAuthReturn } from "./use-oauth-auth";
import type { UseOtpAuthReturn } from "./use-otp-auth";
import type { UseWalletAuthReturn } from "./use-wallet-auth";

type UseLoginControllerViewModelOptions = {
  supabaseClient: ReturnType<typeof getSupabaseBrowserClient>;
  isCheckingAuth: boolean;
  isAuthenticated: boolean;
  step: Step;
  mode: Mode;
  authMethod: AuthMethod;
  identifier: string;
  hasAcceptedPolicies: boolean;
  normalizedIdentifierValue: string;
  providerMap?: ProviderMap;
  providersResolved: boolean;
  t: AuthTranslationFn;
  magicLinkAuth: Pick<UseMagicLinkAuthReturn, "magicLinkLoading" | "getMagicLinkStatus">;
  credentialAuth: Pick<UseCredentialAuthReturn, "loading" | "password" | "confirmPassword" | "setPassword" | "setConfirmPassword">;
  oauthAuth: Pick<UseOAuthAuthReturn, "oauthLoading">;
  otpAuth: Pick<UseOtpAuthReturn, "otpLoading" | "otpCountdown" | "otpCode" | "setOtpCode">;
  walletAuth: Pick<UseWalletAuthReturn, "walletLoading" | "walletError" | "walletConnectEnabled">;
  stateActions: ReturnType<typeof import("./use-login-controller-state-actions").useLoginControllerStateActions>;
  submitActions: ReturnType<typeof import("./use-login-controller-submit-actions").useLoginControllerSubmitActions>;
  setIdentifier: (identifier: string) => void;
  setHasAcceptedPolicies: (accepted: boolean) => void;
};

export function useLoginControllerViewModel({
  authMethod,
  credentialAuth,
  hasAcceptedPolicies,
  identifier,
  isAuthenticated,
  isCheckingAuth,
  magicLinkAuth,
  mode,
  normalizedIdentifierValue,
  oauthAuth,
  otpAuth,
  providerMap,
  providersResolved,
  setHasAcceptedPolicies,
  setIdentifier,
  stateActions,
  step,
  submitActions,
  supabaseClient,
  t,
  walletAuth,
}: UseLoginControllerViewModelOptions) {
  const availableProviders: ProviderMap = providerMap ?? createSafeProviderFallbackMap();
  const magicLinkStatus = useMemo(
    () =>
      authMethod === "magic-link"
        ? magicLinkAuth.getMagicLinkStatus(normalizedIdentifierValue)
        : null,
    [authMethod, magicLinkAuth, normalizedIdentifierValue],
  );
  const header = useMemo(() => getLoginHeader(mode, t), [mode, t]);
  const passkeyEnabled = useMemo(() => isPasskeyEnabled(supabaseClient), [supabaseClient]);
  const loading =
    credentialAuth.loading ||
    oauthAuth.oauthLoading ||
    magicLinkAuth.magicLinkLoading ||
    walletAuth.walletLoading;

  return {
    supabaseClient,
    isCheckingAuth,
    isAuthenticated,
    step,
    mode,
    authMethod,
    identifier,
    hasAcceptedPolicies,
    loading,
    otpLoading: otpAuth.otpLoading,
    walletLoading: walletAuth.walletLoading,
    walletError: walletAuth.walletError,
    walletConnectEnabled: walletAuth.walletConnectEnabled,
    passkeyEnabled,
    otpCountdown: otpAuth.otpCountdown,
    otpCode: otpAuth.otpCode,
    password: credentialAuth.password,
    confirmPassword: credentialAuth.confirmPassword,
    availableProviders,
    providersResolved,
    magicLinkStatus,
    normalizedIdentifierValue,
    header,
    beginCredentialStep: submitActions.beginCredentialStep,
    handleOAuth: submitActions.handleOAuth,
    handleWalletAuth: submitActions.handleWalletAuth,
    handleCredentialSubmit: submitActions.handleCredentialSubmit,
    handleOtpSubmit: submitActions.handleOtpSubmit,
    handleResendOtp: submitActions.handleResendOtp,
    handlePasskeyAuth: submitActions.handlePasskeyAuth,
    handleForgotPasswordSubmit: submitActions.handleForgotPasswordSubmit,
    handleBackToEntry: stateActions.handleBackToEntry,
    handleModeToggle: stateActions.handleModeToggle,
    handleUseDifferentNumber: stateActions.handleUseDifferentNumber,
    handleAuthMethodChange: stateActions.handleAuthMethodChange,
    handleAuthMethodSelect: stateActions.handleAuthMethodSelect,
    handleWalletMethodSelect: stateActions.handleWalletMethodSelect,
    handleIdentifierChange: setIdentifier,
    handleHasAcceptedPoliciesChange: setHasAcceptedPolicies,
    handlePasswordChange: credentialAuth.setPassword,
    handleConfirmPasswordChange: credentialAuth.setConfirmPassword,
    handleOtpCodeChange: otpAuth.setOtpCode,
    handleForgotPassword: stateActions.handleForgotPassword,
  } as const;
}
