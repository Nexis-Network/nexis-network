"use client";

import { ChevronLeft, ArrowRight, LogIn } from "lucide-react";

import { useTranslations } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type OtpStepProps = {
  destinationLabel: string;
  otpCode: string;
  otpLoading: boolean;
  otpCountdown: number;
  loading: boolean;
  onBack: () => void;
  onCodeChange: (value: string) => void;
  onSubmit: () => void;
  onResend: () => void;
  onUseDifferentNumber: () => void;
};

export function OtpStep({
  destinationLabel,
  otpCode,
  otpLoading,
  otpCountdown,
  loading,
  onBack,
  onCodeChange,
  onSubmit,
  onResend,
  onUseDifferentNumber,
}: OtpStepProps) {
  const t = useTranslations("auth");

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
        <h2 className="text-xl font-regular">{t("otp.title")}</h2>
        <span className="h-8 w-8 opacity-0" />
      </div>

      <div className="rounded-2xl border border-border bg-muted px-4 py-3 text-sm text-foreground">
        <p className="text-muted-foreground text-xs">{t("otp.sentTo")}</p>
        <p className="text-sm font-medium wrap-break-word">{destinationLabel}</p>
      </div>

      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <Input
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="one-time-code"
          maxLength={8}
          value={otpCode}
          onChange={(event) => onCodeChange(event.target.value.replace(/[^0-9]/g, ""))}
          placeholder={t("otp.placeholder")}
          className="h-12 rounded-xl border border-border bg-background text-center text-lg tracking-widest"
          disabled={otpLoading}
          required
        />
        <Button
          type="submit"
          className="h-11 w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
          disabled={otpLoading || otpCode.trim().length < 4}
        >
          <span className="flex items-center justify-center gap-2">
            {otpLoading ? <ArrowRight className="h-4 w-4 animate-pulse" /> : <LogIn className="h-4 w-4" />}
            <span>{otpLoading ? t("otp.verifying") : t("otp.verifyCode")}</span>
          </span>
        </Button>
      </form>

      <div className="flex flex-col gap-2 text-xs text-muted-foreground">
        <button
          type="button"
          className="self-start text-xs font-medium text-foreground underline-offset-2 hover:underline"
          onClick={onResend}
          disabled={otpLoading || loading || otpCountdown > 0}
        >
          {otpCountdown > 0
            ? t("otp.resendIn", { seconds: otpCountdown })
            : t("otp.resendCode")}
        </button>
        <button
          type="button"
          className="self-start text-xs text-muted-foreground underline"
          onClick={onUseDifferentNumber}
        >
          {t("otp.useDifferentContact")}
        </button>
      </div>
    </div>
  );
}
