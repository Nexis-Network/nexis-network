"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { HyperText } from "@/components/ui/hyper-text";
import { ActivityFeedCard } from "../right-panel/activity-feed-card";
import {
  settingsRouteRegistry,
  normalizeSettingsPath,
} from "@/components/settings/shared/settings-route-registry";

type SettingsSidebarProps = { collapsed?: boolean };

export function SettingsSidebar({ collapsed = false }: SettingsSidebarProps) {
  const pathname = usePathname() ?? "";
  const normalizedPath = normalizeSettingsPath(pathname);

  const isRouteActive = (href: string) => {
    const normalizedHref = normalizeSettingsPath(href);
    if (normalizedHref === "/settings") return normalizedPath === "/settings";
    return normalizedPath.startsWith(normalizedHref);
  };

  return (
    <div className="flex h-full flex-col bg-transparent">
      <div className={cn("flex shrink-0 items-start pb-3 pt-4", collapsed ? "justify-center px-2" : "px-4 pr-12")}>
        <Link
          href="/app"
          aria-label="Back to dashboard"
          className="inline-flex items-center focus-visible:outline-none"
        >
          {collapsed ? null : (
            <Image
              src="/assets/settings-sidebar-logo.svg"
              alt="Nexis settings"
              width={128}
              height={28}
              className="h-7 w-auto"
              style={{ width: "auto" }}
            />
          )}
        </Link>
      </div>

      <ScrollArea className={cn("flex-1", collapsed ? "px-2 pt-12" : "px-3 pt-12")}>
        <nav className="space-y-1 pb-4">
          {settingsRouteRegistry.map((route) => {
            const active = isRouteActive(route.href);
            const Icon = route.icon;

            return (
              <Link
                key={route.id}
                href={route.href}
                title={route.label}
                className={cn(
                  "group flex items-center gap-3 rounded-[var(--settings-radius)] border border-transparent py-2.5 transition-colors duration-150",
                  collapsed ? "justify-center px-2" : "px-3.5",
                  active
                    ? "bg-[var(--settings-elevated)] text-[var(--settings-foreground-strong)]"
                    : "text-[var(--settings-foreground-muted)] hover:bg-[var(--settings-elevated)]/70 hover:text-[var(--settings-foreground-strong)]",
                )}
              >
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center",
                    active ? "text-[var(--settings-foreground-strong)]" : "text-[var(--settings-foreground-muted)] group-hover:text-[var(--settings-foreground-strong)]",
                  )}
                >
                  <Icon className="size-4" />
                </span>
                {!collapsed ? (
                  <HyperText
                    text={route.label}
                    animateOnHover={true}
                    className={cn(
                      "truncate text-[13px] font-medium transition-colors",
                      active
                        ? "text-[var(--settings-foreground-strong)]"
                        : "text-[var(--settings-foreground-muted)] group-hover:text-[var(--settings-foreground-strong)]",
                    )}
                  />
                ) : null}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {!collapsed ? (
        <div className="shrink-0 px-3 pb-3 pt-2">
          <ActivityFeedCard />
        </div>
      ) : null}
    </div>
  );
}
