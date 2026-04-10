"use client";

import { SourceLabel } from "@/components/sources/source-label";
import {
  getSourceDescription,
  getSourceTitle,
} from "@/components/sources/source-metadata";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

type SourceCardProps = ComponentProps<"a"> & {
  description?: string | null;
};

export function SourceCard({
  href,
  title,
  description,
  className,
  children,
  ...props
}: SourceCardProps) {
  const resolvedTitle = getSourceTitle({ title, url: href });
  const resolvedDescription = getSourceDescription({
    title,
    url: href,
    snippet: description,
  });

  return (
    <a
      className={cn(
        "group flex flex-col gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3 text-left transition-colors hover:border-white/14 hover:bg-white/[0.05]",
        className,
      )}
      href={href}
      rel="noreferrer"
      target="_blank"
      {...props}
    >
      <SourceLabel
        size={16}
        textClassName="text-[11px] font-medium uppercase tracking-[0.14em] text-[#9F9F9A]"
        title={title}
        url={href}
      />
      <div className="space-y-1">
        <h4 className="line-clamp-2 text-sm font-medium leading-5 text-[#F5F5F2]">
          {resolvedTitle}
        </h4>
        <p className="line-clamp-2 text-sm leading-5 text-[#B9B9B3]">
          {resolvedDescription}
        </p>
      </div>
      {children}
    </a>
  );
}
