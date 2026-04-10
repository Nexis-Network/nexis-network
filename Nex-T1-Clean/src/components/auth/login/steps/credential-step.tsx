"use client";

import Link from "next/link";
import { ChevronLeft, ArrowRight, UserPlus, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AuthMethod, Mode } from "@/components/auth/login/types";
import { useTranslations } from "@/components/providers/locale-provider";

export type CredentialStepProps = {
  authMethod: AuthMethod;
  mode: Mode;
  loading: boolean;
  password: string;
  confirmPassword: string;
  hasAcceptedPolicies: boolean;
  normalizedIdentifier: string;
  headerLabel: string;
  onBack: () => void;
  onSubmit: () => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onLegalConsentChange: (value: boolean) => void;
  onModeToggle: () => void;
  onForgotPassword: () => void;
};

export function CredentialStep({
  authMethod,
  mode,
  loading,
  password,
  confirmPassword,
  hasAcceptedPolicies,
  normalizedIdentifier,
  headerLabel,
  onBack,
  onSubmit,
  onPasswordChange,
  onConfirmPasswordChange,
  onLegalConsentChange,
  onModeToggle,
  onForgotPassword,
}: CredentialStepProps) {
  const t = useTranslations("auth");
  const isEmailSignUp = mode === "sign-up" && authMethod === "email";

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
        <h2 className="text-xl font-regular">
          {authMethod === "phone" ? t("credential.confirmPhone") : t("credential.enterPassword")}
        </h2>
        <span className="h-8 w-8 opacity-0" />
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-muted px-4 py-3 text-sm text-foreground">
          <p className="text-muted-foreground text-xs">{t("credential.signingInAs")}</p>
          <p className="text-sm font-medium wrap-break-word">{normalizedIdentifier}</p>
        </div>

        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <Input
            type="password"
            autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            placeholder={t("credential.password")}
            className="h-11 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground"
            disabled={loading}
            required
          />
          {mode === "sign-up" && (
            <Input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => onConfirmPasswordChange(event.target.value)}
              placeholder={t("credential.confirmPassword")}
              className="h-11 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground"
              disabled={loading}
              required
            />
          )}

          {isEmailSignUp ? (
            <div className="rounded-2xl border border-border bg-muted px-3 py-3 text-left text-foreground">
              <Label htmlFor="email-legal-consent" className="text-xs font-medium">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="email-legal-consent"
                    checked={hasAcceptedPolicies}
                    onCheckedChange={(value) => onLegalConsentChange(Boolean(value))}
                    className="mt-0.5"
                  />
                  <span className="leading-relaxed">
                    {t("credential.agreeToPrefix")}
                    <Link href="/terms" className="ml-1 underline">
                      {t("legal.termsOfService")}
                    </Link>
                    ,
                    <Link href="/privacy" className="ml-1 underline">
                      {t("legal.privacyPolicy")}
                    </Link>
                    , {t("legal.and")}
                    <Link href="/legal-compliance" className="ml-1 underline">
                      {t("legal.legalCompliance")}
                    </Link>
                    .
                  </span>
                </div>
              </Label>
            </div>
          ) : null}

          <Button
            type="submit"
            className="h-11 w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={loading || (mode === "sign-up" && !hasAcceptedPolicies)}
          >
            <span className="flex items-center justify-center gap-2">
              {loading ? (
                <ArrowRight className="h-4 w-4 animate-pulse" />
              ) : mode === "sign-up" ? (
                <UserPlus className="h-4 w-4" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              <span>{loading ? t("credential.processing") : headerLabel}</span>
            </span>
          </Button>
        </form>

        <div className="flex flex-col gap-2">
          {mode === "sign-in" && authMethod === "email" && (
            <button
              type="button"
              className="text-xs text-muted-foreground underline"
              onClick={onForgotPassword}
            >
              {t("credential.forgotPassword")}
            </button>
          )}
          <button
            type="button"
            className="text-xs text-muted-foreground underline"
            onClick={onModeToggle}
          >
            {mode === "sign-in" ? t("credential.needAccount") : t("credential.alreadyHaveAccount")}
          </button>
        </div>
      </div>
    </div>
  );
}
