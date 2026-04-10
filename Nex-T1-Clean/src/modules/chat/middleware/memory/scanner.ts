/**
 * Memory File Scanner
 *
 * Reads and parses YAML-frontmatter memory files from the memory directory.
 * Scans .md files, extracts frontmatter metadata, and returns sorted results.
 */

import { readFile, readdir, stat } from "node:fs/promises";
import { join, extname } from "node:path";
import type { MemoryFile, MemoryFrontmatter, MemoryType } from "./types";
import { DEFAULT_MEMORY_CONFIG, MEMORY_TYPES, MAX_FRONTMATTER_FIELD_LENGTH } from "./types";
import { INDEX_FILENAME } from "./paths";

// ---------------------------------------------------------------------------
// Frontmatter Parsing
// ---------------------------------------------------------------------------

/**
 * Strips surrounding quotes from a YAML value string.
 * Handles both single and double quotes.
 */
function stripYamlQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function parseFrontmatter(
  content: string,
): { frontmatter: MemoryFrontmatter; body: string } | null {
  const normalized = content.replace(/\r\n/g, "\n");

  const match = normalized.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return null;

  const [, yamlBlock, body] = match;
  const builder: { name?: string; description?: string; type?: MemoryType } = {};

  for (const line of (yamlBlock ?? "").split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx < 0) continue;

    const key = line.slice(0, colonIdx).trim();
    const rawValue = stripYamlQuotes(line.slice(colonIdx + 1));

    if (!rawValue) continue;

    if (key === "name") {
      builder.name = rawValue.slice(0, MAX_FRONTMATTER_FIELD_LENGTH);
    }
    if (key === "description") {
      builder.description = rawValue.slice(0, MAX_FRONTMATTER_FIELD_LENGTH);
    }
    if (key === "type" && MEMORY_TYPES.includes(rawValue as MemoryType)) {
      builder.type = rawValue as MemoryType;
    }
  }

  if (!builder.name || !builder.description || !builder.type) {
    return null;
  }

  const frontmatter: MemoryFrontmatter = {
    name: builder.name,
    description: builder.description,
    type: builder.type,
  };

  return { frontmatter, body: body ?? "" };
}

// ---------------------------------------------------------------------------
// Directory Scanning
// ---------------------------------------------------------------------------

export async function scanMemoryFiles(
  memoryDir: string,
  maxFiles = DEFAULT_MEMORY_CONFIG.maxMemoryFiles,
): Promise<readonly MemoryFile[]> {
  let entries: string[];
  try {
    entries = await readdir(memoryDir);
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "ENOTDIR") {
      return [];
    }
    console.error(`[memory] Failed to read memory directory ${memoryDir}:`, err);
    return [];
  }

  const mdFiles = entries.filter(
    (f) => extname(f) === ".md" && f !== INDEX_FILENAME,
  );

  const files: MemoryFile[] = [];

  for (const filename of mdFiles.slice(0, maxFiles)) {
    const absolutePath = join(memoryDir, filename);
    try {
      const [content, fileStat] = await Promise.all([
        readFile(absolutePath, "utf-8"),
        stat(absolutePath),
      ]);
      const parsed = parseFrontmatter(content);
      if (!parsed) continue;

      files.push({
        filename,
        absolutePath,
        frontmatter: parsed.frontmatter,
        content: parsed.body,
        modifiedAt: fileStat.mtime,
      });
    } catch (err: unknown) {
      console.warn(
        `[memory] Skipping unreadable memory file ${absolutePath}:`,
        (err as Error).message,
      );
    }
  }

  files.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());
  return files;
}
