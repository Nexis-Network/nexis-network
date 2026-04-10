"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { useTaskRunDetail } from "@/hooks/tasks/use-task-run-detail";
import { useTaskRunDecision } from "@/hooks/tasks/use-task-run-decision";

type TaskRunDetailDrawerProps = {
  runId: string | null;
  open: boolean;
  onClose: () => void;
};

export function TaskRunDetailDrawer({ runId, open, onClose }: TaskRunDetailDrawerProps) {
  const { data, isLoading, error, refetch } = useTaskRunDetail(runId);
  const decisionMutation = useTaskRunDecision();
  const { toast } = useToast();

  useEffect(() => {
    if (!open || !runId) return;
    refetch().catch(() => {});
  }, [open, runId, refetch]);

  useEffect(() => {
    if (error) {
      toast({
        variant: "destructive",
        title: "Unable to load run detail",
        description: error.message,
      });
    }
  }, [error, toast]);

  const handleDecision = async (decision: "approve" | "dismiss") => {
    if (!runId) return;
    try {
      await decisionMutation.mutateAsync({ runId, decision });
      toast({
        title: decision === "approve" ? "Approved" : "Dismissed",
        description:
          decision === "approve" ? "Automation marked as complete." : "Automation marked as failed.",
      });
      onClose();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Unable to update run",
        description: err instanceof Error ? err.message : "Unknown error",
      });
    }
  };

  const statusClass = getStatusBadgeClass(data?.status);

  return (
    <Sheet open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
      <SheetContent className="flex w-full flex-col gap-4 p-0 sm:max-w-xl">
        <SheetHeader className="border-b px-6 py-4 text-left">
          <SheetTitle className="text-base font-medium">Task Run</SheetTitle>
          {data ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge className={cn("text-[11px]", statusClass)}>{formatStatus(data.status)}</Badge>
              <span className="text-muted-foreground/70">Trigger: {data.triggerType}</span>
            </div>
          ) : null}
        </SheetHeader>
        <ScrollArea className="flex-1 px-6 py-4">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : data ? (
            <div className="space-y-6 pb-8">
              <section className="space-y-2">
                <p className="text-xs uppercase text-muted-foreground">Automation</p>
                <h3 className="text-lg font-semibold">{data.task.title}</h3>
                {data.task.description ? (
                  <p className="text-sm text-muted-foreground">{data.task.description}</p>
                ) : null}
                {data.task.scheduleSummary ? (
                  <p className="text-xs text-muted-foreground/80">{data.task.scheduleSummary}</p>
                ) : null}
              </section>
              <Separator />
              <section className="space-y-1 text-sm">
                <p className="text-xs uppercase text-muted-foreground">Summary</p>
                <p>{data.summary ?? "No summary available."}</p>
                {data.error ? (
                  <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {String(data.error?.message ?? data.error)}
                  </p>
                ) : null}
              </section>
              <Separator />
              <section className="space-y-2 text-sm">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Started</span>
                  <span>{data.startedAt ? new Date(data.startedAt).toLocaleString() : "–"}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Completed</span>
                  <span>{data.completedAt ? new Date(data.completedAt).toLocaleString() : "–"}</span>
                </div>
              </section>
              <Separator />
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase text-muted-foreground">Output</p>
                  {data.renderHint ? (
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {data.renderHint}
                    </Badge>
                  ) : null}
                </div>
                <pre className="max-h-48 overflow-auto rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                  {data.output ? JSON.stringify(data.output, null, 2) : "// No output recorded"}
                </pre>
              </section>
              <Separator />
              <section className="space-y-3">
                <p className="text-xs uppercase text-muted-foreground">Events</p>
                <div className="space-y-2 rounded-lg border border-border/80 p-3">
                  {data.events.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No events logged.</p>
                  ) : (
                    data.events.map((event) => (
                      <div className="space-y-1" key={event.id}>
                        <div className="flex items-center justify-between text-xs font-medium">
                          <span className="uppercase tracking-wide text-muted-foreground/80">
                            {event.event_type}
                          </span>
                          <span className="text-muted-foreground/70">
                            {new Date(event.created_at).toLocaleString()}
                          </span>
                        </div>
                        <pre className="overflow-auto rounded-md bg-muted/40 p-2 text-[11px] text-muted-foreground">
                          {JSON.stringify(event.payload ?? {}, null, 2)}
                        </pre>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          ) : null}
        </ScrollArea>
        {data?.status === "requires_action" ? (
          <div className="flex gap-3 border-t px-6 py-4">
            <Button
              className="flex-1"
              disabled={decisionMutation.isPending}
              onClick={() => handleDecision("dismiss")}
              variant="secondary"
            >
              Dismiss
            </Button>
            <Button
              className="flex-1"
              disabled={decisionMutation.isPending}
              onClick={() => handleDecision("approve")}
            >
              Approve
            </Button>
          </div>
        ) : (
          <div className="border-t px-6 py-3 text-right">
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function formatStatus(status?: string) {
  if (!status) return "unknown";
  return status.replace("_", " ");
}

function getStatusBadgeClass(status?: string) {
  switch (status) {
    case "completed":
      return "bg-[#8eb94f]/10 text-[#8eb94f]";
    case "requires_action":
      return "bg-amber-500/10 text-amber-500";
    case "failed":
      return "bg-red-500/10 text-red-500";
    case "queued":
    case "in_progress":
      return "bg-sky-500/100/10 text-blue-500";
    default:
      return "bg-muted text-muted-foreground";
  }
}

