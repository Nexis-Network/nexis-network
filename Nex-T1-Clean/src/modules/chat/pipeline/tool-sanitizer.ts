import type { Tool } from "ai";
import { jsonSchema } from "ai";

/**
 * Ensures tools passed to the AI SDK never include legacy JSON-Schema
 * values under the `parameters` key. AI SDK v5 treats `parameters` as a
 * Zod schema reference and will attempt to read `_def.typeName`, which
 * throws when a plain JSON object is provided. We defensively move any
 * non‑Zod `parameters` to `inputSchema` and delete the legacy key.
 */
export function sanitizeToolsForStream(
  tools: Record<string, Tool>,
  emitEvent?: (type: string, data: unknown) => void,
): Record<string, Tool> {
  const sanitizedEntries = Object.entries(tools).map(([name, tool]) => {
    const record = tool as Record<string, UntypedJson>;
    const params = record.parameters;

    // Detect Zod schemas by the presence of _def.typeName
    const isLikelyZod =
      params &&
      typeof params === "object" &&
      "_def" in (params as Record<string, UntypedJson>) &&
      typeof (params as Record<string, UntypedJson>)._def === "object";

    // Only sanitize plain JSON-schema style parameters (or malformed Zod)
    if (params !== undefined && !isLikelyZod) {
      const cloned: Record<string, UntypedJson> = { ...record };

      // If inputSchema is missing, promote parameters; otherwise drop it
      if (!cloned.inputSchema) {
        cloned.inputSchema = jsonSchema(params);
      }

      delete cloned.parameters;

      emitEvent?.("tool_sanitized", {
        tool: name,
        movedParameters: true,
        hadInputSchema: Boolean(record.inputSchema),
      });

      return [name, cloned as Tool];
    }

    // Final guard: always drop legacy `parameters` to prevent AI SDK from touching `_def`
    if (params !== undefined) {
      const cloned: Record<string, UntypedJson> = { ...record };
      if (!cloned.inputSchema) {
        cloned.inputSchema = jsonSchema({
          type: "object",
          properties: {},
          additionalProperties: true,
        });
      }
      delete cloned.parameters;
      emitEvent?.("tool_sanitized", {
        tool: name,
        reason: "parameters_removed_final_guard",
      });
      return [name, cloned as Tool];
    }

    return [name, tool];
  });

  return Object.fromEntries(sanitizedEntries);
}
