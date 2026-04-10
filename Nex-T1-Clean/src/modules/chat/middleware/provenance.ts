/**
 * Context Enhancer — Provenance Tracking
 *
 * Per-request provenance collector for tracking the source and scope
 * of each piece of context injected into the prompt pipeline.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CacheScope = "global" | "session" | "turn";

export type ContextProvenanceEntry = {
  source: string;
  scope: CacheScope;
  sizeChars: number;
  injectedAt: string;
};

// ---------------------------------------------------------------------------
// Collector
// ---------------------------------------------------------------------------

/**
 * Per-request provenance collector.
 *
 * IMPORTANT: This replaces the previous module-level mutable array which was
 * shared across all concurrent requests in a server process, causing both
 * memory leaks and cross-request data contamination.
 *
 * Each call to enhanceContext() creates its own collector instance.
 */
export class ProvenanceCollector {
  private readonly entries: ContextProvenanceEntry[] = [];

  record(entry: ContextProvenanceEntry): void {
    this.entries.push(entry);
  }

  getEntries(): readonly ContextProvenanceEntry[] {
    return [...this.entries];
  }
}
