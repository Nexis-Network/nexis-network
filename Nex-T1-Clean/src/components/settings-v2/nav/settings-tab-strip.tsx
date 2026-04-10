"use client";

import Link from "next/link";
import type { ReadonlyURLSearchParams } from "next/navigation";

import { useTranslations } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";
import { translateSettingsLabel } from "@/i18n/label-maps";
import { isSettingsHrefActive } from "@/modules/settings/registry";
import type { SettingsTabConfig } from "@/modules/settings/types";

type SettingsTabStripProps = {
  tabs: readonly SettingsTabConfig[];
  pathname: string;
  searchParams: URLSearchParams | ReadonlyURLSearchParams;
  variant?: "header" | "content";
};

export function SettingsTabStrip({
  tabs,
  pathname,
  searchParams,
  variant = "content",
}: SettingsTabStripProps) {
  const t = useTranslations("settingsNav");

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "no-scrollbar flex overflow-x-auto",
        variant === "header"
          ? "items-start gap-3 px-0 py-0"
          : "items-center gap-5 border-b border-border/70 px-0 pb-3 pt-0",
      )}
    >
      {tabs.map((tab) => {
        const isActive = isSettingsHrefActive(tab.href, pathname, searchParams);
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={cn(
              "relative inline-flex shrink-0 whitespace-nowrap text-sm font-medium transition-colors",
              variant === "header"
                ? "h-[42px] items-center pb-[10px]"
                : "h-10 items-center pb-2",
              isActive
                ? variant === "header"
                  ? "text-foreground"
                  : "text-foreground"
                : variant === "header"
                  ? "text-muted-foreground hover:text-foreground"
                  : "text-muted-foreground hover:text-foreground",
            )}
          >
            {translateSettingsLabel(t, tab.label)}
            <span
              className={cn(
                "absolute inset-x-0 bottom-0 h-0.5 rounded-none transition-opacity",
                isActive ? "bg-foreground opacity-100" : "opacity-0",
              )}
            />
          </Link>
        );
      })}
    </div>
  );
}
