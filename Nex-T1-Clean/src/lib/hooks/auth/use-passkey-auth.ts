"use client";

/**
 * Passkey Authentication Hook
 * 
 * Domain: Authentication
 * Responsibility: Handles WebAuthn passkey sign-in and sign-up flows
 * Depends on: LoginControllerCore, sonner for toasts
 */

import { useState, useCallback } from "react";
import { toast } from "sonner";
import type { LoginControllerCore } from "@/lib/auth/login-controller-core";
import type { Mode, Step } from "@/components/auth/login/types";
import { useTranslations } from "@/components/providers/locale-provider";

export interface PasskeyAuthState {
  passkeyLoading: boolean;
}

export interface UsePasskeyAuthOptions {
  loginCore: LoginControllerCore;
  mode: Mode;
  onStepChange: (step: Step) => void;
}

export interface UsePasskeyAuthReturn extends PasskeyAuthState {
  handlePasskeyAuth: (email?: string) => Promise<void>;
  signInWithPasskey: (email?: string) => Promise<void>;
  signUpWithPasskey: (email: string) => Promise<void>;
}

export function usePasskeyAuth({
  loginCore,
  mode,
  onStepChange,
}: UsePasskeyAuthOptions): UsePasskeyAuthReturn {
  const t = useTranslations("auth");
  const [passkeyLoading, setPasskeyLoading] = useState(false);

  const signInWithPasskey = useCallback(
    async (email?: string) => {
      try {
        setPasskeyLoading(true);
        await loginCore.signInWithPasskey(email);
        toast.info(t("toasts.followPasskeyPrompts"));
      } catch (error) {
        const message = error instanceof Error ? error.message : t("toasts.passkeyAuthFailed");
        toast.error(message);
        onStepChange("entry");
      } finally {
        setPasskeyLoading(false);
      }
    },
    [loginCore, onStepChange, t]
  );

  const signUpWithPasskey = useCallback(
    async (email: string) => {
      if (!email) {
        toast.error(t("toasts.passkeyEmailRequired"));
        return;
      }

      try {
        setPasskeyLoading(true);
        await loginCore.signUpWithPasskey(email);
        toast.info(t("toasts.createPasskeyPrompts"));
      } catch (error) {
        const message = error instanceof Error ? error.message : t("toasts.passkeyRegistrationFailed");
        toast.error(message);
        onStepChange("entry");
      } finally {
        setPasskeyLoading(false);
      }
    },
    [loginCore, onStepChange, t]
  );

  const handlePasskeyAuth = useCallback(
    async (email?: string) => {
      if (passkeyLoading) return;

      if (mode === "sign-in") {
        await signInWithPasskey(email);
      } else {
        if (!email) {
          toast.error(t("toasts.passkeyEmailRequired"));
          return;
        }
        await signUpWithPasskey(email);
      }
    },
    [mode, passkeyLoading, signInWithPasskey, signUpWithPasskey, t]
  );

  return {
    passkeyLoading,
    handlePasskeyAuth,
    signInWithPasskey,
    signUpWithPasskey,
  };
}
