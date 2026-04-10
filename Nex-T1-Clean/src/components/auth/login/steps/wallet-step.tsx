"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef } from "react";
import { ChevronLeft, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { Mode, WalletAuthMethod } from "@/components/auth/login/types";
import { useTranslations } from "@/components/providers/locale-provider";

export type WalletStepProps = {
  method: WalletAuthMethod;
  mode: Mode;
  loading: boolean;
  error?: string | null;
  hasAcceptedPolicies: boolean;
  onHasAcceptedPoliciesChange?: (value: boolean) => void;
  onBack: () => void;
  onBegin: () => void;
};

export function WalletStep({
  method,
  mode,
  loading,
  error,
  hasAcceptedPolicies,
  onHasAcceptedPoliciesChange,
  onBack,
  onBegin,
}: WalletStepProps) {
  const t = useTranslations("auth");
  const startedRef = useRef(false);
  const requiresConsent = mode === "sign-up";

  useEffect(() => {
    if (mode !== "sign-in") return;
    if (startedRef.current) return;
    startedRef.current = true;
    onBegin();
  }, [mode, onBegin]);

  const copy = {
    "wallet-evm": {
      title: t("wallet.evmTitle"),
      description: t("wallet.evmDescription"),
      iconSrc: "/assets/wallet-logos/Metamask.svg",
    },
    walletconnect: {
      title: t("wallet.walletConnectTitle"),
      description: t("wallet.walletConnectDescription"),
      iconSrc: "/assets/wallet-logos/WalletConnect.svg",
    },
    "wallet-solana": {
      title: t("wallet.solanaTitle"),
      description: t("wallet.solanaDescription"),
      iconSrc: "/assets/wallet-logos/phantom.svg",
    },
  } satisfies Record<WalletAuthMethod, { title: string; description: string; iconSrc: string }>;

  const activeCopy = copy[method];

  const actionLabel = useMemo(() => {
    if (loading) return t("wallet.waitingApproval");
    if (mode === "sign-up") return t("wallet.createAccount");
    return t("wallet.continue");
  }, [loading, mode, t]);

  const disableBegin = loading || (requiresConsent && !hasAcceptedPolicies);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-foreground"
        >
          <ChevronLeft className="opacity-45" />
        </button>
        <h2 className="text-xl font-regular">{activeCopy.title}</h2>
        <span className="h-8 w-8 opacity-0" />
      </div>

      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-border bg-muted">
          <Image src={activeCopy.iconSrc} alt={`${activeCopy.title} icon`} width={48} height={48} className="h-10 w-10" />
        </div>
        <div>
          <p className="text-xl font-medium">{t("wallet.loginSuffix", { title: activeCopy.title })}</p>
          <p className="text-muted-foreground mt-1 text-sm">{activeCopy.description}</p>
        </div>
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}
      </div>

      {requiresConsent ? (
        <div className="rounded-2xl border border-border bg-muted px-3 py-3 text-left text-foreground">
          <Label htmlFor="wallet-legal-consent" className="text-xs font-medium">
            <div className="flex items-start gap-3">
              <Checkbox
                id="wallet-legal-consent"
                checked={hasAcceptedPolicies}
                onCheckedChange={(value) => onHasAcceptedPoliciesChange?.(Boolean(value))}
                className="mt-0.5"
              />
              <span className="leading-relaxed">
                {t("wallet.consent")}
              </span>
            </div>
          </Label>
        </div>
      ) : null}

      <Button
        type="button"
        className="h-11 w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
        onClick={onBegin}
        disabled={disableBegin}
      >
        <span className="flex items-center justify-center gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          <span>{actionLabel}</span>
        </span>
      </Button>
    </div>
  );
}
