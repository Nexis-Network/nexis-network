/**
 * Memory Directory Path Utilities
 *
 * Resolves, validates, and ensures the filesystem paths used by the
 * persistent memory system. Provides slug generation and filename safety.
 */

import { mkdir } from "node:fs/promises";
import { join, extname, resolve, basename, normalize } from "node:path";

const INDEX_FILENAME = "MEMORY.md";

// ---------------------------------------------------------------------------
// Slug Generation
// ---------------------------------------------------------------------------

/**
 * Produces a flat, filesystem-safe slug from an arbitrary project root path.
 *
 * Security: strips all characters except alphanumerics, underscores, and hyphens.
 * Directory separators, dots, and special characters are all replaced to prevent
 * path traversal and ensure consistent slugs across platforms.
 */
export function sanitizePathSlug(input: string): string {
  const normalized = normalize(input);

  return normalized
    .replace(/[^a-zA-Z0-9_\-]/g, "_") // Only allow safe chars (no dots, no slashes)
    .replace(/_+/g, "_")               // Collapse consecutive underscores
    .replace(/^_|_$/g, "")             // Trim leading/trailing underscores
    .slice(0, 120);
}

// ---------------------------------------------------------------------------
// Filename Validation
// ---------------------------------------------------------------------------

/**
 * Validates that a filename is safe for use within the memory directory.
 * Rejects path traversal, absolute paths, and non-.md extensions.
 */
export function validateMemoryFilename(filename: string): void {
  if (!filename || typeof filename !== "string") {
    throw new Error("Memory filename must be a non-empty string");
  }

  if (basename(filename) !== filename) {
    throw new Error(
      `Memory filename must not contain directory separators: ${filename}`,
    );
  }

  if (extname(filename) !== ".md") {
    throw new Error(`Memory filename must have .md extension: ${filename}`);
  }

  if (filename === INDEX_FILENAME) {
    throw new Error("Cannot write to the index file directly");
  }

  if (filename.startsWith(".") || filename.includes("..")) {
    throw new Error(`Unsafe memory filename: ${filename}`);
  }
}

// ---------------------------------------------------------------------------
// Directory Resolution
// ---------------------------------------------------------------------------

export function getMemoryDir(projectRoot: string): string {
  const homeDir = process.env.HOME ?? process.env.USERPROFILE ?? "/tmp";
  const slug = sanitizePathSlug(projectRoot);

  if (!slug) {
    throw new Error("Project root produced an empty slug after sanitization");
  }

  return join(homeDir, ".nex-t1", "projects", slug, "memory");
}

export async function ensureMemoryDir(memoryDir: string): Promise<void> {
  await mkdir(memoryDir, { recursive: true, mode: 0o700 });
}

export { INDEX_FILENAME };
