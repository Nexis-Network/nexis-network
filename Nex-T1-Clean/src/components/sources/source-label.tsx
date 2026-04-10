"use client";

import { SourceIcon } from "@/components/sources/source-icon";
import { getSourceDisplayName } from "@/components/sources/source-metadata";
import { cn } from "@/lib/utils";

type SourceLabelProps = {
  title?: string | null;
  url?: string | null;
  size?: number;
  className?: string;
  iconClassName?: string;
  textClassName?: string;
};

export function SourceLabel({
  title,
  url,
  size = 14,
  className,
  iconClassName,
  textClassName,
}: SourceLabelProps) {
  const label = getSourceDisplayName({ title, url });

  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5", className)}>
      <SourceIcon
        className={iconClassName}
        size={size}
        title={title ?? label}
        url={url}
      />
      <span className={cn("truncate", textClassName)}>{label}</span>
    </span>
  );
}
