/**
 * Shared Argument Schemas for Tool Definitions
 * 
 * Domain: AI Tools
 * Responsibility: Common JSON Schema patterns for tool arguments
 * Notes: Converted from Zod to pure JSON Schema for AI SDK 5.0 compatibility
 */

import type { JSONSchema7 } from "json-schema";

// JSON Schema for primitive values
export const JsonPrimitiveSchema: JSONSchema7 = {
  oneOf: [
    { type: "string" },
    { type: "number" },
    { type: "boolean" },
    { type: "null" },
  ],
};

// Key-value pair schema for nested objects
export const KeyValuePairSchema: JSONSchema7 = {
  type: "object",
  properties: {
    key: { type: "string", description: "Property name" },
    value: { ...JsonPrimitiveSchema, description: "Property value" },
  },
  required: ["key", "value"],
};

// Value that can be primitive, array of primitives, or array of key-value pairs
export const JsonValueSchema: JSONSchema7 = {
  oneOf: [
    JsonPrimitiveSchema,
    {
      type: "array",
      items: JsonPrimitiveSchema,
    },
    {
      type: "array",
      items: KeyValuePairSchema,
      description: "Nested object as key-value pairs",
    },
  ],
};

// Argument entry for tool invocation
export const ArgEntrySchema: JSONSchema7 = {
  type: "object",
  properties: {
    key: { type: "string", description: "Argument name" },
    value: { ...JsonValueSchema, description: "Argument value" },
  },
  required: ["key", "value"],
};

// Args array schema for tools that accept dynamic arguments
export const ArgsArraySchema: JSONSchema7 = {
  type: "array",
  items: ArgEntrySchema,
  default: [],
  description: "Arguments as key-value pairs",
};

// Helper to convert args array to record (with backward compatibility for object format)
export const argsArrayToRecord = (
  args: Array<{ key: string; value: UntypedJson }> | Record<string, UntypedJson>,
): Record<string, UntypedJson> => {
  if (!Array.isArray(args)) {
    return args as Record<string, UntypedJson>;
  }

  return args.reduce((acc, { key, value }) => {
    if (
      Array.isArray(value) &&
      value.every(
        (item): item is { key: string; value: UntypedJson } =>
          typeof item === "object" && item !== null && "key" in item && "value" in item,
      )
    ) {
      acc[key] = argsArrayToRecord(value);
    } else {
      acc[key] = value;
    }
    return acc;
  }, {} as Record<string, UntypedJson>);
};
