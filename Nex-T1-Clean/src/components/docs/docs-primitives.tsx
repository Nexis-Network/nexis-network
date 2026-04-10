import type { ReactNode } from "react";

import { DocsSurface } from "@/components/docs/docs-surface";
import { cn } from "@/lib/utils";

export function DocsSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-border/60 pt-6 md:scroll-mt-24">
      <div className="space-y-4">
        <h2 className="text-[1.12rem] font-semibold tracking-tight text-foreground sm:text-[1.22rem] md:text-[1.3rem]">
          {title}
        </h2>
        <div className="space-y-4 text-sm leading-7 text-muted-foreground">
          {children}
        </div>
      </div>
    </section>
  );
}

export function DocsList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-3 pl-5 marker:text-muted-foreground">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function DocsMetricList({
  items,
}: {
  items: Array<{ title: string; body: string }>;
}) {
  return (
    <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.title} className="border-t border-border/60 pt-4">
          <h3 className="text-sm font-medium text-foreground">{item.title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
        </div>
      ))}
    </div>
  );
}

export function DocsCallout({
  tone = "neutral",
  title,
  children,
}: {
  tone?: "neutral" | "caution";
  title: string;
  children: ReactNode;
}) {
  return (
    <aside
      className={cn(
        "rounded-lg px-4 py-4 text-sm leading-6",
        tone === "neutral" && "border border-border/60 bg-card text-muted-foreground",
        tone === "caution" &&
          "border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200",
      )}
    >
      <p className="mb-2 font-medium text-inherit">{title}</p>
      <div className="space-y-3">{children}</div>
    </aside>
  );
}

export function DocsTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: ReactNode[][];
}) {
  return (
    <>
      <div className="space-y-3 md:hidden">
        {rows.map((row, index) => (
          <dl
            key={`${row[0]}-${index}`}
            className="border-t border-border/60 pt-4 first:border-t-0 first:pt-0"
          >
            {columns.map((column, cellIndex) => (
              <div
                key={`${column}-${index}`}
                className={cn(
                  "space-y-1.5",
                  cellIndex > 0 && "mt-4 border-t border-border/60 pt-4",
                )}
              >
                <dt className="text-xs font-medium text-muted-foreground">
                  {column}
                </dt>
                <dd className="text-sm leading-6 text-foreground/80">
                  {row[cellIndex]}
                </dd>
              </div>
            ))}
          </dl>
        ))}
      </div>
      <div className="hidden overflow-x-auto rounded-lg border border-border/60 md:block">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead>
            <tr className="text-muted-foreground">
              {columns.map((column) => (
                <th key={column} className="px-4 py-3 font-medium">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row[0]}-${index}`} className="border-t border-border/60 align-top">
                {row.map((cell, cellIndex) => (
                  <td key={`${columns[cellIndex]}-${index}`} className="px-4 py-3 text-foreground/80">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function DocsPromptCard({
  title,
  prompt,
  explanation,
  result,
  bestFor,
  watchFor,
  className,
}: {
  title: string;
  prompt: string;
  explanation: string;
  result: string;
  bestFor?: string;
  watchFor?: string;
  className?: string;
}) {
  return (
    <DocsSurface
      className={cn("h-full bg-card", className)}
      contentClassName="px-4 py-4 sm:px-5"
    >
      <p className="text-sm font-medium text-foreground">{title}</p>
      <pre className="mt-3 overflow-x-auto break-words whitespace-pre-wrap font-[inherit] text-[13px] leading-6 text-foreground/80 sm:text-sm">
        {prompt}
      </pre>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{explanation}</p>
      {bestFor ? (
        <p className="mt-3 text-sm leading-6 text-foreground/80">
          <span className="font-medium text-foreground">Best for:</span> {bestFor}
        </p>
      ) : null}
      {watchFor ? (
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          <span className="font-medium text-foreground">Watch for:</span> {watchFor}
        </p>
      ) : null}
      <p className="mt-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Expected result:</span> {result}
      </p>
    </DocsSurface>
  );
}
