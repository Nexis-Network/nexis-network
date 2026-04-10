"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { ACTIVE_LOCALE_OPTIONS, LOCALE_COOKIE_NAME } from "@/i18n/config";
import { useLocale, useTranslations } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

type LocaleSwitcherProps = {
  className?: string;
  compact?: boolean;
};

export function LocaleSwitcher({ className, compact = false }: LocaleSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const locale = useLocale();
  const t = useTranslations("common");

  return (
    <label className={cn("inline-flex items-center gap-2 text-xs text-muted-foreground", className)}>
      {!compact ? <span className="hidden sm:inline">{t("language")}</span> : null}
      <select
        aria-label={t("selectLanguage")}
        data-testid="locale-switcher"
        className={cn(
          "h-8 rounded-md border border-white/10 bg-black/20 px-2 text-xs text-white outline-none transition-opacity",
          isPending && "opacity-70",
        )}
        value={locale}
        onChange={(event) => {
          const nextLocale = event.target.value;
          document.cookie = `${LOCALE_COOKIE_NAME}=${encodeURIComponent(nextLocale)}; path=/; max-age=31536000; samesite=lax`;
          startTransition(() => {
            router.refresh();
          });
        }}
      >
        {ACTIVE_LOCALE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.nativeLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
