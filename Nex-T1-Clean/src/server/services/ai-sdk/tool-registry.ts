// Domain: ai-sdk
// Responsibility: Define tool metadata for legacy callers.
// Notes: Extend this registry when adding new tools or vendors. Keep model/tool IDs aligned with prompts.
export type { TelemetryEvent } from "@/server/services/ai-sdk/ai-telemetry";
export { recordAiTelemetry } from "@/server/services/ai-sdk/ai-telemetry";

export type ToolDescriptor = {
  id: string;
  description: string;
  handler: string; // reference name resolved at runtime
  costHint?: "low" | "medium" | "high";
};

export type ModelDescriptor = {
  id: string;
  vendor: "openai" | "anthropic" | "x" | "local";
  supportsToolUse: boolean;
};

/**
 * @deprecated This static registry is outdated. The canonical tool definitions
 * live in `tools.json` (60+ tools) and are loaded via `toolset.ts`.
 * The Moralis MCP tools are in `moralis-mcp-registry.ts` (94 tools).
 * Retained only for backward-compatibility with legacy code paths.
 */
export const toolRegistry: ToolDescriptor[] = [
  { id: "fetch_url", description: "HTTP GET with safety filters", handler: "fetchUrl", costHint: "low" },
  { id: "search_web", description: "Search the public web for fresh facts", handler: "searchWeb", costHint: "medium" },
  { id: "run_sql", description: "Execute safe, read-only SQL queries", handler: "runSql", costHint: "high" },
  { id: "graph_knowledge", description: "Query FalkorDB knowledge graph", handler: "graphKnowledge", costHint: "high" },
];

/**
 * @deprecated Model routing is now handled dynamically by the prompt factory
 * and model selector components. This static list is no longer the source of truth.
 */
export const modelRegistry: ModelDescriptor[] = [
  { id: "gpt-5-mini", vendor: "openai", supportsToolUse: true },
  { id: "gpt-5-nano", vendor: "openai", supportsToolUse: true },
];
