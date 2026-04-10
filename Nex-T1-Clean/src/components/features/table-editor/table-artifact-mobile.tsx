"use client";

import { Table } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { TableEditorData } from "@/lib/table-editor/ai/types";
import { SpreadsheetEditor } from "./sheet-editor";
import { TableArtifactLoading } from "./table-artifact-loading";
import { useTableEditorChat } from "./table-chat-provider";

/**
 * Mobile-optimized table editor component
 * Displays a spreadsheet editor with simplified header and mobile-friendly layout
 * Handles different states: loading, error, awaiting data, and active editing
 */
export function TableArtifactMobile() {
  // Get table data and status from the AI artifact system
  const {
    tableArtifact: { data: rawData, status, progress, isActive, hasData, error },
  } = useTableEditorChat();
  const data = rawData as TableEditorData | undefined;

  // Extract data from the artifact
  const versions = useMemo(() => data?.versions ?? [], [data?.versions]); // All AI-generated versions
  const summary = data?.summary; // Table metadata (rows, columns, etc.)
  const operations = data?.operations ?? []; // List of operations performed
  const currentOperation = data?.currentOperation; // Currently running operation

  // Track which version the user is viewing and their local edits
  const [selectedVersionIndex, setSelectedVersionIndex] = useState(
    versions.length > 0 ? versions.length - 1 : 0 // Start with latest version
  );
  const [localEdits, setLocalEdits] = useState<Record<number, string>>({});

  // Keep track of when versions change to auto-select the latest
  const serializedVersionsRef = useRef<string>("");

  useEffect(() => {
    const serialized = JSON.stringify(versions.map((version) => version.csvContent));
    // If versions have changed, automatically select the latest one
    if (serializedVersionsRef.current !== serialized) {
      serializedVersionsRef.current = serialized;
      const latestIndex = versions.length > 0 ? versions.length - 1 : 0;
      setSelectedVersionIndex(latestIndex);
    }
  }, [versions]);

  // Get the content to display for the currently selected version
  const contentForVersion = useMemo(
    () => getContentForVersion(versions, selectedVersionIndex, localEdits, data?.csvContent),
    [localEdits, selectedVersionIndex, versions, data?.csvContent]
  );

  // Create the save handler for user edits
  const handleSaveContent = createSaveContentHandler(selectedVersionIndex, setLocalEdits);

  // Handle error state - show user-friendly error message
  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-4">
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
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-muted-foreground text-sm">Awaiting dataset...</p>
      </div>
    );
  }

  // Handle loading state - show progress when AI is actively working
  if (isActive && data?.stage !== "complete") {
    return <TableArtifactLoading showDetails={true} showTableSkeleton={true} />;
  }

  // Main UI - Show the mobile-optimized table editor interface
  return (
    <div className="flex h-full flex-col bg-background">
      {/* Mobile Header - Simplified */}
      <div className="border-border border-b bg-muted/30 px-3 py-2">
        <div className="flex items-center justify-between">
          {/* Table title and dimensions - Compact */}
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
              <Table className="h-3 w-3 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-foreground text-sm">{data?.title || "Spreadsheet"}</h3>
              <p className="text-muted-foreground text-xs">
                {summary?.rowCount || 0} × {summary?.columnCount || 0}
              </p>
            </div>
          </div>

          {/* Version selector - Compact */}
          {versions.length > 1 && (
            <select
              className="rounded-md border-0 bg-transparent px-1 py-1 text-muted-foreground text-xs outline-none ring-1 ring-border"
              onChange={(event) => {
                const nextIndex = Number(event.target.value);
                setSelectedVersionIndex(nextIndex);
              }}
              value={selectedVersionIndex}
            >
              {versions.map((version, index) => (
                <option key={version.version} value={index}>
                  v{version.version}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Progress bar - Mobile optimized */}
        {isActive && (
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="truncate text-muted-foreground">{currentOperation?.label || "Processing..."}</span>
              <span className="font-mono text-muted-foreground text-xs">{Math.round((progress || 0) * 100)}%</span>
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

      {/* Main spreadsheet editor - Full height on mobile */}
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

      {/* Mobile Footer - Minimal stats */}
      {(operations.length > 0 || summary) && (
        <div className="border-border border-t bg-muted/20 px-3 py-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <div className="flex items-center gap-3">
              {operations.length > 0 && <span>{operations.length} ops</span>}
              {summary?.columnProfiles && (
                <span>{summary.columnProfiles.filter((p) => (p.filled ?? 0) > 0.8).length} complete</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <div className="h-1 w-1 rounded-full bg-green-500" />
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
