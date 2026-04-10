import type { Tool } from "ai";
import type { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

import { logger } from "@/lib/logger";
import {
  createTool,
  type ToolExecutionContext,
  type ToolJSONSchema,
} from "./create-tool";
import { assertFailClosedToolSchema, TOOL_SCHEMA_INVALID_ERROR } from "./tool-schema-safety";

type AnyToolDefinition<
  TInput = Record<string, unknown>,
  TOutput = unknown,
> = {
  description: string;
  parameters: z.ZodType<TInput>;
  execute: (input: TInput, context?: ToolExecutionContext) => Promise<TOutput> | TOutput;
  name?: string;
};

let anonymousToolCounter = 0;

const schemaConversionCache = new WeakMap<z.ZodTypeAny, ToolJSONSchema>();

function toToolJsonSchema(zodSchema: z.ZodTypeAny, toolName: string): ToolJSONSchema {
  const cached = schemaConversionCache.get(zodSchema);
  if (cached) {
    return cached;
  }

  try {
    const rawSchema = zodToJsonSchema(zodSchema, {
      $refStrategy: "none",
      target: "openAi",
      errorMessages: true,
    }) as Record<string, unknown>;

    const normalized: ToolJSONSchema = {
      type: "object",
      properties:
        rawSchema.type === "object" && rawSchema.properties && typeof rawSchema.properties === "object"
          ? (rawSchema.properties as ToolJSONSchema["properties"])
          : {},
      ...(Array.isArray(rawSchema.required) ? { required: rawSchema.required as string[] } : {}),
      ...(typeof rawSchema.additionalProperties === "boolean"
        ? { additionalProperties: rawSchema.additionalProperties }
        : {}),
    };

    assertFailClosedToolSchema(normalized, toolName);

    schemaConversionCache.set(zodSchema, normalized);
    return normalized;
  } catch (error) {
    logger.warn(`[define-tool] Zod to JSON Schema conversion failed for "${toolName}"`, error);
    throw new Error(`${TOOL_SCHEMA_INVALID_ERROR}: ${toolName}`);
  }
}

export function defineTool<
  TInput = Record<string, unknown>,
  TOutput = unknown,
>(definition: AnyToolDefinition<TInput, TOutput>): Tool<TInput, TOutput> {
  const toolName = definition.name ?? `tool_${++anonymousToolCounter}`;

  return createTool<TInput, TOutput>({
    description: definition.description,
    schema: toToolJsonSchema(definition.parameters, toolName),
    execute: async (input, context) => definition.execute(input, context),
  });
}

export function defineNamedTool<
  TInput = Record<string, unknown>,
  TOutput = unknown,
>(
  name: string,
  definition: Omit<AnyToolDefinition<TInput, TOutput>, "name">,
): Tool<TInput, TOutput> {
  return defineTool({ ...definition, name });
}
