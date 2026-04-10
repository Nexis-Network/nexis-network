import type { Tool } from "ai";

import { logger } from "@/lib/logger";
import { isPermissiveFallbackToolSchema } from "@/modules/ai/tools/tool-schema-safety";

// Remove any tool whose schema still contains Zod remnants (_def/typeName) or is otherwise unsafe.
export const filterUnsafeTools = (
  tools: Record<string, Tool>,
  emitEvent?: (type: string, data: UntypedJson) => void,
): Record<string, Tool> => {
  const safeEntries: Array<[string, Tool]> = [];

  // Deep check for any Zod-like objects (_def, _type, typeName patterns)
  const hasZodArtifacts = (obj: UntypedJson, depth = 0): boolean => {
    if (depth > 10 || !obj || typeof obj !== "object") return false;

    const record = obj as Record<string, UntypedJson>;

    // Direct Zod indicators
    if ("_def" in record) return true;
    if ("_type" in record && typeof record._type === "string") return true;
    if (
      "typeName" in record &&
      typeof record.typeName === "string" &&
      record.typeName.startsWith("Zod")
    ) {
      return true;
    }

    // Check nested properties (but skip common safe fields)
    for (const [key, value] of Object.entries(record)) {
      if (key === "type" || key === "description" || key === "default") continue;
      if (typeof value === "object" && value !== null) {
        if (hasZodArtifacts(value, depth + 1)) return true;
      }
    }

    return false;
  };

  for (const [name, tool] of Object.entries(tools)) {
    const candidate = tool as Record<string, UntypedJson>;
    const schema = (candidate.inputSchema ?? candidate.parameters) as UntypedJson;

    if (!schema) {
      logger.warn(`[filterUnsafeTools] Dropping tool "${name}": missing schema`);
      emitEvent?.("tool_dropped", { tool: name, reason: "missing_schema" });
      continue;
    }

    // AI SDK-wrapped schemas are already validated by the SDK.
    const isAiSdkSchema = (() => {
      if (!schema || typeof schema !== "object") return false;
      const hasJsonSchemaGetter =
        Object.getOwnPropertyDescriptor(schema, "jsonSchema")?.get !== undefined;
      const hasVercelSymbol = Object.getOwnPropertySymbols(schema as object).some((sym) =>
        sym.description?.includes("vercel.ai"),
      );
      return hasJsonSchemaGetter || hasVercelSymbol;
    })();

    if (isAiSdkSchema) {
      safeEntries.push([name, tool]);
      continue;
    }

    if (hasZodArtifacts(schema)) {
      logger.warn(`[filterUnsafeTools] Dropping tool "${name}": contains Zod artifacts`);
      emitEvent?.("tool_dropped", { tool: name, reason: "zod_artifacts_found" });
      continue;
    }

    if (typeof schema === "object" && !("type" in (schema as Record<string, UntypedJson>))) {
      logger.warn(`[filterUnsafeTools] Dropping tool "${name}": schema missing 'type' property`);
      emitEvent?.("tool_dropped", { tool: name, reason: "invalid_json_schema" });
      continue;
    }

    if (isPermissiveFallbackToolSchema(schema)) {
      logger.warn(`[filterUnsafeTools] Dropping tool "${name}": permissive fallback schema`);
      emitEvent?.("tool_dropped", { tool: name, reason: "permissive_fallback_schema" });
      continue;
    }

    safeEntries.push([name, tool]);
  }

  logger.debug(`[filterUnsafeTools] Kept ${safeEntries.length}/${Object.keys(tools).length} tools`);
  return Object.fromEntries(safeEntries);
};
