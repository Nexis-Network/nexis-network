"use client";

import type { AuthMethod, Mode, Step } from "@/components/auth/login/types";
import type { LoginControllerCore } from "@/lib/auth/login-controller-core";
import { storeAuthIdentifier } from "@/lib/auth-profile";

import type { AuthTranslationFn } from "./login-controller-utils";
import { useCredentialAuth } from "./use-credential-auth";
import { useLoginControllerFlowEffects } from "./use-login-controller-flow-effects";
import { useLoginControllerStateActions } from "./use-login-controller-state-actions";
import { useLoginControllerSubmitActions } from "./use-login-controller-submit-actions";
import { useMagicLinkAuth } from "./use-magic-link-auth";
import { useOAuthAuth } from "./use-oauth-auth";
import { useOtpAuth } from "./use-otp-auth";
import { usePasskeyAuth } from "./use-passkey-auth";
import { useWalletAuth } from "./use-wallet-auth";

type UseLoginControllerAuthFlowsOptions = {
  authMethod: AuthMethod;
  mode: Mode;
  step: Step;
  identifier: string;
  normalizedIdentifierValue: string;
  normalizedInviteCode: string | null;
  hasAcceptedPolicies: boolean;
  redirectTo?: string;
  loginCore: LoginControllerCore;
  setMode: (mode: Mode) => void;
  setStep: (step: Step) => void;
  setAuthMethod: (method: AuthMethod) => void;
  setIdentifier: (identifier: string) => void;
  handlePostAuth: () => void;
  captchaToken: string | null;
  t: AuthTranslationFn;
};

export function useLoginControllerAuthFlows({
  authMethod,
  captchaToken,
  handlePostAuth,
  hasAcceptedPolicies,
  identifier,
  loginCore,
  mode,
  normalizedIdentifierValue,
  normalizedInviteCode,
  redirectTo,
  setAuthMethod,
  setIdentifier,
  setMode,
  setStep,
  step,
  t,
}: UseLoginControllerAuthFlowsOptions) {
  const otpAuth = useOtpAuth({
    loginCore,
    mode,
    inviteCode: normalizedInviteCode,
    onStepChange: setStep,
    onSuccess: () => {
      storeAuthIdentifier(
        normalizedIdentifierValue,
        authMethod === "phone" ? "username" : "email",
      );
      handlePostAuth();
    },
    captchaToken,
  });
  const credentialAuth = useCredentialAuth({
    loginCore,
    mode,
    redirectTo,
    onSuccess: handlePostAuth,
  });
  const oauthAuth = useOAuthAuth({
    loginCore,
    inviteCode: normalizedInviteCode,
    redirectTo,
    onSuccess: handlePostAuth,
  });
  const passkeyAuth = usePasskeyAuth({
    loginCore,
    mode,
    onStepChange: setStep,
  });
  const magicLinkAuth = useMagicLinkAuth({
    inviteCode: normalizedInviteCode,
    redirectTo,
    captchaToken,
  });
  const walletAuth = useWalletAuth({
    loginCore,
    mode,
    inviteCode: normalizedInviteCode,
    onStepChange: setStep,
    onSuccess: handlePostAuth,
    hasAcceptedPolicies,
  });

  useLoginControllerFlowEffects({
    authMethod,
    step,
    otpCountdown: otpAuth.otpCountdown,
    onOtpCountdownTick: otpAuth.decrementCountdown,
    onOtpReset: otpAuth.resetOtpState,
    magicLinkCountdown: magicLinkAuth.magicLinkCountdown,
    onMagicLinkCountdownTick: magicLinkAuth.decrementMagicLinkCountdown,
    setStep,
  });

  const stateActions = useLoginControllerStateActions({
    mode,
    setMode,
    setStep,
    setAuthMethod,
    credentialAuth,
    otpAuth,
    magicLinkAuth,
    walletAuth,
  });
  const submitActions = useLoginControllerSubmitActions({
    authMethod,
    mode,
    identifier,
    normalizedIdentifierValue,
    hasAcceptedPolicies,
    magicLinkCountdown: magicLinkAuth.magicLinkCountdown,
    setIdentifier,
    setStep,
    t,
    credentialAuth,
    otpAuth,
    magicLinkAuth,
    passkeyAuth,
    walletAuth,
    oauthAuth,
  });

  return { otpAuth, credentialAuth, oauthAuth, magicLinkAuth, walletAuth, stateActions, submitActions };
}
