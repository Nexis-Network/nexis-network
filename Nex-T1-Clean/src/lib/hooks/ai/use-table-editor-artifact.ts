"use client";

import { toast } from "sonner";
import { useArtifactRegistryArtifact } from "@/lib/ai/artifact-runtime";
import { TableEditorArtifact } from "@/modules/ai/artifacts/table-editor";
import { logger } from "@/lib/logger";
import { getTableEditorCompletionMetrics } from "@/lib/table-editor/artifact-completion-metrics";
/**
 * Hook that manages the table editor artifact and provides user feedback
 *
 * This hook:
 * - Connects to the AI table editor system
 * - Shows progress notifications to the user as the AI works
 * - Handles different stages of table processing (loading, hydrating, transforming, etc.)
 * - Provides detailed feedback about what the AI is doing
 * - Shows success/error messages when processing completes
 *
 * Used by components that need to display table data and show progress
 */
export function useTableEditorArtifact() {
  const tableData = useArtifactRegistryArtifact(TableEditorArtifact, {
      // Called when the overall status changes (idle → loading → streaming → complete)
      onStatusChange: (newStatus, oldStatus) => {
        logger.debug(`🔄 Status change: ${oldStatus} → ${newStatus}`);

        if (newStatus === "loading" && oldStatus === "idle") {
          toast.loading("Starting table analysis...", {
            id: "table-analysis",
          });
        } else if (newStatus === "complete" && oldStatus === "streaming") {
          const summary = tableData.data?.summary;
          const rowCount = summary?.rowCount ?? 0;
          const columnCount = summary?.columnCount ?? 0;
          const operationsCount = tableData.data?.operations?.length ?? 0;
          toast.success(
            `Table analysis complete! Processed ${rowCount} rows across ${columnCount} columns with ${operationsCount} enhancements.`,
            { id: "table-analysis" },
          );
        } else if (newStatus === "error") {
          toast.error("Table analysis failed", { id: "table-analysis" });
        }
      },

      // Called when the AI moves to different processing stages
      onUpdate: (newData, oldData) => {
        if (!newData) return;

        logger.debug(
          `📊 Data update: stage=${newData.stage}, progress=${newData.progress}`,
        );

        if (newData.stage === "hydrating" && oldData?.stage === "loading") {
          toast.loading("Profiling data types and structure...", {
            id: "table-analysis",
          });
        } else if (
          newData.stage === "transforming" &&
          oldData?.stage === "hydrating"
        ) {
          toast.loading("Applying AI enhancements...", {
            id: "table-analysis",
          });
        } else if (
          newData.stage === "complete" &&
          oldData?.stage === "transforming"
        ) {
          toast.loading("Applying changes to spreadsheet...", {
            id: "table-analysis",
          });
        }
      },

      onProgress: (progress: number) => {
        logger.debug(`📈 Progress: ${Math.round(progress * 100)}%`);
      },

      onComplete: (data) => {
        logger.debug("✅ Artifact completed:", {
          ...getTableEditorCompletionMetrics(data),
        });
      },

      onError: (error) => {
        logger.error("❌ Artifact error:", error);
        toast.error(`Table analysis failed: ${String(error)}`, {
          id: "table-analysis",
        });
      },
    });

  return tableData;
}
