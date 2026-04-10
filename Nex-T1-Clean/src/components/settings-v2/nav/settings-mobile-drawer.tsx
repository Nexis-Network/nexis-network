"use client";

import Link from "next/link";
import { Menu } from "lucide-react";

import { useTranslations } from "@/components/providers/locale-provider";
import { Button } from "@/components/settings/shared/settings-button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { translateSettingsDescription, translateSettingsLabel } from "@/i18n/label-maps";
import { cn } from "@/lib/utils";
import { getSettingsSectionByPathname, settingsSectionRegistry } from "@/modules/settings/registry";

type SettingsMobileDrawerProps = {
  pathname: string;
};

export function SettingsMobileDrawer({ pathname }: SettingsMobileDrawerProps) {
  const t = useTranslations("settingsNav");
  const activeSection = getSettingsSectionByPathname(pathname);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8 lg:hidden"
        >
          <Menu className="size-4" />
          <span className="sr-only">{t("openNavigation")}</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-full max-w-sm border-border/70 bg-background text-foreground"
      >
        <SheetHeader className="border-b border-border/70 pb-4">
          <SheetTitle className="text-left text-base font-semibold text-foreground">
            {t("navigationTitle")}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-2">
          {settingsSectionRegistry.map((section) => {
            const Icon = section.icon;
            const isActive = section.id === activeSection.id;

            return (
              <Link
                key={section.id}
                href={section.href}
                className={cn(
                  "flex items-start gap-3 rounded-lg border px-3 py-3 transition-colors",
                  isActive
                    ? "border-border bg-accent text-accent-foreground"
                    : "border-border/70 bg-card hover:bg-muted",
                )}
              >
                <span className="inline-flex size-8 items-center justify-center rounded-md border border-border/70 bg-muted/60">
                  <Icon className="size-4" />
                </span>
                <span>
                  <span className="block text-sm font-medium">
                    {translateSettingsLabel(t, section.label)}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {translateSettingsDescription(t, section.description)}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
