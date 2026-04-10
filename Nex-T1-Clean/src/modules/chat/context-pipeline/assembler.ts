/**
 * Cache-Aware Prompt Assembler
 *
 * Assembles a system prompt from resolved context sections, splitting into
 * static (cacheable) and dynamic (per-session/turn) groups with an explicit
 * cache boundary marker.
 */

import {
  SYSTEM_PROMPT_DYNAMIC_BOUNDARY,
  type CacheScope,
  type PromptSection,
  ProvenanceCollector,
} from "@/modules/chat/middleware/context-enhancer";
import type { ContextProvenanceEntry } from "@/modules/chat/middleware/context-enhancer";

import {
  buildUserContextPart,
  buildUserContextProvenance,
} from "./user-context";

// Re-export types from user-context for barrel compatibility
export type { UserContextPayload, ToolSchemaInjectionOptions } from "./user-context";
import type { UserContextPayload, ToolSchemaInjectionOptions } from "./user-context";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A resolved context section ready for assembly. */
export type ResolvedContextSection = {
  id: string;
  content: string;
  scope: CacheScope;
  source: string;
  priority?: number;
};

/** Output of the assembler: structured prompt parts with cache metadata. */
export type AssemblyResult = {
  systemPromptParts: string[];
  staticSection: string;
  dynamicSection: string;
  cacheBreakIndex: number;
  staticSectionIds: string[];
  dynamicSectionIds: string[];
  provenance: readonly ContextProvenanceEntry[];
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_PRIORITY = 100;

// ---------------------------------------------------------------------------
// PromptAssembler
// ---------------------------------------------------------------------------

export class PromptAssembler {
  private sections: ResolvedContextSection[] = [];
  private userContext: UserContextPayload | null = null;
  private toolSchemaOptions: ToolSchemaInjectionOptions | null = null;
  private readonly provenance = new ProvenanceCollector();

  /** Add an array of resolved context sections for assembly. */
  addSections(sections: readonly ResolvedContextSection[]): this {
    for (const section of sections) {
      this.addSection(section);
    }
    return this;
  }

  /** Add a single resolved context section. */
  addSection(section: ResolvedContextSection): this {
    if (!section.content.trim()) return this;
    this.sections.push(section);
    return this;
  }

  /**
   * Inject user context wrapped in <system-reminder> tags.
   * Placed in the dynamic section (after the cache boundary).
   */
  injectUserContext(context: UserContextPayload): this {
    this.userContext = context;
    return this;
  }

  /** Placeholder for future tool definition injection. */
  injectToolSchemas(options: ToolSchemaInjectionOptions): this {
    this.toolSchemaOptions = options;
    return this;
  }

  /** Assemble the final system prompt from all added sections. */
  assemble(): AssemblyResult {
    const sorted = [...this.sections].sort(
      (a, b) => (a.priority ?? DEFAULT_PRIORITY) - (b.priority ?? DEFAULT_PRIORITY),
    );

    const staticSections = sorted.filter((s) => s.scope === "global");
    const dynamicSections = sorted.filter((s) => s.scope !== "global");

    for (const section of [...staticSections, ...dynamicSections]) {
      this.provenance.record({
        source: section.source,
        scope: section.scope,
        sizeChars: section.content.length,
        injectedAt: new Date().toISOString(),
      });
    }

    const parts: string[] = [];
    const staticParts = staticSections.map((s) => s.content);
    parts.push(...staticParts);

    const cacheBreakIndex = parts.length;
    parts.push(SYSTEM_PROMPT_DYNAMIC_BOUNDARY);

    const dynamicParts = dynamicSections.map((s) => s.content);
    parts.push(...dynamicParts);

    // User context injection (always dynamic)
    if (this.userContext) {
      const wrapped = buildUserContextPart(this.userContext);
      if (wrapped) {
        parts.push(wrapped);
        this.provenance.record(buildUserContextProvenance(wrapped));
      }
    }

    // Tool schema placeholder: reserved for Phase 4
    if (this.toolSchemaOptions?.schemas?.length) {
      // Reserved for Phase 4 implementation
    }

    const staticSection = staticParts.join("\n\n");
    const dynamicSection = parts.slice(cacheBreakIndex + 1).join("\n\n");

    return {
      systemPromptParts: parts,
      staticSection,
      dynamicSection,
      cacheBreakIndex,
      staticSectionIds: staticSections.map((s) => s.id),
      dynamicSectionIds: dynamicSections.map((s) => s.id),
      provenance: this.provenance.getEntries(),
    };
  }

  /** Reset the assembler for reuse. */
  reset(): this {
    this.sections = [];
    this.userContext = null;
    this.toolSchemaOptions = null;
    return this;
  }

  /** Get a count of sections by scope for diagnostics. */
  getSectionCounts(): { global: number; session: number; turn: number } {
    let global = 0;
    let session = 0;
    let turn = 0;
    for (const s of this.sections) {
      if (s.scope === "global") global++;
      else if (s.scope === "session") session++;
      else turn++;
    }
    return { global, session, turn };
  }
}
