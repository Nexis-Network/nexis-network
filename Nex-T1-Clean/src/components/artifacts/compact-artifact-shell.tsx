"use client";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { XIcon } from "lucide-react";

type CompactArtifactShellProps = {
  children: React.ReactNode;
  immersive: boolean;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  subtitle?: string | null;
  title: string;
  viewport: "phone" | "tablet";
};

export function CompactArtifactShell({
  children,
  immersive,
  onOpenChange,
  open,
  subtitle,
  title,
  viewport,
}: CompactArtifactShellProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
      <DrawerContent
        className={cn(
          "border-[var(--artifact-border)] bg-[var(--artifact-panel)] text-[var(--artifact-foreground)] shadow-[0px_16px_48px_-24px_rgba(0,0,0,0.45)]",
          immersive
            ? "mt-0 h-[100svh] max-h-[100svh] rounded-none border-x-0 border-b-0"
            : "max-h-[92svh] rounded-t-[30px]",
          viewport === "tablet" &&
            "left-1/2 right-auto w-[min(92vw,58rem)] -translate-x-1/2 rounded-t-[32px] border",
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <DrawerHeader className="sticky top-0 z-20 border-b border-[var(--artifact-border)] bg-[var(--artifact-panel)]/95 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] text-left backdrop-blur">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <DrawerTitle className="truncate text-base font-medium text-[var(--artifact-foreground)]">
                  {title}
                </DrawerTitle>
                {subtitle ? (
                  <div className="mt-1 truncate text-xs text-[var(--artifact-muted)]">
                    {subtitle}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="inline-flex size-9 items-center justify-center rounded-full border border-[var(--artifact-border)] bg-[var(--artifact-surface)] text-[var(--artifact-muted)] transition-colors hover:text-[var(--artifact-foreground)]"
                aria-label="Close artifacts panel"
              >
                <XIcon className="size-4" />
              </button>
            </div>
          </DrawerHeader>
          <div className="min-h-0 flex-1 overflow-hidden px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
            {children}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
