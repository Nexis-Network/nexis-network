"use client";

import { toast } from "sonner";
import type { NexChatMessage } from "@/types/chat-message";
import { useMessageArtifact } from "@/lib/ai/use-message-artifact";
import { TableEditorArtifact } from "@/lib/table-editor/ai/artifacts/table-editor";
import type { TableEditorData } from "@/lib/table-editor/ai/types";
import { getTableEditorCompletionMetrics } from "@/lib/table-editor/artifact-completion-metrics";


import { logger } from '@/lib/logger';
/**
 * Hook that manages the table editor artifact and provides user feedback
 *
 * This hook:
 * - Connects to the AI table editor system
 * - Shows progress notifications to the user as the AI works
 * - Handles different stages of table processing (loading, profiling, editing, etc.)
 * - Provides detailed feedback about what the AI is doing
 * - Shows success/error messages when processing completes
 *
 * Used by components that need to display table data and show progress
 */
export function useTableEditorArtifact(messages: readonly NexChatMessage[]) {
  const tableData = useMessageArtifact<TableEditorData>(
    messages,
    TableEditorArtifact,
    {
    // Called when the overall status changes (idle → loading → streaming → complete)
    onStatusChange: (newStatus, oldStatus) => {
      logger.debug(`🔄 Status change: ${oldStatus} → ${newStatus}`);

      // Show loading notification when AI starts working
      if (newStatus === "loading" && oldStatus === "idle") {
        toast.loading("Starting table analysis...", {
          id: "table-analysis",
        });
      }
      // Show success notification when AI finishes processing
      else if (newStatus === "complete" && oldStatus === "streaming") {
        const data = tableData?.data as TableEditorData | null;
        const rowCount = data?.summary?.rowCount || 0;
        const columnCount = data?.summary?.columnCount || 0;
        const operationsCount = data?.operations?.length || 0;
        toast.success(
          `Table analysis complete! Processed ${rowCount} rows across ${columnCount} columns with ${operationsCount} enhancements.`,
          { id: "table-analysis" }
        );
      }
      // Show error notification if something goes wrong
      else if (newStatus === "error") {
        toast.error("Table analysis failed", { id: "table-analysis" });
      }
    },

    // Called when the AI moves to different processing stages
    onUpdate: (newData: TableEditorData, oldData: TableEditorData | null) => {
      logger.debug(`📊 Data update: stage=${newData.stage}, progress=${newData.progress}`);

      // Update user about what stage the AI is working on
      if (newData.stage === "profiling" && oldData?.stage === "loading") {
        toast.loading("Profiling data types and structure...", {
          id: "table-analysis",
        });
      }
      // AI is now making enhancements to the data
      else if (newData.stage === "editing" && oldData?.stage === "profiling") {
        toast.loading("Applying AI enhancements...", {
          id: "table-analysis",
        });
      }
      // AI is applying the changes to create the final table
      else if (newData.stage === "applying_changes") {
        toast.loading("Applying changes to spreadsheet...", {
          id: "table-analysis",
        });
      }
    },

    // Called periodically to show progress percentage
    onProgress: (progress: number) => {
      logger.debug(`📈 Progress: ${Math.round(progress * 100)}%`);
    },

    // Called when the AI finishes processing completely
    onComplete: (data: TableEditorData) => {
      logger.debug("✅ Artifact completed:", {
        ...getTableEditorCompletionMetrics(data),
      });
    },

    // Called if there's an error during processing
    onError: (error: string) => {
      logger.error("❌ Artifact error:", error);
      toast.error(`Table analysis failed: ${error}`, {
        id: "table-analysis",
      });
    },
  });

  return {
    ...tableData,
    data: tableData.data as TableEditorData | null,
  };
}
