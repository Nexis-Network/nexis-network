"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getDocumentStatus } from "@/lib/document-processor/actions";
import type { Database } from "@/lib/db/types";


import { logger } from '@/lib/logger';
type Document = Database["public"]["Tables"]["doc_processor_documents"]["Row"];
type ProcessingTask = Database["public"]["Tables"]["doc_processor_processing_tasks"]["Row"];

interface DocumentStatusProps {
  document: Document;
  tasks: ProcessingTask[];
  onUpdate?: (document: Document, tasks: ProcessingTask[]) => void;
  className?: string;
}

export function DocumentStatus({
  document: initialDocument,
  tasks: initialTasks,
  onUpdate,
  className,
}: DocumentStatusProps) {
  const [document, setDocument] = useState(initialDocument);
  const [tasks, setTasks] = useState(initialTasks);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const POLL_INTERVAL = 5000; // 5 seconds

    const pollStatus = async () => {
      try {
        const result = await getDocumentStatus(document.id);

        if (!result.success) {
          throw new Error((result).error);
        }

        // TypeScript now knows result.success is true
        const successResult = result as Extract<typeof result, { success: true }>;
        setDocument(successResult.document);
        setTasks(successResult.tasks);
        onUpdate?.(successResult.document, successResult.tasks);

        // Continue polling if document is still processing
        if (successResult.document && successResult.document.status === "processing") {
          timeoutId = setTimeout(pollStatus, POLL_INTERVAL);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch status");
        logger.error("Error polling status:", err);
      }
    };

    // Only start polling if the document is in processing state
    if (document.status === "processing") {
      timeoutId = setTimeout(pollStatus, POLL_INTERVAL);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [document.id, document.status, onUpdate]);

  const getDocumentProgress = () => {
    if (tasks.length === 0) {
      return 0;
    }
    const completedTasks = tasks.filter((task) => task.status === "processed").length;
    return Math.round((completedTasks / tasks.length) * 100);
  };

  const getLatestTask = () => {
    return tasks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
  };

  const progress = getDocumentProgress();
  const latestTask = getLatestTask();
  const isProcessing = document.status === "processing";
  const isError = document.status === "error" || error;

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <Badge className="font-normal" variant={document.status === "processed" ? "outline" : "secondary"}>
          {document.status}
        </Badge>
        {isProcessing && latestTask && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="capitalize">{latestTask.task_type}...</span>
          </div>
        )}
      </div>

      {isError && (document.error || error) && (
        <div className="flex items-center gap-2 text-destructive text-sm">
          <AlertCircle className="h-3 w-3" />
          <span>{document.error || error}</span>
        </div>
      )}

      {isProcessing && <Progress className="mt-2 h-1" value={progress} />}
    </div>
  );
}
