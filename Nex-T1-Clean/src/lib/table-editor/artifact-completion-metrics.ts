export interface TableEditorCompletionPayload {
  stage?: string | null;
  csvContent?: string | null;
  versions?: unknown[] | null;
  operations?: unknown[] | null;
}

export interface TableEditorCompletionMetrics {
  stage: string;
  csvLength: number;
  versions: number;
  operations: number;
}

export function getTableEditorCompletionMetrics(
  payload: TableEditorCompletionPayload | null | undefined,
): TableEditorCompletionMetrics {
  return {
    stage: typeof payload?.stage === "string" && payload.stage.length > 0 ? payload.stage : "unknown",
    csvLength: typeof payload?.csvContent === "string" ? payload.csvContent.length : 0,
    versions: Array.isArray(payload?.versions) ? payload.versions.length : 0,
    operations: Array.isArray(payload?.operations) ? payload.operations.length : 0,
  };
}
