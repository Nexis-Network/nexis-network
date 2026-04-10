"use client";

import Link from "next/link";
import type { ReadonlyURLSearchParams } from "next/navigation";

import { useTranslations } from "@/components/providers/locale-provider";
import { translateSettingsDescription, translateSettingsLabel } from "@/i18n/label-maps";
import { cn } from "@/lib/utils";
import { getSettingsSectionByPathname, isSettingsHrefActive, settingsSectionRegistry } from "@/modules/settings/registry";
import { getSettingsRailCopy } from "@/modules/settings/i18n";

type SettingsRailProps = {
  pathname: string;
  searchParams: URLSearchParams | ReadonlyURLSearchParams;
};

export function SettingsRail({ pathname, searchParams }: SettingsRailProps) {
  const t = useTranslations("settingsNav");
  const copy = getSettingsRailCopy(t);
  const activeSection = getSettingsSectionByPathname(pathname);

  return (
    <nav className="flex h-full flex-col gap-2 px-3 py-4" aria-label={copy.railAria}>
      <div className="px-2 pb-3">
        <p className="text-sm font-semibold text-foreground">
          {copy.railTitle}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {copy.railDescription}
        </p>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto pr-1">
        {settingsSectionRegistry.map((section) => {
          const isActive =
            section.id === activeSection.id || isSettingsHrefActive(section.href, pathname, searchParams);
          const Icon = section.icon;

          return (
            <Link
              key={section.id}
              href={section.href}
              className={cn(
                "group flex items-start gap-3 rounded-lg border px-3 py-3 transition-colors",
                isActive
                  ? "border-border bg-accent text-accent-foreground"
                  : "border-transparent text-muted-foreground hover:border-border/70 hover:bg-muted hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-md border transition-colors",
                  isActive
                    ? "border-border bg-background text-foreground"
                    : "border-border/70 bg-muted/60 text-muted-foreground",
                )}
              >
                <Icon className="size-4" />
              </span>

              <span className="min-w-0">
                <span className="block text-sm font-medium">{translateSettingsLabel(t, section.label)}</span>
                <span className="mt-1 block text-xs leading-5 text-inherit/80">{translateSettingsDescription(t, section.description)}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
