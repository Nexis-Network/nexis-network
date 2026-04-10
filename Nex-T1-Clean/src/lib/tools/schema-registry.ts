/**
 * Schema Registry - Single Source of Truth for Tool Schemas
 *
 * Domain: AI Tools
 * Responsibility: Converts Zod schemas to JSON Schema ONCE at registration time,
 *                 caches converted schemas, and provides validation utilities.
 * Depends on: zod, zod-to-json-schema
 * Notes: This fixes the "Invalid schema for function: type 'None'" error by ensuring
 *        all tool schemas are properly converted to JSON Schema format before
 *        being sent to OpenAI's API.
 */

import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";


import { logger } from '@/lib/logger';
// ============================================================================
// TYPES
// ============================================================================

export type JSONSchemaType = {
  type: string;
  properties?: Record<string, UntypedJson>;
  required?: string[];
  additionalProperties?: boolean;
  description?: string;
  [key: string]: UntypedJson;
};

export type RegisteredSchema = {
  zodSchema: z.ZodTypeAny;
  jsonSchema: JSONSchemaType;
  registeredAt: number;
  toolName: string;
};

export type SchemaConversionResult = {
  success: boolean;
  jsonSchema?: JSONSchemaType;
  error?: string;
};

// ============================================================================
// SCHEMA CACHE
// ============================================================================

const schemaCache = new Map<string, RegisteredSchema>();

// ============================================================================
// CONVERSION OPTIONS
// ============================================================================

/**
 * Options for zod-to-json-schema conversion optimized for OpenAI
 * - $refStrategy: "none" prevents $ref usage which OpenAI doesn't support well
 * - target: "openAI" uses OpenAI-compatible schema format
 */
const CONVERSION_OPTIONS = {
  $refStrategy: "none" as const,
  target: "openAi" as const,
  errorMessages: true,
};

// ============================================================================
// CORE CONVERSION FUNCTIONS
// ============================================================================

/**
 * Converts a Zod schema to JSON Schema format compatible with OpenAI.
 * This is the core function that fixes the "type: None" error.
 *
 * @param zodSchema - The Zod schema to convert
 * @param toolName - Name of the tool (for error logging)
 * @returns Conversion result with either the JSON schema or an error
 */
export function convertZodToJsonSchema(
  zodSchema: z.ZodTypeAny,
  toolName: string
): SchemaConversionResult {
  try {
    // Validate the Zod schema has the expected structure
    if (!zodSchema || typeof zodSchema !== "object") {
      return {
        success: false,
        error: `Invalid Zod schema for tool "${toolName}": schema is not an object`,
      };
    }

    // Check for _def.typeName to ensure it's a valid Zod schema
    const def = (zodSchema)?._def;
    if (!def || typeof def !== "object" || !def.typeName) {
      return {
        success: false,
        error: `Invalid Zod schema for tool "${toolName}": missing _def.typeName`,
      };
    }

    // Convert to JSON Schema
    const rawJsonSchema = zodToJsonSchema(zodSchema, CONVERSION_OPTIONS);

    // Extract the actual schema (may be nested under definitions)
    let jsonSchema: JSONSchemaType;

    if (rawJsonSchema && typeof rawJsonSchema === "object") {
      // Handle case where schema is in definitions
      const raw = rawJsonSchema as Record<string, UntypedJson>;
      if (raw.definitions && typeof raw.definitions === "object") {
        const definitions = raw.definitions as Record<string, UntypedJson>;
        // Look for the default or first definition
        const defaultDef = definitions["default"] ?? Object.values(definitions)[0];
        if (defaultDef && typeof defaultDef === "object") {
          jsonSchema = defaultDef as JSONSchemaType;
        } else {
          jsonSchema = raw as JSONSchemaType;
        }
      } else {
        jsonSchema = raw as JSONSchemaType;
      }
    } else {
      return {
        success: false,
        error: `Invalid JSON Schema output for tool "${toolName}"`,
      };
    }

    // CRITICAL: Ensure type: "object" exists - this is the root cause of the error
    if (!jsonSchema.type) {
      jsonSchema.type = "object";
    }

    // Ensure type is exactly "object" for function parameters
    if (jsonSchema.type !== "object") {
      // Wrap non-object schemas in an object
      jsonSchema = {
        type: "object",
        properties: {
          value: jsonSchema,
        },
        required: ["value"],
      };
    }

    // Remove $schema if present (OpenAI doesn't need it)
    delete jsonSchema.$schema;

    // Validate the final schema has required properties
    if (!jsonSchema.properties) {
      jsonSchema.properties = {};
    }

    return {
      success: true,
      jsonSchema,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`[schema-registry] Conversion failed for "${toolName}":`, errorMessage);

    return {
      success: false,
      error: `Schema conversion failed for "${toolName}": ${errorMessage}`,
    };
  }
}

/**
 * Registers a tool schema in the cache after converting to JSON Schema.
 *
 * @param toolName - Unique identifier for the tool
 * @param zodSchema - The Zod schema to register
 * @returns The converted JSON Schema or null if conversion failed
 */
export function registerToolSchema(
  toolName: string,
  zodSchema: z.ZodTypeAny
): JSONSchemaType | null {
  // Check cache first
  const cached = schemaCache.get(toolName);
  if (cached) {
    return cached.jsonSchema;
  }

  // Convert the schema
  const result = convertZodToJsonSchema(zodSchema, toolName);

  if (!result.success || !result.jsonSchema) {
    logger.error(`[schema-registry] Failed to register schema for "${toolName}":`, result.error);
    return null;
  }

  // Cache the converted schema
  schemaCache.set(toolName, {
    zodSchema,
    jsonSchema: result.jsonSchema,
    registeredAt: Date.now(),
    toolName,
  });

  return result.jsonSchema;
}

/**
 * Gets a registered JSON Schema by tool name.
 *
 * @param toolName - The tool to look up
 * @returns The JSON Schema or null if not registered
 */
export function getRegisteredSchema(toolName: string): JSONSchemaType | null {
  const cached = schemaCache.get(toolName);
  return cached?.jsonSchema ?? null;
}

/**
 * Gets the original Zod schema by tool name.
 *
 * @param toolName - The tool to look up
 * @returns The Zod schema or null if not registered
 */
export function getZodSchema(toolName: string): z.ZodTypeAny | null {
  const cached = schemaCache.get(toolName);
  return cached?.zodSchema ?? null;
}

/**
 * Clears the schema cache. Useful for testing or hot-reloading.
 */
export function clearSchemaCache(): void {
  schemaCache.clear();
  logger.debug("[schema-registry] Cache cleared");
}

/**
 * Gets cache statistics.
 */
export function getSchemaCacheStats(): {
  size: number;
  tools: string[];
  oldestEntry: number | null;
} {
  const entries = Array.from(schemaCache.entries());
  const oldest = entries.reduce(
    (min, [, entry]) => (entry.registeredAt < min ? entry.registeredAt : min),
    Date.now()
  );

  return {
    size: schemaCache.size,
    tools: entries.map(([name]) => name),
    oldestEntry: entries.length > 0 ? oldest : null,
  };
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validates that a JSON Schema is properly formatted for OpenAI.
 *
 * @param schema - The JSON Schema to validate
 * @param toolName - Tool name for error messages
 * @returns Validation result
 */
export function validateJsonSchemaForOpenAI(
  schema: unknown,
  toolName: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!schema || typeof schema !== "object") {
    errors.push("Schema is not an object");
    return { valid: false, errors };
  }

  const s = schema as Record<string, UntypedJson>;

  // Must have type: "object"
  if (s.type !== "object") {
    errors.push(`Schema type must be "object", got "${s.type}"`);
  }

  // Should have properties (though empty is technically valid)
  if (s.properties && typeof s.properties !== "object") {
    errors.push("Properties must be an object");
  }

  // Required must be an array if present
  if (s.required !== undefined && !Array.isArray(s.required)) {
    errors.push("Required must be an array");
  }

  // Check for unsupported features
  if (s.$ref) {
    errors.push("$ref is not supported by OpenAI");
  }

  if (s.$defs || s.definitions) {
    errors.push("$defs/definitions should be inlined, not referenced");
  }

  if (errors.length > 0) {
    logger.warn(`[schema-registry] Validation errors for "${toolName}":`, errors);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Creates a safe fallback schema for tools that fail conversion.
 * This ensures the tool can still be called, just without strict validation.
 */
export function createFallbackSchema(toolName: string): JSONSchemaType {
  logger.warn(`[schema-registry] Using fallback schema for "${toolName}"`);
  return {
    type: "object",
    properties: {},
    additionalProperties: true,
    description: `Fallback schema for ${toolName} - accepts any input`,
  };
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Registers multiple tool schemas at once.
 *
 * @param schemas - Map of tool name to Zod schema
 * @returns Results for each tool
 */
export function registerToolSchemas(
  schemas: Record<string, z.ZodTypeAny>
): Record<string, { success: boolean; jsonSchema?: JSONSchemaType; error?: string }> {
  const results: Record<string, { success: boolean; jsonSchema?: JSONSchemaType; error?: string }> = {};

  for (const [toolName, zodSchema] of Object.entries(schemas)) {
    const jsonSchema = registerToolSchema(toolName, zodSchema);

    if (jsonSchema) {
      results[toolName] = { success: true, jsonSchema };
    } else {
      results[toolName] = {
        success: false,
        error: `Failed to convert schema for ${toolName}`,
      };
    }
  }

  return results;
}

/**
 * Validates all registered schemas meet OpenAI requirements.
 */
export function validateAllRegisteredSchemas(): {
  valid: string[];
  invalid: Array<{ toolName: string; errors: string[] }>;
} {
  const valid: string[] = [];
  const invalid: Array<{ toolName: string; errors: string[] }> = [];

  for (const [toolName, entry] of schemaCache.entries()) {
    const result = validateJsonSchemaForOpenAI(entry.jsonSchema, toolName);
    if (result.valid) {
      valid.push(toolName);
    } else {
      invalid.push({ toolName, errors: result.errors });
    }
  }

  return { valid, invalid };
}
