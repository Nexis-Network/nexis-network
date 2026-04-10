import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils";

export function DocsEnhancementBlock({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      <div className="space-y-2">
        <h2 className="text-[1.05rem] font-semibold tracking-tight text-foreground sm:text-[1.15rem]">
          {title}
        </h2>
        {description ? (
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function DocsFeatureGrid({
  items,
}: {
  items: ReadonlyArray<{ title: string; description: string; label?: string }>;
}) {
  return (
    <div className="grid gap-x-8 gap-y-6 lg:grid-cols-2">
      {items.map((item) => (
        <article key={item.title} className="border-t border-border/60 pt-4">
          {item.label ? <p className="text-xs text-muted-foreground">{item.label}</p> : null}
          <h3 className="mt-2 text-base font-medium text-foreground">{item.title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
        </article>
      ))}
    </div>
  );
}

export function DocsRouteGrid({
  items,
}: {
  items: ReadonlyArray<{
    href: string;
    title: string;
    description: string;
    contextLabel: string;
  }>;
}) {
  return (
    <div className="grid gap-x-8 gap-y-6 lg:grid-cols-2">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="group border-t border-border/60 pt-4 transition-colors hover:border-border"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{item.contextLabel}</p>
              <h3 className="text-base font-medium text-foreground">{item.title}</h3>
            </div>
            <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-foreground" />
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.description}</p>
        </Link>
      ))}
    </div>
  );
}

export function DocsChecklistPanel({
  title,
  description,
  items,
}: {
  title: string;
  description?: string;
  items: ReadonlyArray<string>;
}) {
  return (
    <article className="border-t border-border/60 pt-4">
      <div className="space-y-2">
        <h3 className="text-base font-medium text-foreground">{title}</h3>
        {description ? (
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-sm leading-6 text-foreground/80">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export function DocsWorkflowGrid({
  items,
}: {
  items: ReadonlyArray<{
    href: string;
    surface: string;
    title: string;
    summary: string;
    steps: ReadonlyArray<string>;
  }>;
}) {
  return (
    <div className="grid gap-x-8 gap-y-6 xl:grid-cols-3">
      {items.map((item) => (
        <article key={item.title} className="border-t border-border/60 pt-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{item.surface}</p>
              <h3 className="text-base font-medium text-foreground">{item.title}</h3>
            </div>
            <Link
              href={item.href}
              className="text-xs text-muted-foreground underline decoration-border underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground/50"
            >
              Open
            </Link>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.summary}</p>
          <ol className="mt-4 space-y-3">
            {item.steps.map((step, index) => (
              <li key={step} className="flex gap-3 text-sm leading-6 text-foreground/80">
                <span className="w-5 shrink-0 text-[11px] font-medium tabular-nums text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </article>
      ))}
    </div>
  );
}
