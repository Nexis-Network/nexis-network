"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { ChevronDownIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

export type ChainOfThoughtProps = ComponentProps<"div">;

export const ChainOfThought = ({ className, ...props }: ChainOfThoughtProps) => (
  <div className={cn("space-y-3", className)} {...props} />
);

export type ChainOfThoughtStepProps = ComponentProps<typeof Collapsible>;

export const ChainOfThoughtStep = ({ className, children, ...props }: ChainOfThoughtStepProps) => (
  <Collapsible className={cn("rounded-xl border border-sky-400/40", className)} {...props}>
    {children}
  </Collapsible>
);

export type ChainOfThoughtTriggerProps = ComponentProps<typeof CollapsibleTrigger> & {
  leftIcon?: ReactNode;
};

export const ChainOfThoughtTrigger = ({
  className,
  children,
  leftIcon,
  ...props
}: ChainOfThoughtTriggerProps) => (
  <CollapsibleTrigger
    className={cn(
      "flex w-full items-center gap-2 rounded-xl bg-sky-400/20 px-3 py-2 text-sm font-semibold text-sky-100",
      className,
    )}
    {...props}
  >
    {leftIcon}
    <span className="flex-1 text-left">{children}</span>
    <ChevronDownIcon className="h-4 w-4 transition-transform data-[state=open]:rotate-180" />
  </CollapsibleTrigger>
);

export type ChainOfThoughtContentProps = ComponentProps<typeof CollapsibleContent>;

export const ChainOfThoughtContent = ({ className, ...props }: ChainOfThoughtContentProps) => (
  <CollapsibleContent
    className={cn(
      "space-y-2 border-t border-sky-400/30 bg-sky-400/5 px-3 py-3 text-sm text-sky-100",
      "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2",
      className,
    )}
    {...props}
  />
);

export type ChainOfThoughtItemProps = ComponentProps<"div">;

export const ChainOfThoughtItem = ({ className, ...props }: ChainOfThoughtItemProps) => (
  <div className={cn("text-sm leading-relaxed", className)} {...props} />
);
