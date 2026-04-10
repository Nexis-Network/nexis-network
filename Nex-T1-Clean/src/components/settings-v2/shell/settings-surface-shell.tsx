import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type SettingsSurfaceShellProps = {
  children: ReactNode;
  className?: string;
  canvasClassName?: string;
  mainClassName?: string;
  stackClassName?: string;
  topSlot?: ReactNode;
  topSlotClassName?: string;
  width?: "standard" | "wide";
  withThemeScope?: boolean;
  includeFooterSpacer?: boolean;
};

export function SettingsSurfaceShell({
  children,
  className,
  canvasClassName,
  mainClassName,
  stackClassName,
  topSlot,
  topSlotClassName,
  width = "standard",
  withThemeScope = true,
  includeFooterSpacer = true,
}: SettingsSurfaceShellProps) {
  return (
    <div
      className={cn(
        "flex min-h-0 w-full flex-1 flex-col overflow-hidden",
        withThemeScope && "settings-v2-theme",
        className,
      )}
    >
      <div
        data-settings-canvas
        data-settings-shell-width={width}
        className={cn(
          "flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-xl border border-border/70 bg-background shadow-none",
          canvasClassName,
        )}
      >
        <main
          data-settings-scroll
          className={cn("min-h-0 flex-1 overflow-y-auto", mainClassName)}
        >
          <div
            data-settings-stack
            className={cn(
              "mx-auto flex min-h-full w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8",
              width === "wide" && "max-w-screen-2xl",
              stackClassName,
            )}
          >
            {topSlot ? (
              <div
                data-settings-shell-top
                className={cn("pb-6", topSlotClassName)}
              >
                {topSlot}
              </div>
            ) : null}

            <div className="flex-1">{children}</div>
            {includeFooterSpacer ? <div className="h-20 shrink-0" /> : null}
          </div>
        </main>
      </div>
    </div>
  );
}
