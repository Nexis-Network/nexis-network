"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Clock, Loader2, Shield, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import type { ApprovalPayload } from "@/lib/approvals/state-machine";


import { logger } from '@/lib/logger';
type ToolApprovalRow = {
  status: string;
  decision_reason: string | null;
};

interface ApprovalModalProps {
  approvalId: string;
  preview: ApprovalPayload["preview"];
  expiresAt: Date;
  onApprove: () => Promise<void>;
  onReject: (reason?: string) => Promise<void>;
  onExpired?: () => void;
  toolName?: string | null;
  command?: string | null;
}

export function ApprovalModal({
  approvalId,
  preview,
  expiresAt,
  onApprove,
  onReject,
  onExpired,
  toolName,
  command,
}: ApprovalModalProps) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<string | null>(null);

  // Countdown timer
  useEffect(() => {
    const updateTimer = () => {
      const remaining = Math.max(0, expiresAt.getTime() - Date.now());
      setTimeLeft(Math.ceil(remaining / 1000));

      if (remaining === 0 && onExpired) {
        onExpired();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 100);

    return () => clearInterval(interval);
  }, [expiresAt, onExpired]);

  // Subscribe to Supabase Realtime for multi-device support
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`approval:${approvalId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tool_approvals",
          filter: `id=eq.${approvalId}`,
        },
        (payloadData: RealtimePostgresChangesPayload<ToolApprovalRow>) => {
          const newRow = payloadData.new;
          if (!newRow || typeof newRow !== "object" || !("status" in newRow)) {
            return;
          }
          const typedRow = newRow as ToolApprovalRow;
          const newStatus = typedRow.status;
          if (newStatus === "pending") {
            setRealtimeStatus(null);
            return;
          }

          setRealtimeStatus(newStatus);
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [approvalId]);

  const handleApprove = async () => {
    setAction("approve");
    setLoading(true);
    try {
      await onApprove();
    } catch (error) {
      logger.error("Approval error:", error);
      setLoading(false);
      setAction(null);
    }
  };

  const handleReject = async () => {
    setAction("reject");
    setLoading(true);
    try {
      await onReject("User declined the operation");
    } catch (error) {
      logger.error("Rejection error:", error);
      setLoading(false);
      setAction(null);
    }
  };

  const isExpired = timeLeft === 0;
  const isCritical = timeLeft < 10;

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-orange-500" />
            Approval Required
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Review the requested action details below and approve or reject before the countdown expires.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Realtime Status Indicator */}
          {realtimeStatus && realtimeStatus !== "pending" && (
            <div className="rounded-lg border border-sky-500/20 bg-sky-500/10 p-3 dark:border-sky-500/20 dark:bg-sky-500/10">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                {realtimeStatus === "approved" && "✓ Approved on another device"}
                {realtimeStatus === "rejected" && "✗ Rejected on another device"}
                {realtimeStatus === "expired" && "⏱ Request expired"}
              </p>
            </div>
          )}

          {/* Countdown Timer */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 p-3">
            <div className="flex items-center gap-2 text-sm">
              <Clock className={`h-4 w-4 ${isCritical ? "text-red-500" : ""}`} />
              <span>Time remaining</span>
            </div>
            <Badge variant={isCritical ? "destructive" : "secondary"} className="font-mono">
              {timeLeft}s
            </Badge>
          </div>

          {/* Transaction Preview Card */}
          <Card className="border-border bg-surface/content p-4">
            <div className="mb-2 text-xs uppercase text-muted-foreground">
              {toolName ? toolName : "Requested Action"}
              {command ? ` • ${command}` : null}
            </div>
            <h3 className="mb-3 font-regular text-content/primary">{preview.title}</h3>
            <p className="mb-4 text-sm text-content/secondary">{preview.description}</p>

            <div className="space-y-2">
              {preview.items.map((item, i) => (
                <div
                  key={i}
                  className={`flex justify-between text-sm ${
                    item.highlight ? "font-regular text-content/primary" : "text-content/secondary"
                  }`}
                >
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-mono ml-2 break-all text-right">{item.value}</span>
                </div>
              ))}
            </div>

            {/* Estimated Cost */}
            {preview.estimatedCost && (
              <div className="mt-4 border-t border-border pt-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Estimated Cost</span>
                  <span className="font-regular text-content/primary">
                    {preview.estimatedCost.amount} {preview.estimatedCost.currency}
                    {preview.estimatedCost.usd && (
                      <span className="ml-1 text-muted-foreground">(${preview.estimatedCost.usd})</span>
                    )}
                  </span>
                </div>
              </div>
            )}
          </Card>

          {/* Warnings */}
          {preview.warnings && preview.warnings.length > 0 && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-950">
              <div className="space-y-1">
                {preview.warnings.map((warning, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-600 dark:text-orange-400" />
                    <p className="text-sm text-orange-800 dark:text-orange-200">{warning}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={handleReject}
              disabled={loading || isExpired || realtimeStatus !== null}
            >
              {loading && action === "reject" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reject
            </Button>
            <Button
              variant="default"
              className="flex-1 bg-accent/blue hover:bg-accent/20/blue/90"
              onClick={handleApprove}
              disabled={loading || isExpired || realtimeStatus !== null}
            >
              {loading && action === "approve" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Approve Transaction
            </Button>
          </div>

          {/* Expiration Message */}
          {isExpired && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">This approval request has expired.</p>
              <p className="text-xs text-muted-foreground mt-1">The transaction was not executed.</p>
            </div>
          )}

          {/* Security Note */}
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">
              <strong>Security:</strong> Only approve transactions you initiated. Verify all details carefully before approving.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
