"use client";

import { cn } from "@/lib/utils";
import {
  ActivityIcon,
  CheckCircle2,
  Loader2,
  WifiOff,
  Wifi as WifiOn,
} from "lucide-react";
import type { ComponentProps } from "react";

export type ConnectionStatus = "connected" | "streaming" | "complete" | "error";

export type ConnectionProps = ComponentProps<"div"> & {
  status: ConnectionStatus;
  latencyMs?: number | null;
  label?: string;
};

const STATUS_META: Record<
  ConnectionStatus,
  { icon: React.ReactNode; badge: string; tone: string }
> = {
  connected: {
    icon: <WifiOn className="size-4" />,
    badge: "Connected",
    tone: "bg-[#8eb94f]/15 text-[#8eb94f]",
  },
  streaming: {
    icon: <Loader2 className="size-4 animate-spin" />,
    badge: "Streaming",
    tone: "bg-primary/20 text-primary",
  },
  complete: {
    icon: <CheckCircle2 className="size-4" />,
    badge: "Complete",
    tone: "bg-[#8eb94f]/15 text-[#8eb94f]",
  },
  error: {
    icon: <WifiOff className="size-4" />,
    badge: "Disconnected",
    tone: "bg-destructive/15 text-destructive",
  },
};

export const Connection = ({
  className,
  status,
  latencyMs,
  label = "Live connection",
  ...props
}: ConnectionProps) => {
  const meta = STATUS_META[status];

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-xs text-muted-foreground",
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-2">
        <span className={cn("flex items-center gap-1 rounded-full px-2 py-1", meta.tone)}>
          {meta.icon}
          {meta.badge}
        </span>
        <span className="font-medium text-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-2 text-muted-foreground">
        <ActivityIcon className="size-4" />
        <span>{latencyMs != null ? `${latencyMs.toFixed(0)} ms` : "—"}</span>
      </div>
    </div>
  );
};

Connection.displayName = "Connection";
