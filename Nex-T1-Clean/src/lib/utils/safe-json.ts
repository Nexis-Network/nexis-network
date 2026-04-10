import { logger } from '@/lib/logger';

/**
 * Safe JSON Utilities
 * 
 * Domain: utils, client
 * Responsibility: Provide safe JSON serialization that handles Zod schemas and other
 *                 non-serializable constructs without throwing errors.
 * Depends on: None (pure utility module, client-safe)
 * 
 * CRITICAL: This module prevents "Cannot read properties of undefined (reading 'typeName')"
 * errors by providing safe alternatives to JSON.stringify that handle edge cases.
 * 
 * This is designed to be lightweight and client-safe (no Node.js dependencies).
 */

// ============================================================================
// TYPES
// ============================================================================

export type SafeStringifyOptions = {
  /**
   * Maximum depth to recurse into objects.
   * @default 50
   */
  maxDepth?: number;
  
  /**
   * Space parameter for JSON.stringify (for pretty printing).
   * @default undefined (compact output)
   */
  space?: string | number;
  
  /**
   * Whether to log warnings when filtering out Zod schemas.
   * @default false
   */
  logWarnings?: boolean;
};

// ============================================================================
// DETECTION
// ============================================================================

/**
 * Keys that indicate an object is a Zod schema or related construct.
 */
const ZOD_MARKERS = ["_def", "_cached", "safeParse", "parseAsync", "_type", "_output", "_input"];

/**
 * Checks if an object looks like a Zod schema.
 * This is a fast check optimized for client-side performance.
 */
function looksLikeZodSchema(obj: UntypedJson): boolean {
  if (!obj || typeof obj !== "object") return false;
  
  const record = obj as Record<string, UntypedJson>;
  
  // Primary check: _def property
  if ("_def" in record) {
    return true;
  }
  
  // Secondary check: multiple Zod method signatures
  let zodMethodCount = 0;
  for (const marker of ZOD_MARKERS) {
    if (marker in record) {
      zodMethodCount++;
      if (zodMethodCount >= 2) return true;
    }
  }
  
  return false;
}

// ============================================================================
// SAFE STRINGIFY
// ============================================================================

/**
 * Custom replacer function for JSON.stringify that handles Zod schemas
 * and other non-serializable values.
 */
function createSafeReplacer(
  maxDepth: number,
  logWarnings: boolean
): (this: UntypedJson, key: string, value: UntypedJson) => UntypedJson {
  const seen = new WeakSet<object>();
  let currentDepth = 0;
  
  return function replacer(this: UntypedJson, key: string, value: UntypedJson): UntypedJson {
    // Handle null/undefined
    if (value === null || value === undefined) {
      return value;
    }
    
    // Handle primitives
    const type = typeof value;
    if (type === "string" || type === "number" || type === "boolean") {
      return value;
    }
    
    // BigInt to string
    if (type === "bigint") {
      return value.toString();
    }
    
    // Symbol to string
    if (type === "symbol") {
      return value.toString();
    }
    
    // Functions are not serializable - omit them
    if (type === "function") {
      return undefined;
    }
    
    // Handle objects
    if (type === "object") {
      // Depth check
      if (currentDepth > maxDepth) {
        return "[MaxDepth]";
      }
      
      // Circular reference check
      if (seen.has(value as object)) {
        return "[Circular]";
      }
      
      // Check for Zod schema
      if (looksLikeZodSchema(value)) {
        if (logWarnings) {
          logger.warn(`[safeStringify] Filtered Zod schema at key "${key}"`);
        }
        return undefined;
      }
      
      // Track this object
      seen.add(value as object);
      currentDepth++;
      
      try {
        // Date objects
        if (value instanceof Date) {
          return value.toISOString();
        }
        
        // Error objects
        if (value instanceof Error) {
          return {
            name: value.name,
            message: value.message,
          };
        }
        
        // For arrays and plain objects, let JSON.stringify handle them
        // with our replacer being called for each nested value
        return value;
      } finally {
        // Note: We can't easily decrement depth in a replacer
        // This is why we also have the maxDepth check
      }
    }
    
    // Unknown type - return as-is and let JSON.stringify handle it
    return value;
  };
}

/**
 * Safely stringifies a value to JSON, handling Zod schemas and other
 * non-serializable constructs without throwing errors.
 * 
 * Use this instead of JSON.stringify when:
 * - The input might contain Zod schema references
 * - You need to guarantee no "typeName" errors
 * - The data comes from tool outputs or event streams
 * 
 * @param value - The value to stringify
 * @param options - Optional configuration
 * @returns JSON string or null if serialization fails completely
 * 
 * @example
 * ```typescript
 * // Safe usage with potentially dangerous data
 * const hash = safeStringify(payload);
 * 
 * // With options
 * const pretty = safeStringify(data, { space: 2, logWarnings: true });
 * ```
 */
export function safeStringify(
  value: UntypedJson,
  options: SafeStringifyOptions = {}
): string | null {
  const { maxDepth = 50, space, logWarnings = false } = options;
  
  try {
    // Quick check: if it's a Zod schema at the root, return null
    if (looksLikeZodSchema(value)) {
      if (logWarnings) {
        logger.warn("[safeStringify] Root value is a Zod schema - returning null");
      }
      return null;
    }
    
    const replacer = createSafeReplacer(maxDepth, logWarnings);
    return JSON.stringify(value, replacer, space);
  } catch (error) {
    // If JSON.stringify still throws, return null
    if (logWarnings) {
      logger.warn("[safeStringify] Serialization failed:", error);
    }
    return null;
  }
}

/**
 * Creates a hash string from a value, safely handling Zod schemas.
 * Returns a consistent string even if the value contains non-serializable data.
 * 
 * @param value - The value to hash
 * @returns A string suitable for use as a hash/key
 */
export function safeHash(value: UntypedJson): string {
  const json = safeStringify(value);
  
  // If serialization failed, create a fallback hash
  if (json === null) {
    // Create a simple type-based fallback
    const type = typeof value;
    if (type === "object" && value !== null) {
      const keys = Object.keys(value as object).slice(0, 5).join(",");
      return `[object:${keys}]`;
    }
    return `[${type}]`;
  }
  
  return json;
}

/**
 * Safely parses JSON, returning null on failure instead of throwing.
 * 
 * @param text - The JSON string to parse
 * @returns Parsed value or null if parsing fails
 */
export function safeParse<T = UntypedJson>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/**
 * Deep clones a value by serializing and deserializing, filtering out
 * any Zod schemas or non-serializable data in the process.
 * 
 * @param value - The value to clone
 * @returns A clean clone with all Zod schemas removed, or null if cloning fails
 */
export function safeClone<T>(value: T): T | null {
  const json = safeStringify(value);
  if (json === null) return null;
  return safeParse<T>(json);
}

