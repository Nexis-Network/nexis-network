"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { ChevronDownIcon } from "lucide-react";
import type { ComponentProps } from "react";

export type StepsProps = ComponentProps<typeof Collapsible>;

export const Steps = ({ className, defaultOpen = true, ...props }: StepsProps) => (
  <Collapsible className={cn("w-full", className)} defaultOpen={defaultOpen} {...props} />
);

export type StepsTriggerProps = ComponentProps<typeof CollapsibleTrigger>;

export const StepsTrigger = ({ className, children, ...props }: StepsTriggerProps) => (
  <CollapsibleTrigger
    className={cn(
      "group flex w-full items-center justify-between rounded-xl border border-border/40 bg-muted/40 px-3 py-2 text-sm font-medium",
      className,
    )}
    {...props}
  >
    <span className="text-left">{children}</span>
    <ChevronDownIcon className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
  </CollapsibleTrigger>
);

export type StepsContentProps = ComponentProps<typeof CollapsibleContent>;

export const StepsContent = ({ className, ...props }: StepsContentProps) => (
  <CollapsibleContent
    className={cn(
      "mt-2 space-y-2",
      "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-muted-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
      className,
    )}
    {...props}
  />
);

export type StepsItemProps = ComponentProps<"div">;

export const StepsItem = ({ className, children, ...props }: StepsItemProps) => (
  <div
    className={cn(
      "rounded-xl border border-border/30 bg-background/70 px-3 py-2 text-xs text-foreground shadow-sm",
      className,
    )}
    {...props}
  >
    {children}
  </div>
);
