"use client";

import { workbenchEmptyStateClass } from "@/components/artifacts/workbench/workbench-ui";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type WorkbenchEmptyStateProps = HTMLAttributes<HTMLDivElement> & {
  eyebrow?: string;
  title: string;
  description: string;
  icon?: ReactNode;
};

export function WorkbenchEmptyState({
  className,
  eyebrow = "Workspace",
  title,
  description,
  icon,
  ...props
}: WorkbenchEmptyStateProps) {
  return (
    <div
      className={cn(
        workbenchEmptyStateClass,
        "min-h-[220px] flex-col px-6 py-8",
        className,
      )}
      {...props}
    >
      {icon ? (
        <div className="mb-4 inline-flex size-11 items-center justify-center rounded-full border border-[var(--artifact-border)] bg-[var(--artifact-control-bg)] text-[var(--artifact-control-muted)]">
          {icon}
        </div>
      ) : null}
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--artifact-muted)]">
        {eyebrow}
      </p>
      <p className="mt-2 text-sm font-medium text-[var(--artifact-foreground)]">
        {title}
      </p>
      <p className="mt-1 max-w-md text-sm text-[var(--artifact-muted)]">
        {description}
      </p>
    </div>
  );
}
