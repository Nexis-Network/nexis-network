import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Table } from "@/components/ui/table";

type Table02Props = {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  tableHeader: ReactNode;
  tableBody: ReactNode;
  footer?: ReactNode;
  className?: string;
  containerClassName?: string;
};

export function Table02({
  title,
  description,
  action,
  tableHeader,
  tableBody,
  footer,
  className,
  containerClassName,
}: Table02Props) {
  const showHeader = title || description || action;

  return (
    <div className={cn("space-y-6", containerClassName)}>
      {showHeader ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="space-y-2">
            {typeof title === "string" ? (
              <h2 className="text-base font-regular leading-none tracking-tight sm:text-lg">{title}</h2>
            ) : (
              title
            )}
            {description ? (
              typeof description === "string" ? (
                <p className="max-w-xl text-sm text-muted-foreground">{description}</p>
              ) : (
                description
              )
            ) : null}
          </div>
          {action}
        </div>
      ) : null}

      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-border bg-card shadow-sm dark:border-border/40 dark:bg-background/60",
          className,
        )}
      >
        <div className="overflow-x-auto">
          <Table className="min-w-[960px] text-sm">
            {tableHeader}
            {tableBody}
          </Table>
        </div>
      </div>

      {footer ? <div>{footer}</div> : null}
    </div>
  );
}

export default Table02;
