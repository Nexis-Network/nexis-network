"use client";

import { useCallback } from "react";

import type { AuthMethod, Mode, Step, WalletAuthMethod } from "@/components/auth/login/types";

import type { UseCredentialAuthReturn } from "./use-credential-auth";
import type { UseMagicLinkAuthReturn } from "./use-magic-link-auth";
import type { UseOtpAuthReturn } from "./use-otp-auth";
import type { UseWalletAuthReturn } from "./use-wallet-auth";
import { isWalletAuthMethod } from "./login-controller-utils";

type UseLoginControllerStateActionsOptions = {
  mode: Mode;
  setMode: (mode: Mode) => void;
  setStep: (step: Step) => void;
  setAuthMethod: (method: AuthMethod) => void;
  credentialAuth: Pick<UseCredentialAuthReturn, "setPassword" | "setConfirmPassword">;
  otpAuth: Pick<UseOtpAuthReturn, "resetOtpState" | "setOtpCode">;
  magicLinkAuth: Pick<UseMagicLinkAuthReturn, "resetMagicLinkState">;
  walletAuth: Pick<UseWalletAuthReturn, "resetWalletState">;
};

export function useLoginControllerStateActions({
  credentialAuth,
  magicLinkAuth,
  mode,
  otpAuth,
  setAuthMethod,
  setMode,
  setStep,
  walletAuth,
}: UseLoginControllerStateActionsOptions) {
  const resetTransientAuthState = useCallback(() => {
    otpAuth.resetOtpState();
    magicLinkAuth.resetMagicLinkState();
    walletAuth.resetWalletState();
  }, [magicLinkAuth, otpAuth, walletAuth]);

  const handleAuthMethodSelect = useCallback(
    (method: AuthMethod) => {
      setAuthMethod(method);
      if (isWalletAuthMethod(method)) {
        walletAuth.resetWalletState();
        setStep("wallet");
        return;
      }

      setStep("identifier");
    },
    [setAuthMethod, setStep, walletAuth],
  );

  const handleAuthMethodChange = useCallback(
    (method: AuthMethod) => {
      setAuthMethod(method);
      setStep("entry");
      resetTransientAuthState();
      if (method !== "email") {
        credentialAuth.setPassword("");
        credentialAuth.setConfirmPassword("");
      }
    },
    [credentialAuth, resetTransientAuthState, setAuthMethod, setStep],
  );

  const handleWalletMethodSelect = useCallback(
    (method: WalletAuthMethod) => {
      setAuthMethod(method);
      walletAuth.resetWalletState();
      setStep("wallet");
    },
    [setAuthMethod, setStep, walletAuth],
  );

  const handleBackToEntry = useCallback(() => {
    setStep("entry");
    walletAuth.resetWalletState();
  }, [setStep, walletAuth]);

  const handleModeToggle = useCallback(() => {
    setMode(mode === "sign-in" ? "sign-up" : "sign-in");
    setStep("entry");
    resetTransientAuthState();
  }, [mode, resetTransientAuthState, setMode, setStep]);

  const handleUseDifferentNumber = useCallback(() => {
    setStep("entry");
    otpAuth.setOtpCode("");
  }, [otpAuth, setStep]);

  const handleForgotPassword = useCallback(() => {
    setStep("forgot-password");
  }, [setStep]);

  return {
    handleAuthMethodSelect,
    handleAuthMethodChange,
    handleWalletMethodSelect,
    handleBackToEntry,
    handleModeToggle,
    handleUseDifferentNumber,
    handleForgotPassword,
  } as const;
}
