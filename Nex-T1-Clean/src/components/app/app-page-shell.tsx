"use client";

import { ReactNode } from "react";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { appShellClasses } from "@/components/app/app-shell-primitives";

/**
 * Shell for the /app route (Chat Interface).
 * Matches Figma design:
 * - Gradient Background: linear-gradient(0deg, #1B1B1B, #1B1B1B), #FFFFFF
 * - Layout:
 *   - Sidebar: Left (w-[50px])
 *   - Main Area: Flex col (Header, Chat, Footer)
 */

type AppPageShellProps = {
  header: ReactNode;
  sidebar: ReactNode;
  sidePanels?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  maintainRightInset?: boolean;
};

export function AppPageShell({
  header,
  sidebar,
  sidePanels,
  children,
  footer: _footer, // kept in props for compat but ignored or rendered differently
  className,
  maintainRightInset = true,
}: AppPageShellProps) {
  const { open } = useSidebar();

  return (
    <div 
      className={cn(
        appShellClasses.frame,
        className
      )}
    >
      <div className="relative z-50 flex-none">
        {header}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
        <aside
          data-slot="app-sidebar-shell"
          data-sidebar-state={open ? "expanded" : "collapsed"}
          aria-hidden={!open}
          className={cn(
            appShellClasses.sidebarShell,
            "motion-safe:transition-[width,opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
            open
              ? "w-[var(--auth-sidebar-shell-width)] translate-x-0 opacity-100"
              : "pointer-events-none w-0 -translate-x-2 opacity-0",
          )}
        >
          {sidebar}
        </aside>

        {sidePanels}

        <main
          data-slot="app-workspace"
          className={cn(
            appShellClasses.workspaceWrap,
            maintainRightInset
              ? "md:pr-[calc(var(--auth-shell-padding-x)+var(--auth-shell-right-inset))]"
              : null,
          )}
        >
          {children}
        </main>

      </div>
    </div>
  );
}
