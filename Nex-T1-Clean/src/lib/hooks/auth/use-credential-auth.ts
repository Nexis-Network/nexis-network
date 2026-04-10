"use client";

/**
 * Credential Authentication Hook
 * 
 * Domain: Authentication
 * Responsibility: Handles email/password sign-in and sign-up flows
 * Depends on: LoginControllerCore, sonner for toasts
 */

import { useState, useCallback } from "react";
import { toast } from "sonner";
import type { LoginControllerCore } from "@/lib/auth/login-controller-core";
import type { Mode } from "@/components/auth/login/types";
import { useTranslations } from "@/components/providers/locale-provider";
import { storeAuthIdentifier } from "@/lib/auth-profile";
import { EMAIL_REGEX } from "@/components/auth/login/constants";

export interface CredentialAuthState {
  password: string;
  confirmPassword: string;
  loading: boolean;
}

export interface UseCredentialAuthOptions {
  loginCore: LoginControllerCore;
  mode: Mode;
  redirectTo?: string | null;
  onSuccess: () => void;
}

export interface UseCredentialAuthReturn extends CredentialAuthState {
  signInWithPassword: (email: string) => Promise<void>;
  signUpWithPassword: (email: string, hasAcceptedPolicies: boolean) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  setPassword: (password: string) => void;
  setConfirmPassword: (confirmPassword: string) => void;
  validatePasswordStrength: (password: string) => { valid: boolean; message?: string };
  resetCredentialState: () => void;
}

function resolveSignUpRedirectTarget(redirectTo?: string | null): string | undefined {
  const normalized = redirectTo?.trim();
  if (normalized && /^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  if (typeof window === "undefined") {
    return undefined;
  }

  const origin = window.location.origin;
  if (!normalized || normalized === "/") {
    return origin;
  }

  try {
    const target = new URL(normalized, origin);
    if (target.protocol === "http:" || target.protocol === "https:") {
      return target.toString();
    }
  } catch {
    /* noop */
  }

  return origin;
}

export function useCredentialAuth({
  loginCore,
  mode: _mode,
  redirectTo,
  onSuccess,
}: UseCredentialAuthOptions): UseCredentialAuthReturn {
  const t = useTranslations("auth");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const validatePasswordStrength = useCallback((pwd: string): { valid: boolean; message?: string } => {
    if (pwd.length < 8) {
      return { valid: false, message: t("toasts.passwordMinLength") };
    }
    const passwordStrengthRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/u;
    if (!passwordStrengthRegex.test(pwd)) {
      return { valid: false, message: t("toasts.passwordStrength") };
    }
    return { valid: true };
  }, [t]);

  const signInWithPassword = useCallback(
    async (email: string) => {
      if (!email || !EMAIL_REGEX.test(email)) {
        toast.error(t("toasts.validEmail"));
        return;
      }
      if (!password.trim()) {
        toast.error(t("toasts.passwordRequired"));
        return;
      }

      try {
        setLoading(true);
        await loginCore.signInWithPassword(email, password);
        storeAuthIdentifier(email, "email");
        toast.success(t("toasts.signedInSuccessfully"));
        onSuccess();
      } catch (error) {
        const message = error instanceof Error ? error.message : t("toasts.signInFailed");
        toast.error(message);
      } finally {
        setLoading(false);
      }
    },
    [loginCore, onSuccess, password, t]
  );

  const signUpWithPassword = useCallback(
    async (email: string, hasAcceptedPolicies: boolean) => {
      if (!email || !EMAIL_REGEX.test(email)) {
        toast.error(t("toasts.validEmail"));
        return;
      }
      if (!password.trim()) {
        toast.error(t("toasts.passwordRequired"));
        return;
      }

      const strengthCheck = validatePasswordStrength(password);
      if (!strengthCheck.valid) {
        toast.error(strengthCheck.message);
        return;
      }

      if (password !== confirmPassword) {
        toast.error(t("toasts.passwordsDoNotMatch"));
        return;
      }

      if (!hasAcceptedPolicies) {
        toast.error(t("toasts.acceptLegal"));
        return;
      }

      try {
        setLoading(true);
        const emailRedirectTarget = resolveSignUpRedirectTarget(redirectTo);
        await loginCore.signUpWithPassword(email, password, { redirectTo: emailRedirectTarget });
        storeAuthIdentifier(email, "email");
        toast.success(t("toasts.accountCreated"));
        onSuccess();
      } catch (error) {
        const message = error instanceof Error ? error.message : t("toasts.signUpFailed");
        toast.error(message);
      } finally {
        setLoading(false);
      }
    },
    [confirmPassword, loginCore, onSuccess, password, redirectTo, t, validatePasswordStrength]
  );

  const resetPassword = useCallback(
    async (email: string) => {
      if (!email || !EMAIL_REGEX.test(email)) {
        toast.error(t("toasts.validEmail"));
        return;
      }

      try {
        setLoading(true);
        const redirectTarget = redirectTo && redirectTo.trim().length > 0 ? redirectTo : "/app";
        const origin =
          typeof window !== "undefined"
            ? window.location.origin
            : process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
        
        // Build reset redirect URL
        const resetRedirectTo = `${origin}/auth/reset?redirectTo=${encodeURIComponent(redirectTarget)}`;
        
        await loginCore.resetPassword(email, { redirectTo: resetRedirectTo });
        toast.success(t("toasts.resetLinkSent"));
      } catch (error) {
        const message = error instanceof Error ? error.message : t("toasts.resetLinkFailed");
        toast.error(message);
      } finally {
        setLoading(false);
      }
    },
    [loginCore, redirectTo, t]
  );

  const resetCredentialState = useCallback(() => {
    setPassword("");
    setConfirmPassword("");
    setLoading(false);
  }, []);

  return {
    password,
    confirmPassword,
    loading,
    signInWithPassword,
    signUpWithPassword,
    resetPassword,
    setPassword,
    setConfirmPassword,
    validatePasswordStrength,
    resetCredentialState,
  };
}
