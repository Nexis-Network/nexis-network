"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { CircleIcon, ClockIcon, CheckCircleIcon, XCircleIcon } from "lucide-react";

export const Sandbox = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "w-full overflow-hidden rounded-lg border bg-background",
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export type SandboxHeaderProps = React.HTMLAttributes<HTMLDivElement> & {
  title?: string;
  state?: "input-streaming" | "input-available" | "approval-requested" | "approval-responded" | "output-available" | "output-error" | "output-denied";
};

export const SandboxHeader = ({
  className,
  title = "Sandbox",
  state,
  ...props
}: SandboxHeaderProps) => {
  const statusConfig = {
    "input-streaming": { icon: CircleIcon, label: "Pending", color: "text-muted-foreground" },
    "input-available": { icon: ClockIcon, label: "Running", color: "text-yellow-500 animate-pulse" },
    "approval-requested": { icon: ClockIcon, label: "Approval Requested", color: "text-yellow-600 animate-pulse" },
    "approval-responded": { icon: CheckCircleIcon, label: "Approved", color: "text-blue-500" },
    "output-available": { icon: CheckCircleIcon, label: "Completed", color: "text-green-500" },
    "output-error": { icon: XCircleIcon, label: "Error", color: "text-destructive" },
    "output-denied": { icon: XCircleIcon, label: "Denied", color: "text-orange-500" },
  };

  const status = state ? statusConfig[state] : null;
  const StatusIcon = status?.icon;

  return (
    <div
      className={cn(
        "flex h-10 items-center justify-between border-b bg-muted/40 px-3",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{title}</span>
      </div>
      {status && StatusIcon && (
        <Badge variant="outline" className="gap-1.5 py-0.5">
          <StatusIcon className={cn("size-3.5", status.color)} />
          <span className="text-xs font-normal">{status.label}</span>
        </Badge>
      )}
    </div>
  );
};

export const SandboxContent = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col", className)} {...props}>
    {children}
  </div>
);

export const SandboxTabs = TabsPrimitive.Root;

export const SandboxTabsBar = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <div className="border-b bg-muted/40 px-3">
    <TabsPrimitive.List
      ref={ref}
      className={cn("flex items-center gap-4", className)}
      {...props}
    />
  </div>
));
SandboxTabsBar.displayName = "SandboxTabsBar";

export const SandboxTabsList = React.Fragment; // Just a pass-through in this implementation if needed, or alias

export const SandboxTabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "relative h-9 border-b-2 border-transparent px-1 pb-2 pt-2 text-sm font-medium text-muted-foreground transition-all hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground",
      className
    )}
    {...props}
  />
));
SandboxTabsTrigger.displayName = "SandboxTabsTrigger";

export const SandboxTabContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn("min-h-[200px] flex-1 outline-none", className)}
    {...props}
  />
));
SandboxTabContent.displayName = "SandboxTabContent";
