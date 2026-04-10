"use client";

import { useEffect } from "react";

import type { AuthMethod, Step } from "@/components/auth/login/types";

import { isOtpAuthMethod } from "./login-controller-utils";

type UseLoginControllerFlowEffectsOptions = {
  authMethod: AuthMethod;
  step: Step;
  otpCountdown: number;
  onOtpCountdownTick: () => void;
  onOtpReset: () => void;
  magicLinkCountdown: number;
  onMagicLinkCountdownTick: () => void;
  setStep: (step: Step) => void;
};

export function useLoginControllerFlowEffects({
  authMethod,
  magicLinkCountdown,
  onMagicLinkCountdownTick,
  onOtpCountdownTick,
  onOtpReset,
  otpCountdown,
  setStep,
  step,
}: UseLoginControllerFlowEffectsOptions): void {
  useEffect(() => {
    if (otpCountdown <= 0) {
      return;
    }

    const timer = window.setTimeout(onOtpCountdownTick, 1000);
    return () => window.clearTimeout(timer);
  }, [onOtpCountdownTick, otpCountdown]);

  useEffect(() => {
    if (magicLinkCountdown <= 0) {
      return;
    }

    const timer = window.setTimeout(onMagicLinkCountdownTick, 1000);
    return () => window.clearTimeout(timer);
  }, [magicLinkCountdown, onMagicLinkCountdownTick]);

  useEffect(() => {
    if (isOtpAuthMethod(authMethod)) {
      return;
    }

    onOtpReset();
    if (step === "otp") {
      setStep("entry");
    }
  }, [authMethod, onOtpReset, setStep, step]);
}
