import "server-only";

import type { DeveloperToolCostClass } from "@/server/services/developer-api/types";

const TOOL_COST_REGISTRY: Record<string, DeveloperToolCostClass> = {
  openai_web_search: { kind: "fixed_usd", usdPerCall: 0.0015 },
  openai_file_search: { kind: "fixed_usd", usdPerCall: 0.0008 },
  openai_code_interpreter: { kind: "fixed_usd", usdPerCall: 0.0035 },
  openai_image: { kind: "fixed_usd", usdPerCall: 0.02 },
  emit_artifact: { kind: "free" },
  e2b_code_interpreter: { kind: "metered_runtime", runtimeKind: "e2b" },
  e2b_write_file: { kind: "metered_runtime", runtimeKind: "e2b" },
  e2b_read_file: { kind: "metered_runtime", runtimeKind: "e2b" },
  e2b_list_dir: { kind: "metered_runtime", runtimeKind: "e2b" },
  e2b_npm_install: { kind: "metered_runtime", runtimeKind: "e2b" },
  e2b_npm_run: { kind: "metered_runtime", runtimeKind: "e2b" },
  e2b_get_preview_url: { kind: "metered_runtime", runtimeKind: "e2b" },
};

export function getToolCostClass(
  toolName: string,
): DeveloperToolCostClass | null {
  return TOOL_COST_REGISTRY[toolName] ?? null;
}

export function hasPublicToolCostClass(toolName: string): boolean {
  return getToolCostClass(toolName) !== null;
}
