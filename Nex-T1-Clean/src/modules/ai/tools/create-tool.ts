import { jsonSchema, tool, type Tool, type ToolExecutionOptions } from "ai";
import type { JSONSchema7 } from "json-schema";

import type { JsonObject, JsonValue } from "@/types/json";

import { logger } from '@/lib/logger';
import { assertFailClosedToolSchema, TOOL_SCHEMA_INVALID_ERROR } from "./tool-schema-safety";

export type ToolJSONSchema = JSONSchema7 & {
  type: "object";
  properties: Record<string, JSONSchema7>;
  required?: string[];
  additionalProperties?: boolean;
};

export type ToolResult<T extends JsonValue = JsonValue> = T | { error: string; details?: JsonValue };
export type ToolExecuteResult<TOutput = unknown> =
  | TOutput
  | Promise<TOutput>
  | AsyncIterable<JsonValue>;

export interface CreateToolConfig<
  TInput = Record<string, unknown>,
  TOutput = unknown,
> {
  description: string;
  schema: ToolJSONSchema;
  needsApproval?: Tool<TInput, TOutput>["needsApproval"];
  execute: (
    input: TInput,
    context?: ToolExecutionContext,
  ) => ToolExecuteResult<TOutput>;
}

export interface ToolExecutionContext {
  userId?: string;
  abortSignal?: AbortSignal;
  metadata?: Record<string, JsonValue>;
  messages?: ToolExecutionOptions["messages"];
  toolCallId?: string;
}

export function isAsyncIterable<T>(value: unknown): value is AsyncIterable<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    Symbol.asyncIterator in value
  );
}

export async function resolveToolExecutionResult<T>(
  result:
    | PromiseLike<T | AsyncIterable<T>>
    | T
    | AsyncIterable<T>,
): Promise<T> {
  const resolved = await Promise.resolve(result);

  if (isAsyncIterable<T>(resolved)) {
    for await (const chunk of resolved) {
      return chunk;
    }

    throw new Error("Tool returned an empty async iterable");
  }

  return resolved;
}

function isJsonObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeToolExecutionContext(
  options: ToolExecutionOptions | undefined,
): ToolExecutionContext {
  const safeOptions = options ?? ({ messages: [] } as unknown as ToolExecutionOptions);
  const optionRecord = safeOptions as unknown as {
    userId?: unknown;
    metadata?: unknown;
  };
  const baseContext: ToolExecutionContext = {
    messages: safeOptions.messages,
    toolCallId: safeOptions.toolCallId,
    ...(safeOptions.abortSignal ? { abortSignal: safeOptions.abortSignal } : {}),
  };
  const fallbackUserId =
    typeof optionRecord.userId === "string" ? optionRecord.userId : undefined;
  const fallbackMetadata = isJsonObject(optionRecord.metadata)
    ? (optionRecord.metadata as Record<string, JsonValue>)
    : undefined;
  const rawContext = safeOptions.experimental_context;

  if (!isJsonObject(rawContext)) {
    return {
      ...baseContext,
      ...(fallbackUserId ? { userId: fallbackUserId } : {}),
      ...(fallbackMetadata ? { metadata: fallbackMetadata } : {}),
    };
  }

  const userId = typeof rawContext.userId === "string" ? rawContext.userId : undefined;
  const metadata = isJsonObject(rawContext.metadata)
    ? (rawContext.metadata as Record<string, JsonValue>)
    : undefined;

  return {
    ...baseContext,
    ...((userId ?? fallbackUserId) ? { userId: userId ?? fallbackUserId } : {}),
    ...((metadata ?? fallbackMetadata)
      ? { metadata: metadata ?? fallbackMetadata }
      : {}),
  };
}

export function createTool<
  TInput = Record<string, unknown>,
  TOutput = unknown,
>(
  config: CreateToolConfig<TInput, TOutput>
): Tool<TInput, TOutput> {
  if (config.schema.type !== "object") {
    throw new Error(`Tool schema must have type: "object", got "${config.schema.type}"`);
  }

  if (!config.schema.properties || typeof config.schema.properties !== "object") {
    throw new Error("Tool schema must have properties object");
  }

  assertFailClosedToolSchema(config.schema, config.description);

  const definition = {
    description: config.description,
    inputSchema: jsonSchema<TInput>(config.schema),
    outputSchema: jsonSchema<TOutput>({}),
    ...(config.needsApproval !== undefined
      ? { needsApproval: config.needsApproval }
      : {}),
    execute: (input: TInput, options: ToolExecutionOptions) =>
      config.execute(
        input,
        normalizeToolExecutionContext(options),
      ) as ReturnType<NonNullable<Tool<TInput, TOutput>["execute"]>>,
  };

  return tool(definition as unknown as Parameters<typeof tool>[0]) as Tool<
    TInput,
    TOutput
  >;
}

export function createNamedTool<
  TInput = Record<string, unknown>,
  TOutput = unknown,
>(
  name: string,
  config: CreateToolConfig<TInput, TOutput>
): { name: string; tool: Tool<TInput, TOutput> } {
  return {
    name,
    tool: createTool(config),
  };
}
export const stringProp = (
  description: string,
  options?: {
    enum?: string[];
    default?: string;
    minLength?: number;
    maxLength?: number;
  }
): JSONSchema7 => ({
  type: "string",
  description,
  ...options,
});

/**
 * Creates a number property schema.
 */
export const numberProp = (
  description: string,
  options?: {
    minimum?: number;
    maximum?: number;
    default?: number;
  }
): JSONSchema7 => ({
  type: "number",
  description,
  ...options,
});

/**
 * Creates an integer property schema.
 */
export const integerProp = (
  description: string,
  options?: {
    minimum?: number;
    maximum?: number;
    default?: number;
  }
): JSONSchema7 => ({
  type: "integer",
  description,
  ...options,
});

/**
 * Creates a boolean property schema.
 */
export const booleanProp = (
  description: string,
  defaultValue?: boolean
): JSONSchema7 => ({
  type: "boolean",
  description,
  ...(defaultValue !== undefined ? { default: defaultValue } : {}),
});

/**
 * Creates an array property schema.
 */
export const arrayProp = (
  description: string,
  itemSchema: JSONSchema7,
  options?: {
    minItems?: number;
    maxItems?: number;
  }
): JSONSchema7 => ({
  type: "array",
  description,
  items: itemSchema,
  ...options,
});

/**
 * Creates an enum property schema (string union).
 */
export const enumProp = (
  description: string,
  values: readonly string[],
  defaultValue?: string
): JSONSchema7 => ({
  type: "string",
  description,
  enum: [...values],
  ...(defaultValue !== undefined ? { default: defaultValue } : {}),
});

/**
 * Creates an object property schema.
 */
export const objectProp = (
  description: string,
  properties: Record<string, JSONSchema7>,
  required?: string[]
): JSONSchema7 => ({
  type: "object",
  description,
  properties,
  ...(required?.length ? { required } : {}),
});

/**
 * Creates a tool schema from properties.
 */
export function createToolSchema(
  properties: Record<string, JSONSchema7>,
  required?: string[],
  options?: {
    additionalProperties?: boolean;
    description?: string;
  }
): ToolJSONSchema {
  return {
    type: "object",
    properties,
    ...(required?.length ? { required } : {}),
    ...(options?.additionalProperties !== undefined
      ? { additionalProperties: options.additionalProperties }
      : {}),
    ...(options?.description ? { description: options.description } : {}),
  };
}

// ============================================================================
// MIGRATION HELPERS
// ============================================================================

/**
 * Wraps a generator-based execute function into a standard async function.
 * Used for migrating tools from the old pattern.
 *
 * Old pattern: async function* ({ input }) { yield { state: "loading" }; ... }
 * New pattern: async ({ input }) => { return result; }
 *
 * The wrapper collects all yielded values and returns the final "ready" state.
 */
export function wrapGeneratorExecute<TInput, TOutput>(
  generatorFn: (input: TInput) => AsyncGenerator<JsonValue, void, unknown>
): (input: TInput) => Promise<TOutput> {
  return async (input: TInput): Promise<TOutput> => {
    const generator = generatorFn(input);
    let lastValue: JsonValue = null;

    // Consume all yielded values
    for await (const value of generator) {
      lastValue = value;

      // Check for error state
      if (
        typeof value === "object" &&
        value !== null &&
        "state" in value &&
        (value as { state: string }).state === "output-error"
      ) {
        const errorValue = value as { errorText?: string };
        throw new Error(errorValue.errorText ?? "Tool execution failed");
      }
    }

    // Extract result from ready state
    if (
      typeof lastValue === "object" &&
      lastValue !== null &&
      "state" in lastValue &&
      (lastValue as { state: string }).state === "ready"
    ) {
      const readyValue = lastValue as { result?: UntypedJson } & Record<string, UntypedJson>;
      // Return result if present, otherwise return the whole object minus state
      if ("result" in readyValue) {
        return readyValue.result as TOutput;
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { state, ...rest } = readyValue;
      return rest as TOutput;
    }

    return lastValue as TOutput;
  };
}

/**
 * Type-safe conversion from Zod schema to JSON Schema.
 * Use this during migration to convert existing Zod schemas.
 *
 * NOTE: This is a temporary helper for migration. New tools should define
 * JSON Schema directly using createToolSchema() and property helpers.
 */
export async function zodToToolSchema(
  zodSchema: unknown,
  toolName: string
): Promise<ToolJSONSchema> {
  try {
    // Dynamically import zod-to-json-schema to avoid bundling it
    const { zodToJsonSchema } = await import("zod-to-json-schema");

    const raw = zodToJsonSchema(zodSchema as Parameters<typeof zodToJsonSchema>[0], {
      $refStrategy: "none",
      target: "openAi",
    });

    // Extract and normalize schema
    let schema: Record<string, unknown>;
    const rawObj = raw as Record<string, unknown>;

    if (rawObj.definitions && typeof rawObj.definitions === "object") {
      const defs = rawObj.definitions as Record<string, unknown>;
      schema = (defs["default"] ?? Object.values(defs)[0] ?? rawObj) as Record<string, unknown>;
    } else {
      schema = rawObj;
    }

    // Ensure type: "object"
    if (!schema.type) schema.type = "object";
    if (!schema.properties) schema.properties = {};
    delete schema.$schema;

    assertFailClosedToolSchema(schema, toolName);

    return schema as unknown as ToolJSONSchema;
  } catch (error) {
    logger.error(`[create-tool] Failed to convert Zod schema for "${toolName}":`, error);
    if (error instanceof Error) {
      throw error;
    }

    throw new Error(`${TOOL_SCHEMA_INVALID_ERROR}: ${toolName}`);
  }
}
