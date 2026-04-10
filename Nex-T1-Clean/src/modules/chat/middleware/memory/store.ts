/**
 * Persistent Memory Store — Write Operations
 *
 * Provides CRUD operations for persistent memory files with YAML
 * frontmatter. Delegates path utilities, scanning, and prompt building
 * to their respective modules.
 */

import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { MemoryFrontmatter, MemoryIndexEntry } from "./types";
import { MEMORY_TYPES, MAX_FRONTMATTER_FIELD_LENGTH } from "./types";
import { validateMemoryFilename, ensureMemoryDir, INDEX_FILENAME } from "./paths";

// Re-export path utilities
export { getMemoryDir, ensureMemoryDir } from "./paths";
// Re-export scanner
export { scanMemoryFiles } from "./scanner";
// Re-export prompt builder
export { readIndex, buildMemoryPrompt } from "./prompt-builder";

// ---------------------------------------------------------------------------
// File Lock
// ---------------------------------------------------------------------------

/**
 * Simple per-path lock to serialize concurrent writes to the same file.
 * Prevents read-then-write race conditions on the index file.
 */
const writeLocks = new Map<string, Promise<void>>();

function withFileLock<T>(
  filePath: string,
  fn: () => Promise<T>,
): Promise<T> {
  const normalizedPath = resolve(filePath);
  const previous = writeLocks.get(normalizedPath) ?? Promise.resolve();

  const next = previous
    .then(fn, fn)
    .finally(() => {
      if (writeLocks.get(normalizedPath) === next) {
        writeLocks.delete(normalizedPath);
      }
    });

  writeLocks.set(normalizedPath, next.then(() => undefined, () => undefined));
  return next;
}

// ---------------------------------------------------------------------------
// Sanitization
// ---------------------------------------------------------------------------

/**
 * Sanitizes a frontmatter value to prevent YAML injection.
 * Removes newlines and limits length.
 */
function sanitizeFrontmatterValue(
  value: string,
  maxLength = MAX_FRONTMATTER_FIELD_LENGTH,
): string {
  return value
    .replace(/[\r\n]/g, " ")
    .replace(/---/g, "- -")
    .trim()
    .slice(0, maxLength);
}

// ---------------------------------------------------------------------------
// Write Memory File
// ---------------------------------------------------------------------------

export async function writeMemoryFile(
  memoryDir: string,
  filename: string,
  frontmatter: MemoryFrontmatter,
  content: string,
): Promise<string> {
  validateMemoryFilename(filename);
  await ensureMemoryDir(memoryDir);

  const safeName = sanitizeFrontmatterValue(frontmatter.name);
  const safeDesc = sanitizeFrontmatterValue(frontmatter.description);

  if (!safeName) throw new Error("Memory frontmatter name must not be empty");
  if (!safeDesc) throw new Error("Memory frontmatter description must not be empty");
  if (!MEMORY_TYPES.includes(frontmatter.type)) {
    throw new Error(`Invalid memory type: ${frontmatter.type}`);
  }

  const fileContent = [
    "---",
    `name: "${safeName.replace(/"/g, '\\"')}"`,
    `description: "${safeDesc.replace(/"/g, '\\"')}"`,
    `type: ${frontmatter.type}`,
    "---",
    "",
    content,
  ].join("\n");

  const filePath = join(memoryDir, filename);

  const resolvedPath = resolve(filePath);
  const resolvedDir = resolve(memoryDir);
  if (!resolvedPath.startsWith(resolvedDir + "/") && resolvedPath !== resolvedDir) {
    throw new Error("Resolved file path escapes the memory directory");
  }

  await writeFile(filePath, fileContent, { encoding: "utf-8", mode: 0o600 });
  return filePath;
}

// ---------------------------------------------------------------------------
// Update Index
// ---------------------------------------------------------------------------

export async function updateIndex(
  memoryDir: string,
  entry: MemoryIndexEntry,
): Promise<void> {
  validateMemoryFilename(entry.filename);

  const indexPath = join(memoryDir, INDEX_FILENAME);

  const safeTitle = sanitizeFrontmatterValue(entry.title, 200);
  const safeDesc = sanitizeFrontmatterValue(entry.description, 200);

  await withFileLock(indexPath, async () => {
    let existingContent = "";
    try {
      existingContent = await readFile(indexPath, "utf-8");
    } catch {
      // Index doesn't exist yet
    }

    const newLine = `- [${safeTitle}](${entry.filename}) -- ${safeDesc}`;
    const linkPattern = `](${entry.filename})`;
    const hasExisting = existingContent
      .split("\n")
      .some((line) => line.includes(linkPattern));

    if (hasExisting) {
      const lines = existingContent.split("\n");
      const updatedLines = lines.map((line) =>
        line.includes(linkPattern) ? newLine : line,
      );
      await writeFile(indexPath, updatedLines.join("\n"), {
        encoding: "utf-8",
        mode: 0o600,
      });
    } else {
      const updated = existingContent.trim()
        ? `${existingContent.trim()}\n${newLine}\n`
        : `${newLine}\n`;
      await writeFile(indexPath, updated, {
        encoding: "utf-8",
        mode: 0o600,
      });
    }
  });
}
