/**
 * Persistent Memory System — Type Definitions
 *
 * Implements a 4-type memory taxonomy for cross-session knowledge retention.
 * Each memory is a standalone markdown file with YAML frontmatter.
 */

export const MEMORY_TYPES = [
  "user",
  "feedback",
  "project",
  "reference",
] as const;

export type MemoryType = (typeof MEMORY_TYPES)[number];

/** Maximum allowed length for frontmatter string fields (name, description). */
export const MAX_FRONTMATTER_FIELD_LENGTH = 500;

export type MemoryFrontmatter = {
  readonly name: string;
  readonly description: string;
  readonly type: MemoryType;
};

export type MemoryFile = {
  /** File path relative to memory directory */
  readonly filename: string;
  /** Absolute file path */
  readonly absolutePath: string;
  /** Parsed frontmatter */
  readonly frontmatter: MemoryFrontmatter;
  /** File content (after frontmatter) */
  readonly content: string;
  /** Last modified time */
  readonly modifiedAt: Date;
};

export type MemoryIndexEntry = {
  readonly title: string;
  readonly filename: string;
  readonly description: string;
};

export type MemoryConfig = {
  /** Base directory for memory storage */
  readonly baseDir: string;
  /** Maximum lines in MEMORY.md index */
  readonly maxIndexLines: number;
  /** Maximum bytes in MEMORY.md index */
  readonly maxIndexBytes: number;
  /** Maximum number of memory files to scan */
  readonly maxMemoryFiles: number;
  /** Maximum size of all memory content for injection */
  readonly maxInjectionBytes: number;
};

export const DEFAULT_MEMORY_CONFIG: Readonly<MemoryConfig> = {
  baseDir: "",
  maxIndexLines: 200,
  maxIndexBytes: 25_000,
  maxMemoryFiles: 200,
  maxInjectionBytes: 25_000,
};
