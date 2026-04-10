"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SourceCard } from "@/components/sources/source-card";
import { SourceLogoStack } from "@/components/sources/source-logo-stack";
import { cn } from "@/lib/utils";
import { ChevronDownIcon } from "lucide-react";
import type {
  ComponentProps,
  ReactNode,
} from "react";

type SourcePreview = {
  title?: string | null;
  url?: string | null;
  snippet?: string | null;
};

export type SourcesProps = {
  children: ReactNode;
  className?: string;
  defaultOpen?: boolean;
  modal?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export const Sources = ({
  children,
  className,
  defaultOpen,
  modal,
  open,
  onOpenChange,
}: SourcesProps) => (
  <div className={cn("not-prose mb-4 text-primary text-xs", className)}>
    <Popover
      defaultOpen={defaultOpen}
      modal={modal}
      open={open}
      onOpenChange={onOpenChange}
    >
      {children}
    </Popover>
  </div>
);

export type SourcesTriggerProps = ComponentProps<typeof PopoverTrigger> & {
  count: number;
  label?: string;
  sources?: SourcePreview[];
};

export const SourcesTrigger = ({
  className,
  count,
  children,
  label,
  sources = [],
  ...props
}: SourcesTriggerProps) => (
  <PopoverTrigger
    className={cn(
      "group inline-flex items-center gap-2 rounded-full px-2.5 py-1.5 text-[rgba(232,232,227,0.55)] transition-colors hover:text-[#E8E8E3]",
      className,
    )}
    {...props}
  >
    {children ?? (
      <>
        <SourceLogoStack
          className="mr-0.5"
          size={16}
          sources={sources}
        />
        <p className="font-medium normal-case tracking-normal text-current">
          {label ?? `${count} source${count === 1 ? "" : "s"}`}
        </p>
        <ChevronDownIcon className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
      </>
    )}
  </PopoverTrigger>
);

export type SourcesContentProps = ComponentProps<typeof PopoverContent>;

export const SourcesContent = ({
  className,
  align = "end",
  side = "top",
  sideOffset = 10,
  ...props
}: SourcesContentProps) => (
  <PopoverContent
    align={align}
    className={cn(
      "flex max-h-[min(26rem,70vh)] w-[min(24rem,calc(100vw-2rem))] flex-col gap-2 overflow-y-auto rounded-xl p-3",
      className,
    )}
    side={side}
    sideOffset={sideOffset}
    {...props}
  />
);

export type SourceProps = ComponentProps<typeof SourceCard>;

export const Source = ({
  href,
  title,
  description,
  children,
  ...props
}: SourceProps) => (
  <SourceCard
    description={description}
    href={href}
    title={title}
    {...props}
  >
    {children}
  </SourceCard>
);
