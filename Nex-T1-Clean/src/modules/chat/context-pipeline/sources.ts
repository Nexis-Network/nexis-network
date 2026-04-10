/**
 * Context Source Registry
 *
 * Manages an ordered collection of context sources that are resolved
 * into prompt sections during chat pipeline assembly.
 *
 * Create one instance per request to avoid shared mutable state across
 * concurrent requests in a server process.
 */

import { logger } from "@/lib/logger";
import { SYSTEM_PROMPT_DYNAMIC_BOUNDARY } from "@/modules/chat/middleware/context-enhancer";
import type {
  CacheScope,
  ContextPipelineConfig,
  ContextResolveInput,
  ContextSource,
  PromptSection,
  ProvenanceEntry,
  ResolvedContext,
} from "./types";
import { BUILT_IN_SOURCES } from "./built-in-sources";
import { SCOPE_ORDER } from "./source-utils";

// Re-export for backwards compatibility
export { assemblePromptFromSections } from "./source-utils";

export type {
  CacheScope,
  ContextSource,
  ContextResolveInput,
  ContextPipelineConfig,
  PromptSection,
  ProvenanceEntry,
  ResolvedContext,
} from "./types";

// ---------------------------------------------------------------------------
// Default pipeline config
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: ContextPipelineConfig = {
  maxTotalChars: Infinity,
  insertCacheBoundary: true,
  cacheBoundaryMarker: SYSTEM_PROMPT_DYNAMIC_BOUNDARY,
  suppressResolveErrors: true,
};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export class ContextSourceRegistry {
  private readonly sources: ContextSource[] = [];
  private readonly config: ContextPipelineConfig;

  constructor(config?: Partial<ContextPipelineConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    for (const source of BUILT_IN_SOURCES) {
      this.sources.push(source);
    }
  }

  /** Register a custom context source. Replaces an existing source with the same name. */
  registerSource(source: ContextSource): void {
    const existingIdx = this.sources.findIndex((s) => s.name === source.name);
    if (existingIdx >= 0) {
      this.sources[existingIdx] = source;
    } else {
      this.sources.push(source);
    }
  }

  /** Remove a registered source by name. Returns true if found and removed. */
  removeSource(name: string): boolean {
    const idx = this.sources.findIndex((s) => s.name === name);
    if (idx < 0) return false;
    this.sources.splice(idx, 1);
    return true;
  }

  /** Snapshot of registered source metadata in priority-sorted order. */
  listSources(): Array<{ name: string; scope: CacheScope; priority: number }> {
    return this.getSortedSources().map(({ name, scope, priority }) => ({
      name,
      scope,
      priority,
    }));
  }

  /** Number of registered sources. */
  get size(): number {
    return this.sources.length;
  }

  /** Resolve all registered sources in priority order. */
  async resolveAll(ctx: ContextResolveInput): Promise<ResolvedContext> {
    const sorted = this.getSortedSources();
    const sections: PromptSection[] = [];
    const provenance: ProvenanceEntry[] = [];
    let totalChars = 0;

    for (const source of sorted) {
      if (
        this.config.maxTotalChars !== Infinity &&
        totalChars >= this.config.maxTotalChars
      ) {
        logger.debug(
          `[ContextSourceRegistry] Budget exhausted (${totalChars} chars), skipping remaining sources`,
        );
        break;
      }

      let content: string | null = null;
      try {
        content = await source.resolve(ctx);
      } catch (err) {
        if (!this.config.suppressResolveErrors) throw err;
        logger.warn(
          `[ContextSourceRegistry] Source "${source.name}" threw during resolve, skipping`,
          { error: err instanceof Error ? err.message : String(err) },
        );
        continue;
      }

      if (content == null || content.length === 0) continue;

      if (
        this.config.maxTotalChars !== Infinity &&
        totalChars + content.length > this.config.maxTotalChars
      ) {
        logger.debug(
          `[ContextSourceRegistry] Source "${source.name}" exceeds remaining budget, skipping`,
        );
        continue;
      }

      totalChars += content.length;
      sections.push({ source: source.name, content, scope: source.scope, priority: source.priority });
      provenance.push({ source: source.name, scope: source.scope, sizeChars: content.length, resolvedAt: new Date().toISOString() });
    }

    const finalSections = this.config.insertCacheBoundary
      ? this.insertBoundary(sections)
      : sections;

    return { sections: finalSections, provenance };
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  private getSortedSources(): ContextSource[] {
    return [...this.sources].sort((a, b) => {
      const d = a.priority - b.priority;
      if (d !== 0) return d;
      return SCOPE_ORDER[a.scope] - SCOPE_ORDER[b.scope];
    });
  }

  private insertBoundary(sections: PromptSection[]): PromptSection[] {
    if (sections.length === 0) return sections;

    const lastGlobalIdx = sections.reduce(
      (acc, s, i) => (s.scope === "global" ? i : acc),
      -1,
    );

    if (lastGlobalIdx === -1 || lastGlobalIdx === sections.length - 1) {
      return sections;
    }

    const boundary: PromptSection = {
      source: "__cache_boundary__",
      content: this.config.cacheBoundaryMarker,
      scope: "global",
      priority: -1,
    };

    return [
      ...sections.slice(0, lastGlobalIdx + 1),
      boundary,
      ...sections.slice(lastGlobalIdx + 1),
    ];
  }
}
