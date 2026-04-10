"use client";

import { cn } from "@/lib/utils";
import { GlobeIcon } from "lucide-react";
import type { ComponentProps } from "react";

export type SourceProps = ComponentProps<"a"> & {
  href: string;
};

export const Source = ({ href, className, children, ...props }: SourceProps) => (
  <a
    className={cn(
      "flex min-w-0 items-start gap-2 rounded-xl border border-border/40 bg-background/60 px-3 py-2 text-left text-sm shadow-sm transition-colors hover:border-border hover:bg-background",
      className,
    )}
    href={href}
    rel="noreferrer"
    target="_blank"
    {...props}
  >
    {children}
  </a>
);

export type SourceTriggerProps = ComponentProps<"div"> & {
  label?: string;
  showFavicon?: boolean;
};

export const SourceTrigger = ({
  label,
  showFavicon = false,
  className,
  ...props
}: SourceTriggerProps) => (
  <div
    className={cn(
      "inline-flex items-center gap-1 rounded-full border border-border/40 bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground",
      className,
    )}
    {...props}
  >
    {showFavicon ? <GlobeIcon className="h-3 w-3" /> : null}
    <span className="truncate">{label}</span>
  </div>
);

export type SourceContentProps = {
  title: string;
  description?: string;
  className?: string;
};

export const SourceContent = ({ title, description, className }: SourceContentProps) => (
  <div className={cn("min-w-0 space-y-1", className)}>
    <p className="text-sm font-semibold text-foreground line-clamp-2">{title}</p>
    {description && (
      <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>
    )}
  </div>
);
