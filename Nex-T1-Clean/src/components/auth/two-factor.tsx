"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "@/components/providers/locale-provider";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { syncBackendSessions } from "@/lib/auth/session-sync";


import { logger } from '@/lib/logger';
type MfaFactor = {
  id: string;
  factor_type: string;
  friendly_name?: string | null;
  status: string;
};

type TwoFactorProps = {
  redirectTo?: string;
};

type ChallengeState = {
  challengeId: string;
  factorId: string;
};

const RESEND_COOLDOWN_SECONDS = 60;

export function TwoFactorVerification({ redirectTo }: TwoFactorProps) {
  const t = useTranslations("auth");
  const router = useRouter();
  const params = useSearchParams();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [selectedFactor, setSelectedFactor] = useState<MfaFactor | null>(null);
  const [challenge, setChallenge] = useState<ChallengeState | null>(null);
  const [code, setCode] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);
  const [initialised, setInitialised] = useState(false);
  const [loading, setLoading] = useState(false);
  const [challengeLoading, setChallengeLoading] = useState(false);

  const provider = params?.get("provider") ?? undefined;
  const initialError = params?.get("error_description") ?? params?.get("error") ?? undefined;

  useEffect(() => {
    if (!initialError) return;
    toast.error(initialError);
  }, [initialError]);

  useEffect(() => {
    if (!supabase || initialised) return;
    let cancelled = false;

    const loadFactors = async () => {
      try {
        const { data, error } = await supabase.auth.mfa.listFactors();
        if (error) {
          throw error;
        }
        const factorsList = Array.isArray(data?.factors) ? (data?.factors as MfaFactor[]) : [];
        const verified = factorsList.filter((factor: MfaFactor) => factor.status === "verified");
        if (!verified.length) {
          toast.error(t("toasts.verificationMethodsUnavailable"));
          return;
        }
        verified.sort((a, b) => {
          if (a.factor_type === b.factor_type) return 0;
          if (a.factor_type === "phone") return -1;
          if (b.factor_type === "phone") return 1;
          return 0;
        });
        if (!cancelled) {
          setSelectedFactor(verified[0]);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : t("toasts.unableToLoadVerificationMethods");
        toast.error(message);
      } finally {
        if (!cancelled) {
          setInitialised(true);
        }
      }
    };

    void loadFactors();

    return () => {
      cancelled = true;
    };
  }, [initialised, supabase, t]);

  useEffect(() => {
    if (!challenge || resendCountdown <= 0) return;
    const timer = window.setTimeout(() => setResendCountdown((prev) => Math.max(prev - 1, 0)), 1000);
    return () => window.clearTimeout(timer);
  }, [challenge, resendCountdown]);

  const bootstrapSession = useCallback(
    async (accessToken?: string | null) => {
      if (!supabase) return;
      let token = accessToken ?? null;
      if (!token) {
        try {
          const { data } = await supabase.auth.getSession();
          token = data.session?.access_token ?? null;
        } catch (error) {
          logger.warn("two_factor_session_fetch_failed", error);
        }
      }
      if (!token) return;

      try {
        await syncBackendSessions(token);
      } catch (error) {
        logger.warn("two_factor_session_sync_failed", error);
      }
    },
    [supabase],
  );

  const startChallenge = useCallback(
    async (factor: MfaFactor) => {
      if (!supabase) return;
      setChallengeLoading(true);
      try {
        const { data, error } = await supabase.auth.mfa.challenge({
          factorId: factor.id,
        });
        if (error || !data?.id) {
          throw error ?? new Error("Challenge failed");
        }
        setChallenge({ challengeId: data.id, factorId: factor.id });
        setCode("");
        if (factor.factor_type === "phone") {
          setResendCountdown(RESEND_COOLDOWN_SECONDS);
          toast.success(t("toasts.challengeSentSms"));
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : t("toasts.unableToSendChallenge");
        toast.error(message);
      } finally {
        setChallengeLoading(false);
      }
    },
    [supabase, t],
  );

  useEffect(() => {
    if (!selectedFactor || challengeLoading || challenge) return;
    void startChallenge(selectedFactor);
  }, [challenge, challengeLoading, selectedFactor, startChallenge]);

  const handleVerify = useCallback(
    async (event?: React.FormEvent) => {
      if (event) event.preventDefault();
      if (!supabase || !selectedFactor || !challenge) return;
      if (!code.trim()) {
        toast.error(t("toasts.enterTwoFactorCode"));
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await supabase.auth.mfa.verify({
          factorId: selectedFactor.id,
          challengeId: challenge.challengeId,
          code: code.trim(),
        });
        if (error) {
          throw error;
        }

        await bootstrapSession(data?.session?.access_token ?? null);

        toast.success(t("toasts.multiFactorComplete"));
        router.replace(redirectTo && redirectTo.length > 0 ? redirectTo : "/");
        router.refresh();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : t("toasts.multiFactorFailed");
        toast.error(message);
      } finally {
        setLoading(false);
      }
    },
    [bootstrapSession, challenge, code, redirectTo, router, selectedFactor, supabase, t],
  );

  const handleResend = useCallback(async () => {
    if (!selectedFactor || resendCountdown > 0) return;
    await startChallenge(selectedFactor);
  }, [resendCountdown, selectedFactor, startChallenge]);

  if (!supabase) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-3 text-sm text-muted-foreground">
        <p>{t("twoFactor.unavailable")}</p>
        <p className="max-w-md text-center">
          {t("twoFactor.unavailableBody")}
        </p>
      </div>
    );
  }

  if (!selectedFactor) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-3 text-sm text-muted-foreground">
        <p>{t("twoFactor.noFactors")}</p>
        <p className="max-w-md text-center">
          {t("twoFactor.noFactorsBody")}
        </p>
      </div>
    );
  }

  const factorLabel =
    selectedFactor.friendly_name ||
    (selectedFactor.factor_type === "phone" ? t("twoFactor.smsCode") : t("twoFactor.authenticatorApp"));

  return (
    <form
      onSubmit={handleVerify}
      className="mx-auto flex w-full max-w-sm flex-col gap-6 rounded-2xl border border-border/40 bg-card/40 p-6 backdrop-blur-md"
    >
      <div className="space-y-2 text-center">
        <h1 className="text-xl font-regular">{t("twoFactor.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {provider
            ? t("twoFactor.subtitleProvider", { provider })
            : t("twoFactor.subtitleDefault")}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="mfa-code">{t("twoFactor.enterCodeFrom", { factor: factorLabel })}</Label>
        <Input
          id="mfa-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          minLength={4}
          maxLength={10}
          required
          disabled={loading}
        />
      </div>

      {selectedFactor.factor_type === "phone" ? (
        <Button
          type="button"
          variant="link"
          className="justify-start px-0 text-sm text-muted-foreground"
          onClick={handleResend}
          disabled={resendCountdown > 0 || challengeLoading}
        >
          {resendCountdown > 0
            ? t("twoFactor.resendIn", { seconds: resendCountdown })
            : t("twoFactor.resendCode")}
        </Button>
      ) : null}

      <Button type="submit" disabled={loading || challengeLoading}>
        {loading ? t("twoFactor.verifying") : t("twoFactor.verify")}
      </Button>
    </form>
  );
}
