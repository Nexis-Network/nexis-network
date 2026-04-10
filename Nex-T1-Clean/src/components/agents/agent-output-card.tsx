"use client";

import { type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { AIAgent } from "@/lib/schema";

export type AgentOutputCardProps = {
  agent?: AIAgent | null;
  title?: string;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
};

/**
 * AgentOutputCard renders content inside the standardized agent card layout.
 * If `children` are provided, the card will render custom content while
 * optionally using agent metadata for the header.
 */
export function AgentOutputCard({
  agent,
  title,
  subtitle,
  children,
  className,
}: AgentOutputCardProps) {
  const features = Array.isArray(agent?.features) ? agent?.features ?? [] : [];

  const headerTitle = title ?? agent?.name ?? "Nex Copilot";
  const headerSubtitle = subtitle ?? agent?.tagline ?? undefined;

  const shouldRenderAgentDetails = !children && agent;

  const defaultContent = shouldRenderAgentDetails ? (
    <div className="space-y-2 text-sm">
      {agent?.description && (
        <div>
          <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground/70">
            Description
          </p>
          <p className="text-muted-foreground text-sm leading-relaxed">{agent.description}</p>
        </div>
      )}
      {agent?.useCase && (
        <div>
          <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground/70">
            Use Case
          </p>
          <p className="text-muted-foreground text-sm leading-relaxed">{agent.useCase}</p>
        </div>
      )}
      {agent?.uniqueValue && (
        <div>
          <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground/70">
            Unique Value
          </p>
          <p className="text-muted-foreground text-sm leading-relaxed">{agent.uniqueValue}</p>
        </div>
      )}
      {features.length > 0 && (
        <div className="space-y-1">
          <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground/70">
            Key Features
          </p>
          <div className="flex flex-wrap gap-2">
            {features.map((feature) => (
              <Badge
                key={feature}
                variant="secondary"
                className="rounded-full bg-primary/10 px-3 py-1 text-primary text-xs"
              >
                {feature}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  ) : null;

  const customContent = children ? (
    <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
      {children}
    </div>
  ) : null;

  return (
    <div
      className={cn(
        "mt-3 space-y-2 rounded-xl border border-border/40 bg-background/60 p-3",
        className,
      )}
    >
      {(headerTitle || headerSubtitle) && (
        <div>
          {headerTitle && <p className="font-regular text-sm text-foreground">{headerTitle}</p>}
          {headerSubtitle && <p className="text-muted-foreground text-xs">{headerSubtitle}</p>}
        </div>
      )}
      {customContent ?? defaultContent}
    </div>
  );
}
