"use client";

import { Table } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useTableEditorArtifact } from "@/hooks/ai";
import { SpreadsheetEditor } from "@/components/settings/sheet-editor";
import { TableArtifactLoading } from "./table-artifact-loading";

/**
 * Main table editor panel component
 * Displays a spreadsheet editor with version control and real-time AI updates
 * Handles different states: loading, error, awaiting data, and active editing
 */
export function TableArtifact() {
  // Get table data and status from the AI artifact system
  const {
    data: artifactData,
    status,
    progress,
    isActive,
    hasData,
    error,
  } = useTableEditorArtifact();

  // Extract data from the artifact
  const versions = useMemo(() => artifactData?.versions ?? [], [artifactData?.versions]); // All AI-generated versions
  const summary = artifactData?.summary; // Table metadata (rows, columns, etc.)
  const operations = artifactData?.operations ?? []; // List of operations performed
  const currentOperation = artifactData?.currentOperation; // Currently running operation

  // Track which version the user is viewing and their local edits
  const [selectedVersionIndex, setSelectedVersionIndex] = useState(
    versions.length > 0 ? versions.length - 1 : 0 // Start with latest version
  );
  const [localEdits, setLocalEdits] = useState<Record<number, string>>({});

  const versionSignature = useMemo(
    () =>
      versions
        .map((version: { createdAt: string; version: number }) =>
          `${version.version}:${version.createdAt}`,
        )
        .join("|"),
    [versions],
  );
  const previousVersionCountRef = useRef(versions.length);

  useEffect(() => {
    const previousVersionCount = previousVersionCountRef.current;
    const latestIndex = versions.length > 0 ? versions.length - 1 : 0;

    setSelectedVersionIndex((current) => {
      if (versions.length === 0) {
        return 0;
      }

      const isOutOfBounds = current > latestIndex;
      const wasViewingLatest = current >= previousVersionCount - 1;

      if (isOutOfBounds || (versions.length > previousVersionCount && wasViewingLatest)) {
        return latestIndex;
      }

      return current;
    });

    previousVersionCountRef.current = versions.length;
  }, [versionSignature, versions.length]);

  // Get the content to display for the currently selected version
  const contentForVersion = useMemo(
    () => getContentForVersion(versions, selectedVersionIndex, localEdits, artifactData?.csvContent),
    [localEdits, selectedVersionIndex, versions, artifactData?.csvContent]
  );

  // Create the save handler for user edits
  const handleSaveContent = createSaveContentHandler(selectedVersionIndex, setLocalEdits);

  // Handle error state - show user-friendly error message
  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="font-medium text-red-500 text-sm">Error loading table</p>
          <p className="mt-1 text-muted-foreground text-xs">{error}</p>
        </div>
      </div>
    );
  }

  // Handle waiting state - when no data exists and nothing is loading
  const shouldShowAwaiting = !(hasData || isActive);

  if (shouldShowAwaiting) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground text-sm">Awaiting dataset...</p>
      </div>
    );
  }

  // Handle loading state - show progress when AI is actively working
  if (isActive && artifactData?.stage !== "complete") {
    return <TableArtifactLoading showDetails={true} showTableSkeleton={true} />;
  }

  // Main UI - Show the full table editor interface
  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header with table info and controls */}
      <div className="border-border border-b bg-muted/30 px-4 py-3 transition-all duration-200">
        <div className="flex items-center justify-between">
          {/* Table title and dimensions */}
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 transition-colors duration-200 hover:bg-primary/20">
              <Table className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-foreground text-sm transition-colors duration-200">
                {artifactData?.title || artifactData?.metadata?.title || "Spreadsheet Editor"}
              </h3>
              <p className="text-muted-foreground text-xs">
                {summary?.rowCount || 0} rows × {summary?.columnCount || 0} columns
              </p>
            </div>
          </div>

          {/* Version selector and close button */}
          <div className="flex items-center gap-2">
            {/* Show version dropdown if multiple versions exist */}
            {versions.length > 1 && (
              <select
                className="rounded-md border-0 bg-transparent px-2 py-1 text-muted-foreground text-xs outline-none ring-1 ring-border transition-all duration-200 hover:ring-ring focus:ring-2"
                onChange={(event) => {
                  const nextIndex = Number(event.target.value);
                  setSelectedVersionIndex(nextIndex);
                }}
                value={selectedVersionIndex}
              >
                {versions.map((version: { version: number; csvContent: string }, index: number) => (
                  <option key={version.version} value={index}>
                    v{version.version}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Progress bar - only shown when AI is actively working */}
        {isActive && (
          <div className="slide-in-from-top-2 mt-3 animate-in space-y-2 duration-300">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{currentOperation?.label || "Processing..."}</span>
              <span className="font-mono text-muted-foreground">{Math.round((progress || 0) * 100)}%</span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${(progress || 0) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Main spreadsheet editor - takes up most of the space */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full">
            <SpreadsheetEditor
              content={contentForVersion}
              currentVersionIndex={selectedVersionIndex}
              isCurrentVersion={selectedVersionIndex === versions.length - 1 || versions.length === 0}
              saveContent={handleSaveContent}
              status={status}
            />
        </div>
      </div>

      {/* Footer with table statistics - only shown when we have data */}
      {(operations.length > 0 || summary) && (
        <div className="border-border border-t bg-muted/20 px-4 py-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <div className="flex items-center gap-4">
              {/* Show number of operations performed */}
              {operations.length > 0 && <span>{operations.length} operations</span>}
              {/* Show number of complete columns */}
              {summary?.columnProfiles && (
                <span>{summary.columnProfiles.filter((p: { filled?: number }) => (p.filled ?? 0) > 0.8).length} complete columns</span>
              )}
            </div>
            {/* Status indicator */}
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
              <span>Ready</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Gets the table content for a specific version
 * Checks if user has made local edits first, then falls back to the AI-generated version
 */
function getContentForVersion(
  versions: Array<{ csvContent: string }>,
  selectedVersionIndex: number,
  localEdits: Record<number, string>,
  fallbackContent?: string
): string {
  // Return empty string if no data exists
  if (!(versions.length || fallbackContent)) {
    return "";
  }
  // Check if user has made local changes to this version
  const localOverride = localEdits[selectedVersionIndex];
  if (localOverride !== undefined) {
    return localOverride;
  }
  // Return the AI-generated content for this version
  return versions[selectedVersionIndex]?.csvContent ?? fallbackContent ?? "";
}

/**
 * Creates a function to save user edits to a specific version
 * This allows users to make changes without affecting the original AI-generated content
 */
function createSaveContentHandler(
  selectedVersionIndex: number,
  setLocalEdits: React.Dispatch<React.SetStateAction<Record<number, string>>>
) {
  return (content: string, _isCurrentVersion: boolean) => {
    setLocalEdits((prev) => ({
      ...prev,
      [selectedVersionIndex]: content,
    }));
  };
}
