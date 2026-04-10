"use client";

import { useEffect } from "react";
import { ChevronLeft, Fingerprint } from "lucide-react";

import { useTranslations } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";

export type PasskeyStepProps = {
  onBack: () => void;
  onBegin: () => void;
};

export function PasskeyStep({ onBack, onBegin }: PasskeyStepProps) {
  const t = useTranslations("auth");

  useEffect(() => {
    onBegin();
  }, [onBegin]);

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
        <h2 className="text-xl font-regular">{t("passkey.title")}</h2>
        <span className="h-8 w-8 opacity-0" />
      </div>

      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-border bg-muted">
          <Fingerprint className="h-8 w-8 opacity-60" />
        </div>
        <div>
          <p className="text-xl font-medium">{t("passkey.waitingTitle")}</p>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("passkey.waitingBody")}
          </p>
        </div>
        <Button
          type="button"
          className="rounded-full border border-border bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={onBack}
        >
          {t("passkey.cancel")}
        </Button>
      </div>
    </div>
  );
}
