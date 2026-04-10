"use client";

import type { ReactNode } from "react";

import { appShellClasses } from "@/components/app/app-shell-primitives";
import { AppHeader } from "@/components/app-header/app-header";
import { cn } from "@/lib/utils";

type CreateBuilderShellProps = {
  children: ReactNode;
};

export function CreateBuilderShell({
  children,
}: CreateBuilderShellProps) {
  return (
    <div className={appShellClasses.frame}>
      <div className="relative z-50 flex-none">
        <AppHeader />
      </div>

      <main
        className={cn(
          appShellClasses.workspaceWrap,
          "md:pr-[var(--auth-shell-padding-x)]",
        )}
      >
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-1 md:gap-[var(--auth-shell-gap)]">
          <section
            className={cn(
              appShellClasses.workspaceSurface,
              "relative overflow-hidden bg-[var(--auth-card-bg)]",
            )}
          >
            {children}
          </section>
        </div>
      </main>
    </div>
  );
}
