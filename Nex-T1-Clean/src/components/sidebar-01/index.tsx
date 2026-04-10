import type { ReactNode } from "react";

import { AppHeader } from "@/components/app-header/app-header";
import { cn } from "@/lib/utils";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/sidebar-01/app-sidebar";

export function DocsSidebarLayout({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <SidebarProvider defaultOpen>
      <div
        className={cn(
          "bg-[#131313] text-[#f1f1f1]",
          "[--docs-header-height:2.85rem]",
          "[--docs-shell-height:100dvh]",
          "[--docs-header-offset:calc(var(--docs-header-height)+env(safe-area-inset-top))]",
          "supports-[height:100svh]:[--docs-shell-height:100svh]",
          "h-[var(--docs-shell-height)] max-h-[var(--docs-shell-height)] overflow-hidden",
          "[&_[data-slot=sidebar-container]]:top-[var(--docs-header-offset)]",
          "[&_[data-slot=sidebar-container]]:h-[calc(var(--docs-shell-height)-var(--docs-header-offset))]",
          "[&_[data-slot=sidebar-gap]]:mt-[var(--docs-header-offset)]",
        )}
      >
        <div className="flex h-full w-full flex-col overflow-hidden">
          <AppHeader className="shrink-0" />
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <AppSidebar />
            <SidebarInset
              className={cn(
                "min-w-0 overflow-hidden bg-[#131313] text-[#f1f1f1] md:rounded-tl-lg md:border-t md:border-l md:border-white/6",
                className,
              )}
            >
              <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-contain [scrollbar-gutter:stable]">
                {children}
              </div>
            </SidebarInset>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}

export default DocsSidebarLayout;
