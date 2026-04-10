import type {
  MemorySource,
  UnifiedMemoryEntry,
} from "./unified-memory-provider.types";

export type BackendResult = {
  source: MemorySource;
  entries: UnifiedMemoryEntry[];
};

export function groupEntriesByType(results: BackendResult[]): {
  shortTerm: UnifiedMemoryEntry[];
  longTerm: UnifiedMemoryEntry[];
  personalization: UnifiedMemoryEntry[];
  sources: MemorySource[];
} {
  const shortTerm: UnifiedMemoryEntry[] = [];
  const longTerm: UnifiedMemoryEntry[] = [];
  const personalization: UnifiedMemoryEntry[] = [];
  const sources: MemorySource[] = [];

  for (const result of results) {
    sources.push(result.source);

    for (const entry of result.entries) {
      if (entry.type === "short_term") {
        shortTerm.push(entry);
      } else if (entry.type === "long_term" || entry.type === "core") {
        longTerm.push(entry);
      } else {
        personalization.push(entry);
      }
    }
  }

  shortTerm.sort((left, right) => (right.score ?? 0) - (left.score ?? 0));
  longTerm.sort((left, right) => (right.score ?? 0) - (left.score ?? 0));
  personalization.sort((left, right) => (right.score ?? 0) - (left.score ?? 0));

  return { shortTerm, longTerm, personalization, sources };
}
