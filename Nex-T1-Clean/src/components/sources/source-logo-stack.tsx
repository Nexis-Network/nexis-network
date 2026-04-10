"use client";

import { SourceIcon } from "@/components/sources/source-icon";
import { cn } from "@/lib/utils";

type SourcePreview = {
  title?: string | null;
  url?: string | null;
};

type SourceLogoStackProps = {
  sources: SourcePreview[];
  className?: string;
  iconClassName?: string;
  max?: number;
  size?: number;
};

export function SourceLogoStack({
  sources,
  className,
  iconClassName,
  max = 3,
  size = 18,
}: SourceLogoStackProps) {
  const visibleSources: SourcePreview[] = [];
  const seen = new Set<string>();

  for (const source of sources) {
    const key = `${source.url ?? ""}::${source.title ?? ""}`;
    if (!key.trim() || seen.has(key)) {
      continue;
    }

    seen.add(key);
    visibleSources.push(source);

    if (visibleSources.length >= max) {
      break;
    }
  }

  if (visibleSources.length === 0) {
    return null;
  }

  return (
    <span className={cn("inline-flex items-center -space-x-2", className)}>
      {visibleSources.map((source, index) => (
        <span
          key={`${source.url ?? "source"}-${index}`}
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#151515] ring-1 ring-[#232323]"
          style={{ width: `${size + 6}px`, height: `${size + 6}px` }}
        >
          <SourceIcon
            className={iconClassName}
            size={size}
            title={source.title}
            url={source.url}
          />
        </span>
      ))}
    </span>
  );
}
