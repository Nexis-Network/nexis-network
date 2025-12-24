"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type CvmStateIndicatorProps = {
  appId: string;
  initialStatus: string;
};

function normalizeStatus(status: string) {
  return status.trim().toLowerCase();
}

export function CvmStateIndicator({ appId, initialStatus }: CvmStateIndicatorProps) {
  const [status, setStatus] = useState(initialStatus);
  const [message, setMessage] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const statusRef = useRef(initialStatus);
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryTimeoutRef = useRef<number | null>(null);
  const startStreamRef = useRef<() => void>(() => {});
  const closedRef = useRef(false);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const closeStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (closedRef.current) return;
    if (retryTimeoutRef.current) {
      window.clearTimeout(retryTimeoutRef.current);
    }
    retryTimeoutRef.current = window.setTimeout(() => {
      if (closedRef.current) return;
      startStreamRef.current();
    }, 3000);
  }, []);

  const startStream = useCallback(() => {
    closeStream();
    const currentStatus = normalizeStatus(statusRef.current || "unknown");
    const target = currentStatus === "running" ? "stopped" : "running";
    const url = `/api/cvms/${appId}/state?target=${encodeURIComponent(target)}`;

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;
    eventSource.onopen = () => {
      setMessage(null);
    };

    const handleState = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as { status?: string };
        if (payload.status) {
          setStatus(payload.status);
          setLastUpdated(new Date().toLocaleTimeString());
          setMessage(null);
        }
      } catch {
        // ignore invalid payloads
      }
    };

    const handleComplete = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as { status?: string };
        if (payload.status) {
          setStatus(payload.status);
          setLastUpdated(new Date().toLocaleTimeString());
        }
      } catch {
        // ignore
      }
      closeStream();
      scheduleReconnect();
    };

    const handleTimeout = () => {
      setMessage("State stream timed out. Reconnecting...");
      closeStream();
      scheduleReconnect();
    };

    const handleError = (event: Event) => {
      if (event instanceof MessageEvent && event.data) {
        try {
          const payload = JSON.parse(event.data) as { error?: string };
          if (payload?.error) {
            setMessage(payload.error);
          }
        } catch {
          // ignore
        }
      } else {
        setMessage("Connection lost. Reconnecting...");
      }
      closeStream();
      scheduleReconnect();
    };

    eventSource.addEventListener("state", handleState);
    eventSource.addEventListener("complete", handleComplete);
    eventSource.addEventListener("timeout", handleTimeout);
    eventSource.addEventListener("error", handleError);
  }, [appId, closeStream, scheduleReconnect]);

  useEffect(() => {
    startStreamRef.current = startStream;
  }, [startStream]);

  useEffect(() => {
    startStream();
    return () => {
      closedRef.current = true;
      if (retryTimeoutRef.current) {
        window.clearTimeout(retryTimeoutRef.current);
      }
      closeStream();
    };
  }, [closeStream, startStream]);

  const normalized = normalizeStatus(status || "unknown");
  const statusClass =
    normalized === "running"
      ? "bg-accent-green"
      : normalized === "stopped"
        ? "bg-text-muted"
        : "bg-accent-sky";

  return (
    <span className="inline-flex items-center gap-2">
      <span className={cn("h-2 w-2 rounded-full", statusClass)} />
      <span className="capitalize">{status || "unknown"}</span>
      {lastUpdated && <span className="text-xs text-text-muted">· {lastUpdated}</span>}
      {message && <span className="text-xs text-text-muted">· {message}</span>}
    </span>
  );
}
