"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getCsrfToken } from "@/lib/csrf";

type CvmActionsProps = {
  appId: string;
  status: string;
  inProgress?: boolean;
};

const actionLabels = {
  start: "Start",
  stop: "Stop",
  restart: "Restart",
  delete: "Terminate",
} as const;

type ActionKey = keyof typeof actionLabels;

function normalizeStatus(status: string) {
  return status.trim().toLowerCase();
}

export function CvmActions({ appId, status, inProgress = false }: CvmActionsProps) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<ActionKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  const normalizedStatus = normalizeStatus(status);
  const isRunning = normalizedStatus === "running";
  const isStopped = normalizedStatus === "stopped";

  const handleAction = async (action: ActionKey) => {
    if (action === "delete") {
      const confirmed = window.confirm("Terminate this CVM? This action cannot be undone.");
      if (!confirmed) return;
    }

    setPendingAction(action);
    setError(null);
    try {
      const token = await getCsrfToken();
      const response = await fetch(`/api/cvms/${appId}/${action}`, {
        method: action === "delete" ? "DELETE" : "POST",
        headers: {
          "X-CSRF-Token": token,
        },
      });

      if (!response.ok) {
        let message = "Unable to perform action.";
        try {
          const payload = (await response.json()) as { error?: string };
          if (payload?.error) message = payload.error;
        } catch {
          // ignore json parse errors
        }
        setError(message);
        return;
      }

      router.refresh();
    } catch {
      setError("Unable to reach the API. Please try again.");
    } finally {
      setPendingAction(null);
    }
  };

  const disableActions = inProgress || pendingAction !== null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => handleAction("start")}
          disabled={disableActions || isRunning}
        >
          {pendingAction === "start" ? "Starting..." : actionLabels.start}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => handleAction("stop")}
          disabled={disableActions || isStopped}
        >
          {pendingAction === "stop" ? "Stopping..." : actionLabels.stop}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => handleAction("restart")}
          disabled={disableActions}
        >
          {pendingAction === "restart" ? "Restarting..." : actionLabels.restart}
        </Button>
        <Button
          type="button"
          variant="danger"
          onClick={() => handleAction("delete")}
          disabled={disableActions}
        >
          {pendingAction === "delete" ? "Terminating..." : actionLabels.delete}
        </Button>
      </div>
      {inProgress && <div className="text-xs text-text-muted">CVM is updating.</div>}
      {error && <div className="text-xs text-red-400">{error}</div>}
    </div>
  );
}
