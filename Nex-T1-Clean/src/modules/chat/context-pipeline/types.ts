/**
 * Context Pipeline Types
 *
 * Core type definitions for the context source registry and pipeline.
 * Defines the contract between context sources, the registry, and consumers.
 */

// ---------------------------------------------------------------------------
// Cache Scope
// ---------------------------------------------------------------------------

/**
 * Determines how aggressively a context section can be cached.
 *
 * - `global`  — stable across sessions; changes only on deployment or config update.
 * - `session` — stable within a session; may change between sessions (e.g. memory, wallet state).
 * - `turn`    — recomputed every turn; always busts the prompt cache.
 */
export type CacheScope = "global" | "session" | "turn";

// ---------------------------------------------------------------------------
// Context Source
// ---------------------------------------------------------------------------

/**
 * A single, named source of context that can be resolved into a prompt section.
 *
 * Sources are registered with the ContextSourceRegistry and resolved in
 * priority order during prompt assembly.
 */
export interface ContextSource<TCtx = ContextResolveInput> {
  /** Unique, human-readable name (e.g. "system-prompt", "memory"). */
  readonly name: string;

  /** Cache scope — controls where the resolved value sits relative to cache boundaries. */
  readonly scope: CacheScope;

  /**
   * Priority determines resolution and assembly order.
   * Lower numbers resolve first. Sources at the same priority are
   * resolved in registration order.
   */
  readonly priority: number;

  /**
   * Resolve this source into a prompt fragment (or null to skip).
   * Must not throw — return null on failure and log internally.
   */
  resolve(ctx: TCtx): Promise<string | null>;
}

// ---------------------------------------------------------------------------
// Context Resolve Input
// ---------------------------------------------------------------------------

/**
 * Minimal input passed to each source's `resolve()` call.
 * Intentionally thin — sources that need richer data should import
 * their own services rather than inflating this bag.
 */
export interface ContextResolveInput {
  /** Authenticated user ID, if available. */
  userId: string | null;

  /** Current session ID, if available. */
  sessionId: string | null;

  /** Access token for upstream service calls, if available. */
  accessToken: string | null;

  /** The latest user message text (for relevance-aware sources). */
  latestUserMessage: string;

  /** Project root path (e.g. for memory file resolution). */
  projectRoot: string | null;

  /** Agent ID if this conversation targets a specific agent. */
  agentId: string | null;

  /** Enabled MCP server names for the current session. */
  enabledMcpServers: string[];
}

// ---------------------------------------------------------------------------
// Provenance
// ---------------------------------------------------------------------------

/**
 * Tracks where a resolved context section came from.
 * Used for debugging, cost attribution, and cache-hit analysis.
 */
export interface ProvenanceEntry {
  /** Source name that produced this section. */
  source: string;

  /** Cache scope of the source. */
  scope: CacheScope;

  /** Size of the resolved content in characters. */
  sizeChars: number;

  /** ISO timestamp when the section was resolved. */
  resolvedAt: string;
}

// ---------------------------------------------------------------------------
// Prompt Section
// ---------------------------------------------------------------------------

/**
 * A resolved prompt section ready for assembly into the final system prompt.
 */
export interface PromptSection {
  /** Source name that produced this section. */
  source: string;

  /** The resolved content string. */
  content: string;

  /** Cache scope — used to place the section relative to cache boundaries. */
  scope: CacheScope;

  /** Priority the section was registered at. */
  priority: number;
}

// ---------------------------------------------------------------------------
// Resolved Context
// ---------------------------------------------------------------------------

/**
 * The complete output of resolving all context sources.
 * Contains ordered prompt sections and full provenance metadata.
 */
export interface ResolvedContext {
  /** Prompt sections in priority order, ready for concatenation. */
  sections: PromptSection[];

  /** Provenance entries for every resolved (non-null) source. */
  provenance: ProvenanceEntry[];
}

// ---------------------------------------------------------------------------
// Pipeline Config
// ---------------------------------------------------------------------------

/**
 * Configuration for the context pipeline.
 */
export interface ContextPipelineConfig {
  /**
   * Maximum total characters across all resolved sections.
   * Sources resolved after the budget is exhausted are skipped.
   * Set to 0 or Infinity to disable.
   */
  maxTotalChars: number;

  /**
   * If true, insert a dynamic boundary marker between global-scope
   * and session/turn-scope sections for provider-level prompt caching.
   */
  insertCacheBoundary: boolean;

  /**
   * The literal string used as the cache boundary marker.
   * Defaults to the SYSTEM_PROMPT_DYNAMIC_BOUNDARY from context-enhancer.
   */
  cacheBoundaryMarker: string;

  /**
   * If true, sources that throw during resolve() are silently skipped.
   * If false, the pipeline re-throws on the first source failure.
   */
  suppressResolveErrors: boolean;
}
