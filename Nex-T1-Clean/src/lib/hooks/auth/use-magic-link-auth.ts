"use client";

/**
 * Magic Link Authentication Hook
 * 
 * Domain: Authentication
 * Responsibility: Handles passwordless magic link sign-in flows
 * Depends on: sonner for toasts
 */

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { AuthApiError } from "@supabase/supabase-js";
import { useTranslations } from "@/components/providers/locale-provider";
import type { MagicLinkStatusCopy } from "@/lib/auth/magic-link";

export interface MagicLinkAuthState {
  magicLinkRequested: boolean;
  magicLinkCountdown: number;
  magicLinkLoading: boolean;
}

export interface UseMagicLinkAuthOptions {
  inviteCode: string | null;
  redirectTo?: string | null;
  captchaToken?: string | null;
}

export interface UseMagicLinkAuthReturn extends MagicLinkAuthState {
  sendMagicLink: (email: string, options?: { silent?: boolean }) => Promise<void>;
  getMagicLinkStatus: (email: string) => MagicLinkStatusCopy | null;
  decrementMagicLinkCountdown: () => void;
  resetMagicLinkState: () => void;
}

export function useMagicLinkAuth({
  inviteCode,
  redirectTo,
  captchaToken,
}: UseMagicLinkAuthOptions): UseMagicLinkAuthReturn {
  const t = useTranslations("auth");
  const [magicLinkRequested, setMagicLinkRequested] = useState(false);
  const [magicLinkCountdown, setMagicLinkCountdown] = useState(0);
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);

  const sendMagicLink = useCallback(
    async (email: string, { silent = false }: { silent?: boolean } = {}) => {
      const normalizedEmail = email?.toLowerCase().trim();
      if (!normalizedEmail) {
        const message = t("toasts.emailRequired");
        if (!silent) toast.error(message);
        throw new Error(message);
      }

      // Check countdown
      if (magicLinkCountdown > 0) {
        if (!silent) {
          toast.info(t("toasts.waitMagicLink", { seconds: magicLinkCountdown }));
        }
        return;
      }

      const redirectTarget = redirectTo && redirectTo.trim().length > 0 ? redirectTo : "/app";

      try {
        setMagicLinkLoading(true);
        const response = await fetch("/api/auth/email/magiclink", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            email: normalizedEmail,
            invite_code: inviteCode,
            redirectTo: redirectTarget,
            captchaToken,
          }),
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          const message =
            typeof payload?.message === "string" ? payload.message : t("toasts.magicLinkFailed");
          throw new Error(message);
        }

        if (!silent) {
          toast.success(
            magicLinkRequested ? t("toasts.magicLinkResent") : t("toasts.magicLinkSent")
          );
        }
        setMagicLinkRequested(true);
        setMagicLinkCountdown(60);
      } catch (error) {
        const message =
          error instanceof AuthApiError
            ? error.message
            : error instanceof TypeError && /Failed to fetch/i.test(error.message)
              ? t("toasts.cannotReachAuthEndpoint")
              : error instanceof Error
                ? error.message
                : t("toasts.magicLinkFailed");
        if (!silent) {
          toast.error(message);
        }
        throw new Error(message);
      } finally {
        setMagicLinkLoading(false);
      }
    },
    [captchaToken, inviteCode, magicLinkCountdown, magicLinkRequested, redirectTo, t]
  );

  const getMagicLinkStatus = useCallback(
    (email: string): MagicLinkStatusCopy | null => {
      const normalizedEmail = email?.trim();
      const emailTarget =
        normalizedEmail && normalizedEmail.length > 0
          ? normalizedEmail
          : t("identifier.email");

      if (!magicLinkRequested) {
        return {
          requested: false,
          email: emailTarget,
          headline: t("entry.continueWithMagicLink"),
          detail: "",
          ctaLabel: t("identifier.sendMagicLink"),
          ctaDisabled: false,
        };
      }

      if (magicLinkCountdown > 0) {
        return {
          requested: true,
          email: emailTarget,
          headline: t("magicLink.checkInboxBody", { email: emailTarget }),
          detail: t("otp.resendIn", { seconds: magicLinkCountdown }),
          ctaLabel: t("otp.resendIn", { seconds: magicLinkCountdown }),
          ctaDisabled: true,
        };
      }

      return {
        requested: true,
        email: emailTarget,
        headline: t("magicLink.checkInboxBody", { email: emailTarget }),
        detail: "",
        ctaLabel: t("otp.resendCode"),
        ctaDisabled: false,
      };
    },
    [magicLinkCountdown, magicLinkRequested, t]
  );

  const decrementMagicLinkCountdown = useCallback(() => {
    setMagicLinkCountdown((prev) => Math.max(prev - 1, 0));
  }, []);

  const resetMagicLinkState = useCallback(() => {
    setMagicLinkRequested(false);
    setMagicLinkCountdown(0);
    setMagicLinkLoading(false);
  }, []);

  return {
    magicLinkRequested,
    magicLinkCountdown,
    magicLinkLoading,
    sendMagicLink,
    getMagicLinkStatus,
    decrementMagicLinkCountdown,
    resetMagicLinkState,
  };
}
