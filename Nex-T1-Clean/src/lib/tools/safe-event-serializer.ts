import { logger } from '@/lib/logger';

/**
 * @deprecated This module is scheduled for removal in Phase 5 of AI SDK Modernization.
 * 
 * Safe Event Serializer - DEPRECATED
 * 
 * Domain: tools, chat, streaming
 * Responsibility: Ensure all data emitted through event streams is safe for serialization
 *                 by stripping Zod schemas and other non-serializable constructs.
 * 
 * DEPRECATION REASON:
 * With the AI SDK modernization:
 * - All tools now use JSON Schema at definition time (create-tool.ts)
 * - Tool schemas are validated at creation, not at stream time
 * - The pipeline uses toUIMessageStreamResponse() which handles serialization
 * - Zod schemas are never placed in the event stream
 * 
 * The "typeName" error this module was designed to prevent should no longer
 * occur because Zod schemas are never in the stream path.
 * 
 * Migration: Remove all usages and delete this file in Phase 5.
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type EventEmitter = (type: string, data: UntypedJson) => void;

export type SerializationResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
  fallback: null;
};

// ============================================================================
// DETECTION UTILITIES
// ============================================================================

/**
 * Property names that indicate a Zod schema object.
 * If an object has any of these, it's likely a Zod schema or related construct.
 */
const ZOD_INDICATOR_PROPERTIES = new Set([
  "_def",
  "_cached",
  "_type",
  "_output",
  "_input",
  "safeParse",
  "parseAsync",
  "safeParseAsync",
  "spa",
  "refine",
  "superRefine",
  "transform",
  "default",
  "catch",
  "optional",
  "nullable",
  "nullish",
  "array",
  "promise",
  "or",
  "and",
  "brand",
  "pipe",
]);

/**
 * Checks if a function looks like a Zod schema method.
 */
function isZodMethod(value: UntypedJson): boolean {
  if (typeof value !== "function") return false;
  const fnStr = value.toString();
  return fnStr.includes("_def") || fnStr.includes("ZodType") || fnStr.includes("safeParse");
}

/**
 * Comprehensive check to determine if a value is or contains a Zod schema.
 */
function containsZodSchema(value: UntypedJson, seen = new WeakSet<object>()): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value !== "object" && typeof value !== "function") return false;
  
  // Circular reference protection
  if (typeof value === "object" && seen.has(value)) return false;
  if (typeof value === "object") seen.add(value);
  
  const obj = value as Record<string, UntypedJson>;
  
  // Check for direct Zod indicators
  if ("_def" in obj) return true;
  
  // Check for Zod method-like properties
  for (const prop of ZOD_INDICATOR_PROPERTIES) {
    if (prop in obj && typeof obj[prop] === "function") {
      if (isZodMethod(obj[prop])) return true;
    }
  }
  
  // Check prototype chain
  const proto = Object.getPrototypeOf(obj);
  if (proto && proto !== Object.prototype && proto !== Array.prototype) {
    const protoName = proto.constructor?.name ?? "";
    if (protoName.startsWith("Zod") || protoName.includes("Schema")) {
      return true;
    }
  }
  
  return false;
}

// ============================================================================
// SAFE SERIALIZATION
// ============================================================================

/**
 * Maximum depth for recursive serialization.
 * Prevents stack overflow on deeply nested or circular structures.
 */
const MAX_DEPTH = 100;

/**
 * Keys to always exclude from serialized output.
 * These are internal Zod properties or other framework internals.
 */
const EXCLUDED_KEYS = new Set([
  "_def",
  "_cached",
  "_type",
  "_output",
  "_input",
  "__proto__",
]);

/**
 * Recursively serializes a value, stripping all Zod schemas and non-serializable data.
 * Returns a plain JSON-safe object.
 */
function serializeValue(
  value: UntypedJson,
  depth: number,
  seen: WeakSet<object>,
  path: string
): UntypedJson {
  // Depth check
  if (depth > MAX_DEPTH) {
    logger.warn(`[SafeEventSerializer] Max depth exceeded at ${path}`);
    return null;
  }
  
  // Null/undefined pass through
  if (value === null || value === undefined) {
    return value;
  }
  
  // Primitives
  const type = typeof value;
  if (type === "string" || type === "number" || type === "boolean") {
    return value;
  }
  
  // BigInt → string
  if (type === "bigint") {
    return value.toString();
  }
  
  // Symbol → string
  if (type === "symbol") {
    return value.toString();
  }
  
  // Functions are not serializable
  if (type === "function") {
    return undefined;
  }
  
  // Handle objects
  if (type === "object") {
    // Circular reference check
    if (seen.has(value as object)) {
      return "[Circular]";
    }
    seen.add(value as object);
    
    try {
      // Check if this looks like a Zod schema
      if (containsZodSchema(value, new WeakSet())) {
        logger.warn(`[SafeEventSerializer] Stripped Zod schema at ${path}`);
        return undefined;
      }
      
      // Date objects
      if (value instanceof Date) {
        return value.toISOString();
      }
      
      // RegExp objects
      if (value instanceof RegExp) {
        return value.toString();
      }
      
      // Error objects
      if (value instanceof Error) {
        return {
          name: value.name,
          message: value.message,
          stack: value.stack,
        };
      }
      
      // Map → object
      if (value instanceof Map) {
        const mapObj: Record<string, UntypedJson> = {};
        for (const [k, v] of value.entries()) {
          const key = typeof k === "string" ? k : String(k);
          mapObj[key] = serializeValue(v, depth + 1, seen, `${path}.Map[${key}]`);
        }
        return mapObj;
      }
      
      // Set → array
      if (value instanceof Set) {
        return Array.from(value).map((item, i) =>
          serializeValue(item, depth + 1, seen, `${path}.Set[${i}]`)
        ).filter(item => item !== undefined);
      }
      
      // ArrayBuffer/TypedArrays → array of numbers
      if (ArrayBuffer.isView(value)) {
        return Array.from(value as Uint8Array);
      }
      
      // Arrays
      if (Array.isArray(value)) {
        return value
          .map((item, i) => serializeValue(item, depth + 1, seen, `${path}[${i}]`))
          .filter(item => item !== undefined);
      }
      
      // Plain objects
      const result: Record<string, UntypedJson> = {};
      
      // Get own enumerable properties
      for (const key of Object.keys(value as object)) {
        // Skip excluded keys
        if (EXCLUDED_KEYS.has(key)) continue;
        
        // Skip keys starting with underscore (internal properties)
        if (key.startsWith("_")) continue;
        
        // Safe property access
        let propValue: UntypedJson;
        try {
          propValue = (value as Record<string, UntypedJson>)[key];
        } catch {
          // Getter threw - skip this property
          continue;
        }
        
        // Skip functions
        if (typeof propValue === "function") continue;
        
        // Recursively serialize
        const serialized = serializeValue(propValue, depth + 1, seen, `${path}.${key}`);
        if (serialized !== undefined) {
          result[key] = serialized;
        }
      }
      
      return result;
    } finally {
      seen.delete(value as object);
    }
  }
  
  // Unknown type - return null
  return null;
}

/**
 * Safely serializes any value, removing all Zod schemas and non-serializable data.
 * Returns a plain JSON-safe object that can be safely stringified and streamed.
 * 
 * @param value - Any value to serialize
 * @returns Serialized value safe for JSON.stringify and streaming
 * 
 * @example
 * ```typescript
 * const unsafeData = { result: zodSchema, output: { text: "hello" } };
 * const safeData = safeSerialize(unsafeData);
 * // safeData = { output: { text: "hello" } }
 * ```
 */
export function safeSerialize<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }
  
  const seen = new WeakSet<object>();
  const result = serializeValue(value, 0, seen, "root");
  
  return result as T;
}

/**
 * Attempts to serialize with detailed result information.
 * Useful when you need to know if serialization removed anything.
 */
export function safeSerializeWithResult<T>(value: T): SerializationResult<T> {
  try {
    const serialized = safeSerialize(value);
    return { success: true, data: serialized };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("[SafeEventSerializer] Serialization failed:", message);
    return { success: false, error: message, fallback: null };
  }
}

// ============================================================================
// SAFE EVENT EMITTER
// ============================================================================

/**
 * Creates a wrapped event emitter that automatically sanitizes all data.
 * Use this to wrap the raw `emitEvent` function in tool runners and pipelines.
 * 
 * @param rawEmitter - The underlying event emitter function
 * @returns A safe wrapper that sanitizes data before emitting
 * 
 * @example
 * ```typescript
 * const emitEvent = (type: string, data: unknown) => eventStream.update({ type, data });
 * const safeEmit = createSafeEventEmitter(emitEvent);
 * 
 * // Now safe to emit any data
 * safeEmit("payloads", toolOutputWithPossibleSchemas);
 * ```
 */
export function createSafeEventEmitter(rawEmitter: EventEmitter): EventEmitter {
  return (type: string, data: UntypedJson) => {
    // Sanitize the data before emission
    const safeData = safeSerialize(data);
    
    // Only emit if we have data (serialization might have stripped everything)
    if (safeData !== undefined) {
      rawEmitter(type, safeData);
    } else {
      logger.warn(`[SafeEventSerializer] Event "${type}" data was entirely stripped - not emitting`);
    }
  };
}

/**
 * Validates that data is safe for streaming (no Zod schemas).
 * Use this for assertions/debugging.
 */
export function isStreamSafe(value: UntypedJson): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value !== "object") return true;
  
  return !containsZodSchema(value);
}

/**
 * Debug utility: logs detailed information about any Zod schemas found in data.
 * Use during development to trace where schemas are leaking.
 */
export function debugFindSchemas(value: UntypedJson, path: string = "root"): string[] {
  const found: string[] = [];
  
  function search(v: UntypedJson, p: string, seen: WeakSet<object>): void {
    if (v === null || v === undefined) return;
    if (typeof v !== "object") return;
    if (seen.has(v)) return;
    seen.add(v);
    
    if (containsZodSchema(v, new WeakSet())) {
      found.push(p);
      return; // Don't recurse into schemas
    }
    
    if (Array.isArray(v)) {
      v.forEach((item, i) => search(item, `${p}[${i}]`, seen));
    } else {
      for (const key of Object.keys(v)) {
        try {
          search((v as Record<string, UntypedJson>)[key], `${p}.${key}`, seen);
        } catch {
          // Property access error - skip
        }
      }
    }
  }
  
  search(value, path, new WeakSet());
  return found;
}

