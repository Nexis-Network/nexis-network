"use client";

import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export type CanvasProps = ComponentProps<"div"> & {
  title?: string;
  subtitle?: string;
};

export const Canvas = ({ className, title, subtitle, children, ...props }: CanvasProps) => (
  <div
    className={cn(
      "relative overflow-hidden rounded-xl border border-border/60 bg-linear-to-br from-background via-background/70 to-muted/40 p-4 shadow-sm",
      className,
    )}
    {...props}
  >
    {(title || subtitle) && (
      <div className="mb-3 flex flex-col gap-1">
        {title && <h4 className="text-sm font-semibold text-foreground">{title}</h4>}
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    )}
    <div className="relative">{children}</div>
  </div>
);

Canvas.displayName = "Canvas";
