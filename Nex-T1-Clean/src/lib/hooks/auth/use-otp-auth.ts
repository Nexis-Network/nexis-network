"use client";

/**
 * OTP Authentication Hook
 * 
 * Domain: Authentication
 * Responsibility: Handles phone and email OTP verification flows
 * Depends on: LoginControllerCore, sonner for toasts
 */

import { useState, useCallback } from "react";
import { toast } from "sonner";
import type { LoginControllerCore } from "@/lib/auth/login-controller-core";
import type { Mode, Step } from "@/components/auth/login/types";
import { useTranslations } from "@/components/providers/locale-provider";


import { logger } from '@/lib/logger';
export interface OtpAuthState {
  otpCode: string;
  otpCountdown: number;
  otpRequested: boolean;
  otpLoading: boolean;
}

export interface UseOtpAuthOptions {
  loginCore: LoginControllerCore;
  mode: Mode;
  inviteCode: string | null;
  onStepChange: (step: Step) => void;
  onSuccess: () => void;
  captchaToken?: string | null;
}

export interface UseOtpAuthReturn extends OtpAuthState {
  sendPhoneOtp: (phone: string, options?: { silent?: boolean }) => Promise<void>;
  sendEmailOtp: (email: string, options?: { silent?: boolean }) => Promise<void>;
  verifyOtp: (contact: string, authMethod: "phone" | "email-otp") => Promise<void>;
  resendOtp: (contact: string, authMethod: "phone" | "email-otp") => void;
  setOtpCode: (code: string) => void;
  resetOtpState: () => void;
  decrementCountdown: () => void;
}

const _initialState: OtpAuthState = {
  otpCode: "",
  otpCountdown: 0,
  otpRequested: false,
  otpLoading: false,
};

export function useOtpAuth({
  loginCore,
  mode,
  inviteCode,
  onStepChange,
  onSuccess,
  captchaToken,
}: UseOtpAuthOptions): UseOtpAuthReturn {
  const t = useTranslations("auth");
  const [otpCode, setOtpCode] = useState("");
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [otpRequested, setOtpRequested] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  const sendPhoneOtp = useCallback(
    async (phone: string, { silent = false }: { silent?: boolean } = {}) => {
      if (!phone) {
        throw new Error(t("toasts.phoneRequired"));
      }
      try {
        setOtpLoading(true);
        await loginCore.requestPhoneOtp(phone, { inviteCode, mode });
        if (!silent) {
          toast.success(
            otpRequested ? t("toasts.codeResent") : t("toasts.verificationCodeSentPhone"),
          );
        }
        setOtpCode("");
        setOtpRequested(true);
        setOtpCountdown(60);
        onStepChange("otp");
      } catch (error) {
        const message = error instanceof Error ? error.message : t("toasts.invalidOrExpiredCode");
        if (!silent) {
          toast.error(message);
        }
        throw new Error(message);
      } finally {
        setOtpLoading(false);
      }
    },
    [inviteCode, loginCore, mode, onStepChange, otpRequested, t]
  );

  const sendEmailOtp = useCallback(
    async (email: string, { silent = false }: { silent?: boolean } = {}) => {
      const normalizedEmail = email?.toLowerCase().trim();
      if (!normalizedEmail) {
        const message = t("toasts.emailRequired");
        if (!silent) toast.error(message);
        throw new Error(message);
      }

      try {
        setOtpLoading(true);
        const response = await fetch("/api/auth/email/otp/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            email: normalizedEmail,
            invite_code: inviteCode,
            mode,
            captchaToken,
          }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          const message =
            typeof payload?.message === "string"
              ? payload.message
              : t("toasts.invalidOrExpiredCode");
          throw new Error(message);
        }

        if (!silent) {
          toast.success(
            otpRequested
              ? t("toasts.verificationCodeResentEmail")
              : t("toasts.verificationCodeSentEmail"),
          );
        }
        setOtpRequested(true);
        setOtpCountdown(60);
        onStepChange("otp");
      } catch (error) {
        const message = error instanceof Error ? error.message : t("toasts.invalidOrExpiredCode");
        if (!silent) toast.error(message);
        throw new Error(message);
      } finally {
        setOtpLoading(false);
      }
    },
    [captchaToken, inviteCode, mode, onStepChange, otpRequested, t]
  );

  const verifyOtp = useCallback(
    async (contact: string, authMethod: "phone" | "email-otp") => {
      if (!contact) {
        toast.error(t("toasts.missingContact"));
        return;
      }
      if (!otpCode.trim()) {
        toast.error(t("toasts.enterVerificationCode"));
        return;
      }
      try {
        setOtpLoading(true);
        if (authMethod === "phone") {
          await loginCore.verifyPhoneOtp(contact, otpCode.trim());
          toast.success(t("toasts.phoneVerified"));
        } else {
          await loginCore.verifyEmailOtp(contact, otpCode.trim());
          toast.success(t("toasts.emailVerified"));
        }
        setOtpCountdown(0);
        setOtpRequested(false);
        onSuccess();
      } catch (error) {
        const message = error instanceof Error ? error.message : t("toasts.invalidOrExpiredCode");
        toast.error(message);
        logger.warn("otp_verification_failed", message);
      } finally {
        setOtpLoading(false);
      }
    },
    [loginCore, onSuccess, otpCode, t]
  );

  const resendOtp = useCallback(
    (contact: string, authMethod: "phone" | "email-otp") => {
      if (!contact) {
        toast.error(t("toasts.enterContactFirst"));
        return;
      }
      if (otpCountdown > 0) {
        return;
      }
      if (authMethod === "phone") {
        sendPhoneOtp(contact).catch(() => {});
      } else {
        sendEmailOtp(contact).catch(() => {});
      }
    },
    [otpCountdown, sendEmailOtp, sendPhoneOtp, t]
  );

  const resetOtpState = useCallback(() => {
    setOtpCode("");
    setOtpCountdown(0);
    setOtpRequested(false);
    setOtpLoading(false);
  }, []);

  const decrementCountdown = useCallback(() => {
    setOtpCountdown((prev) => Math.max(prev - 1, 0));
  }, []);

  return {
    otpCode,
    otpCountdown,
    otpRequested,
    otpLoading,
    sendPhoneOtp,
    sendEmailOtp,
    verifyOtp,
    resendOtp,
    setOtpCode,
    resetOtpState,
    decrementCountdown,
  };
}
