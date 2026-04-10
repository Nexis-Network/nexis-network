import type { Tool } from "ai";
import { jsonSchema } from "ai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";


import { logger } from '@/lib/logger';
/**
 * Unified JSON Schema Validation
 * 
 * Validates and normalizes tool schemas to JSON Schema format for the AI SDK.
 * Supports automatic Zod → JSON Schema conversion with caching.
 */

// ============================================================================
// TYPES
// ============================================================================

export type JSONSchema = {
  type?: string;
  properties?: Record<string, UntypedJson>;
  required?: string[];
  additionalProperties?: boolean;
  description?: string;
  [key: string]: UntypedJson;
};

export type ToolValidationResult = {
  valid: boolean;
  toolId: string;
  errors: string[];
  warnings: string[];
};

export type BatchValidationResult = {
  valid: boolean;
  validTools: string[];
  invalidTools: string[];
  results: ToolValidationResult[];
  summary: string;
};

type SchemaExtractionResult = {
  schema: JSONSchema | UntypedJson;  // Allow unknown for AI SDK wrappers
  source: "ai-sdk" | "zod" | "json" | "fallback";
};

// ============================================================================
// CACHING - Performance optimization for repeated conversions
// ============================================================================

// WeakMap cache for Zod → JSON conversions (auto-GC when schema is dereferenced)
const zodConversionCache = new WeakMap<object, JSONSchema | null>();

// ============================================================================
// UTILITIES
// ============================================================================

export const isPlainRecord = (value: UntypedJson): value is Record<string, UntypedJson> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Detects AI SDK schema wrappers created with `tool()` + `jsonSchema()`.
 * These have a `Symbol(vercel.ai.schema)` property and a `jsonSchema` getter.
 * Tools with these schemas should pass through WITHOUT modification.
 */
const isAiSdkSchemaWrapper = (value: UntypedJson): boolean => {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string | symbol, UntypedJson>;
  // AI SDK schema wrappers have a Symbol(vercel.ai.schema) = true
  // and/or a jsonSchema getter
  const hasJsonSchemaGetter = Object.getOwnPropertyDescriptor(record, "jsonSchema")?.get !== undefined;
  const hasVercelSymbol = Object.getOwnPropertySymbols(record).some(
    (sym) => sym.description?.includes("vercel.ai")
  );
  return hasJsonSchemaGetter || hasVercelSymbol;
};

const isZodSchema = (schema: Record<string, UntypedJson>): boolean => {
  if (!("_def" in schema)) return false;
  const def = schema._def;
  if (!def || typeof def !== "object") return false;
  const typeName = (def as Record<string, UntypedJson>)?.typeName;
  return typeof typeName === "string" && typeName.length > 0;
};

const isJsonSchema = (schema: Record<string, UntypedJson>): boolean =>
  schema.type === "object" ||
  (!!schema.properties && typeof schema.properties === "object" && !("_def" in schema));

const detectSchemaFormat = (schema: Record<string, UntypedJson>): "ai-sdk" | "zod" | "json" | "unknown" => {
  if (isAiSdkSchemaWrapper(schema)) return "ai-sdk";
  if (isZodSchema(schema)) return "zod";
  if (isJsonSchema(schema)) return "json";
  return "unknown";
};

const createFallbackSchema = (toolName?: string): JSONSchema => ({
  type: "object",
  properties: {},
  additionalProperties: true,
  ...(toolName ? { description: `Fallback schema for ${toolName}` } : {}),
});

// ============================================================================
// ZOD CONVERSION (with caching)
// ============================================================================

const ZOD_OPTIONS = {
  $refStrategy: "none" as const,
  target: "openAi" as const,
  errorMessages: true,
};

/**
 * Converts Zod schema to JSON Schema with caching.
 * Returns cached result if available, otherwise converts and caches.
 */
const convertZodToJson = (zodSchema: Record<string, UntypedJson>, toolName: string): JSONSchema | null => {
  // Check cache first
  if (zodConversionCache.has(zodSchema)) {
    return zodConversionCache.get(zodSchema) ?? null;
  }

  try {
    const result = zodToJsonSchema(zodSchema as z.ZodTypeAny, ZOD_OPTIONS);
    const raw = result as Record<string, UntypedJson>;

    // Extract schema from definitions if nested
    let schema: JSONSchema;
    if (raw.definitions && typeof raw.definitions === "object") {
      const defs = raw.definitions as Record<string, UntypedJson>;
      schema = (defs["default"] ?? Object.values(defs)[0] ?? raw) as JSONSchema;
    } else {
      schema = raw as JSONSchema;
    }

    // Normalize for OpenAI
    if (!schema.type) schema.type = "object";
    if (!schema.properties) schema.properties = {};
    delete schema.$schema;

    // Cache and return
    zodConversionCache.set(zodSchema, schema);
    return schema;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    if (process.env.NODE_ENV !== "production") {
      logger.warn(`[schema] Zod→JSON failed for "${toolName}": ${errMsg}`);
    }
    zodConversionCache.set(zodSchema, null);
    return null;
  }
};

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Quick validation check - returns boolean only.
 * Use validateToolDetailed() for error details.
 */
export const validateToolSchema = (
  tool: unknown,
  toolId: string,
  logPrefix = "[tool-validation]"
): tool is Tool => {
  if (!tool || typeof tool !== "object") {
    logger.warn(`${logPrefix} Tool "${toolId}" is not an object`);
    return false;
  }

  const t = tool as Record<string, UntypedJson>;
  const schema = (t.inputSchema ?? t.parameters) as Record<string, UntypedJson> | undefined;

  if (!schema || !isPlainRecord(schema)) {
    logger.warn(`${logPrefix} Tool "${toolId}" has no valid schema`);
    return false;
  }

  const format = detectSchemaFormat(schema);
  if (format === "unknown" && !schema.type && !schema.properties && !("_def" in schema)) {
    logger.warn(`${logPrefix} Tool "${toolId}" has unrecognized schema format`);
    return false;
  }

  return true;
};

/**
 * Detailed validation with error reporting.
 */
export const validateToolDetailed = (
  tool: unknown,
  toolId: string,
  logPrefix = "[tool-validation]"
): ToolValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!tool || typeof tool !== "object") {
    errors.push(`Tool is ${tool === null ? "null" : typeof tool}, expected object`);
    return { valid: false, toolId, errors, warnings };
  }

  const t = tool as Record<string, UntypedJson>;

  if (typeof t.description !== "string") {
    warnings.push("Missing description");
  }

  const schema = (t.inputSchema ?? t.parameters) as Record<string, UntypedJson> | undefined;
  if (!schema) {
    errors.push("Missing schema (inputSchema or parameters)");
    return { valid: false, toolId, errors, warnings };
  }

  if (!isPlainRecord(schema)) {
    errors.push(`Schema is ${typeof schema}, expected object`);
    return { valid: false, toolId, errors, warnings };
  }

  const format = detectSchemaFormat(schema);

  if (format === "zod") {
    if (!convertZodToJson(schema, toolId)) {
      errors.push("Zod schema conversion failed");
    }
  } else if (format === "json") {
    if (schema.type !== "object" && schema.type !== undefined) {
      errors.push(`type must be "object", got "${schema.type}"`);
    }
    if (schema.properties !== undefined && typeof schema.properties !== "object") {
      errors.push("properties must be an object");
    }
    if (schema.$ref) {
      errors.push("$ref is not supported - inline all definitions");
    }
  } else {
    warnings.push("Unrecognized schema format - will use fallback");
  }

  if (typeof t.execute !== "function") {
    warnings.push("Missing execute function");
  }

  const valid = errors.length === 0;
  if (!valid && logPrefix) {
    logger.warn(`${logPrefix} Tool "${toolId}":`, errors.join("; "));
  }

  return { valid, toolId, errors, warnings };
};

/**
 * Validates schema can be serialized. Used by tool-runner.
 */
export const ensureSerializableSchema = (
  schema: unknown,
  toolName: string,
  logPrefix = "[tool-validation]"
): boolean => {
  if (!schema || !isPlainRecord(schema)) {
    logger.warn(`${logPrefix} Tool "${toolName}" has invalid schema`);
    return false;
  }

  const format = detectSchemaFormat(schema);
  if (format === "zod") return convertZodToJson(schema, toolName) !== null;
  if (format === "json") return schema.type === "object" || schema.type === undefined;

  // Unknown format - assume valid if it has some structure
  return !!(schema.type || schema.properties || "_def" in schema);
};

export const extractToolSchema = (tool: Tool): Record<string, UntypedJson> | undefined => {
  const t = tool as Record<string, UntypedJson>;
  return (t.inputSchema ?? t.parameters) as Record<string, UntypedJson> | undefined;
};

// ============================================================================
// SCHEMA EXTRACTION
// ============================================================================

const extractNormalizedSchema = (tool: Tool, toolId: string): SchemaExtractionResult => {
  const t = tool as Record<string, UntypedJson>;
  const candidates = [t.inputSchema, t.parameters];

  for (const value of candidates) {
    if (!value) continue;
    
    // Check if this is an AI SDK schema wrapper FIRST
    // These should pass through without any modification
    if (isAiSdkSchemaWrapper(value)) {
      return { schema: value, source: "ai-sdk" };
    }
    
    if (!isPlainRecord(value)) continue;

    const format = detectSchemaFormat(value);

    if (format === "zod") {
      const converted = convertZodToJson(value, toolId);
      if (converted) return { schema: converted, source: "zod" };
      continue;
    }

    if (format === "json") {
      return {
        schema: {
          type: (value.type as string) ?? "object",
          properties: (value.properties as Record<string, UntypedJson>) ?? {},
          ...(value.required ? { required: value.required as string[] } : {}),
          ...(value.additionalProperties !== undefined ? { additionalProperties: value.additionalProperties as boolean } : {}),
          ...(value.description ? { description: value.description as string } : {}),
        },
        source: "json",
      };
    }
  }

  return { schema: createFallbackSchema(toolId), source: "fallback" };
};

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

export const batchValidateTools = (
  toolset: Record<string, Tool>,
  logPrefix = "[tool-validation]"
): { validToolset: Record<string, Tool>; result: BatchValidationResult } => {
  const results: ToolValidationResult[] = [];
  const validTools: string[] = [];
  const invalidTools: string[] = [];
  const validEntries: Array<[string, Tool]> = [];

  for (const [toolId, tool] of Object.entries(toolset)) {
    const result = validateToolDetailed(tool, toolId, "");
    results.push(result);

    if (result.valid) {
      validTools.push(toolId);
      validEntries.push([toolId, tool]);
    } else {
      invalidTools.push(toolId);
    }
  }

  const valid = invalidTools.length === 0;
  const summary = valid
    ? `All ${validTools.length} tools passed`
    : `${invalidTools.length}/${results.length} failed: ${invalidTools.join(", ")}`;

  if (invalidTools.length > 0) {
    logger.warn(`${logPrefix} ${summary}`);
  }

  return {
    validToolset: Object.fromEntries(validEntries),
    result: { valid, validTools, invalidTools, results, summary },
  };
};

// ============================================================================
// STREAM PRE-VALIDATION (Main Entry Point)
// ============================================================================

export const preValidateToolsForStream = (
  toolset: Record<string, Tool>,
  modelId: string,
  emitEvent?: (type: string, data: UntypedJson) => void
): Record<string, Tool> => {
  if (!toolset || typeof toolset !== "object") {
    emitEvent?.("tool_validation", { valid: false, totalCount: 0, validCount: 0, summary: "Invalid toolset" });
    return {};
  }

  const results: Record<string, Tool> = {};
  let total = 0, fromAiSdk = 0, fromZod = 0, fromJson = 0, fallback = 0;

  for (const [toolId, tool] of Object.entries(toolset)) {
    total++;
    try {
      const { schema, source } = extractNormalizedSchema(tool, toolId);
      
      // AI SDK wrapped tools should pass through WITHOUT modification
      // They're already in the correct format with properly wrapped schemas
      if (source === "ai-sdk") {
        results[toolId] = tool;
        fromAiSdk++;
        continue;
      }
      
      // For non-AI SDK tools, clean up and set inputSchema
      const cleanTool = { ...tool } as Record<string, UntypedJson>;
      delete cleanTool.parameters;  // Remove Zod `parameters` to prevent SDK errors
      // IMPORTANT: wrap JSON Schema so AI SDK doesn't treat it like Zod.
      cleanTool.inputSchema = jsonSchema(
        schema as unknown as Parameters<typeof jsonSchema>[0],
      );
      
      results[toolId] = cleanTool as Tool;

      if (source === "zod") fromZod++;
      else if (source === "json") fromJson++;
      else fallback++;
    } catch (err) {
      fallback++;
      // Also remove parameters from fallback tools
      const cleanTool = { ...tool } as Record<string, UntypedJson>;
      delete cleanTool.parameters;
      cleanTool.inputSchema = jsonSchema(
        createFallbackSchema(toolId) as unknown as Parameters<typeof jsonSchema>[0],
      );
      results[toolId] = cleanTool as Tool;
      
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.warn(`[schema] Tool "${toolId}" schema extraction failed: ${errMsg}`);
    }
  }

  // Enforce model tool limits
  const config = getToolConfigForModel(modelId);
  let finalResults = results;
  if (Object.keys(results).length > config.maxTools) {
    const entries = Object.entries(results).slice(0, config.maxTools);
    finalResults = Object.fromEntries(entries);
  }

  emitEvent?.("tool_validation", {
    valid: fallback === 0,
    totalCount: total,
    validCount: total - fallback,
    stats: { aiSdkNative: fromAiSdk, convertedFromZod: fromZod, alreadyJsonSchema: fromJson, usedFallback: fallback },
    summary: `${total} tools: ${fromAiSdk} AI-SDK, ${fromZod} Zod, ${fromJson} JSON, ${fallback} fallback`,
  });

  logger.debug(`[pipeline] ${total} tools: ${fromAiSdk} AI-SDK, ${fromZod} Zod, ${fromJson} JSON, ${fallback} fallback`);

  return finalResults;
};

// ============================================================================
// MODEL CONFIGURATION
// ============================================================================

export const validateToolOutput = (
  output: unknown,
  toolName: string,
  expectedType?: "object" | "array" | "string" | "number" | "boolean"
): { valid: boolean; sanitized: UntypedJson } => {
  if (output === null || output === undefined) {
    return { valid: false, sanitized: null };
  }

  if (expectedType) {
    const actualType = Array.isArray(output) ? "array" : typeof output;
    if (actualType !== expectedType) {
      if (expectedType === "string") return { valid: false, sanitized: String(output) };
      if (expectedType === "object" && typeof output === "string") {
        try {
          return { valid: true, sanitized: JSON.parse(output) };
        } catch {
          return { valid: false, sanitized: { error: "Invalid JSON", raw: output } };
        }
      }
    }
  }

  try {
    return { valid: true, sanitized: JSON.parse(JSON.stringify(output)) };
  } catch {
    return { valid: false, sanitized: { error: "Not serializable", type: typeof output } };
  }
};

export const supportsStructuredToolOutput = (modelId: string): boolean => {
  const m = modelId.toLowerCase().replace(/^openai\//, "");
  return m.includes("gpt-5") || m.includes("gpt-4o") || m.includes("gpt-4-turbo");
};

export const getToolConfigForModel = (modelId: string): {
  parallelToolCalls: boolean;
  strictSchemas: boolean;
  maxTools: number;
  recommendedBatchSize: number;
} => {
  const m = modelId.toLowerCase().replace(/^openai\//, "");

  if (m.includes("gpt-5")) {
    return { parallelToolCalls: true, strictSchemas: true, maxTools: 128, recommendedBatchSize: 10 };
  }
  if (m.includes("gpt-4")) {
    return { parallelToolCalls: true, strictSchemas: true, maxTools: 64, recommendedBatchSize: 5 };
  }
  return { parallelToolCalls: false, strictSchemas: false, maxTools: 20, recommendedBatchSize: 3 };
};
