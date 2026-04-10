"use client";
import { toast } from "sonner";
import type { AuthMethod, Mode, Step } from "@/components/auth/login/types";
import { PHONE_FORMAT_HELP } from "@/lib/auth/phone-format";
import type { UseCredentialAuthReturn } from "./use-credential-auth";
import type { AuthTranslationFn } from "./login-controller-utils";
import {
  isOtpAuthMethod,
  resolveBeginCredentialDecision,
  resolveCredentialSubmitDecision,
} from "./login-controller-utils";
import type { UseMagicLinkAuthReturn } from "./use-magic-link-auth";
import type { UseOtpAuthReturn } from "./use-otp-auth";

type CreateLoginControllerCredentialActionsOptions = {
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
};
export function createLoginControllerCredentialActions({
  authMethod,
  credentialAuth,
  hasAcceptedPolicies,
  identifier,
  magicLinkAuth,
  magicLinkCountdown,
  mode,
  normalizedIdentifierValue,
  otpAuth,
  setIdentifier,
  setStep,
  t,
}: CreateLoginControllerCredentialActionsOptions) {
  const runHandledRequest = async (request: () => Promise<void>) => {
    try { await request(); } catch { /* Nested auth hooks already toast errors. */ }
  };

  const beginCredentialStep = async () => {
    const decision = resolveBeginCredentialDecision({
      authMethod,
      identifier,
      mode,
      hasAcceptedPolicies,
      magicLinkCountdown,
    });
    switch (decision.type) {
      case "error":
        if (decision.reason === "missing") {
          toast.error(t("toasts.enterValue"));
        } else if (decision.reason === "invalid-email") {
          toast.error(t("toasts.validEmail"));
        } else if (decision.reason === "invalid-phone") {
          toast.error(PHONE_FORMAT_HELP);
        } else {
          toast.error(t("toasts.acceptLegal"));
        }
        return;
      case "magic-link-throttled":
        toast.info(t("toasts.waitMagicLink", { seconds: decision.seconds }));
        return;
      case "phone-otp":
        if (decision.shouldUpdateIdentifier) {
          setIdentifier(decision.formatted);
          if (decision.autoFormatted) toast.info(t("toasts.formattedNumber", { formatted: decision.formatted }));
        }
        await runHandledRequest(() => otpAuth.sendPhoneOtp(decision.contact));
        return;
      case "email-otp":
        await runHandledRequest(() => otpAuth.sendEmailOtp(decision.contact));
        return;
      case "magic-link":
        await runHandledRequest(() => magicLinkAuth.sendMagicLink(decision.contact));
        return;
      case "passkey":
        setStep("passkey");
        return;
      case "credentials":
        setStep("credentials");
    }
  };

  const handleCredentialSubmit = async () => {
    if (credentialAuth.loading) return;
    const decision = resolveCredentialSubmitDecision({
      authMethod,
      normalizedIdentifier: normalizedIdentifierValue,
    });
    if (decision.type === "error") {
      toast.error(
        decision.reason === "missing-identifier"
          ? t("toasts.missingIdentifier")
          : t("toasts.emailOnlyFlow"),
      );
      return;
    }
    if (decision.type === "otp") {
      setStep("otp");
      return;
    }
    if (mode === "sign-in") {
      await credentialAuth.signInWithPassword(decision.email);
      return;
    }
    await credentialAuth.signUpWithPassword(decision.email, hasAcceptedPolicies);
  };

  const handleOtpSubmit = async () => {
    if (isOtpAuthMethod(authMethod)) await otpAuth.verifyOtp(normalizedIdentifierValue, authMethod);
  };

  const handleResendOtp = () => {
    if (isOtpAuthMethod(authMethod)) otpAuth.resendOtp(normalizedIdentifierValue, authMethod);
  };

  const handleForgotPasswordSubmit = async () => {
    await credentialAuth.resetPassword(normalizedIdentifierValue);
    setStep("entry");
  };
  return {
    beginCredentialStep,
    handleCredentialSubmit,
    handleOtpSubmit,
    handleResendOtp,
    handleForgotPasswordSubmit,
  } as const;
}
