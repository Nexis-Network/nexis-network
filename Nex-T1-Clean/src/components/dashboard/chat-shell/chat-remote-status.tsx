"use client";

import { memo } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { RemoteStatus } from "./hooks/use-chat-controller";

type ChatRemoteStatusProps = {
  status: RemoteStatus;
  message: string | null;
  className?: string;
};

export const ChatRemoteStatus = memo(function ChatRemoteStatus({
  status,
  message,
  className,
}: ChatRemoteStatusProps) {
  if (status !== "companion" || !message) {
    return null;
  }

  return (
    <Alert className={className ?? "w-full max-w-full border-border/50 bg-amber-500/5 text-amber-600 dark:text-amber-200"}>
      <AlertTitle>Companion Mode</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
});
