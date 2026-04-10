/**
 * Memory Prompt Builder
 *
 * Constructs the memory prompt injected into chat context from the
 * MEMORY.md index. Handles truncation, escaping, and size limits.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { MemoryConfig } from "./types";
import { DEFAULT_MEMORY_CONFIG } from "./types";
import { INDEX_FILENAME } from "./paths";

// ---------------------------------------------------------------------------
// Index Reading
// ---------------------------------------------------------------------------

export async function readIndex(memoryDir: string): Promise<string> {
  try {
    const indexPath = join(memoryDir, INDEX_FILENAME);
    const content = await readFile(indexPath, "utf-8");
    return truncateIndex(content);
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// Index Truncation
// ---------------------------------------------------------------------------

/**
 * Truncates index content to fit within line and byte limits.
 *
 * Byte truncation is done on a line boundary to avoid splitting multi-byte
 * UTF-8 characters. The function never slices within a line.
 */
export function truncateIndex(
  content: string,
  maxLines = DEFAULT_MEMORY_CONFIG.maxIndexLines,
  maxBytes = DEFAULT_MEMORY_CONFIG.maxIndexBytes,
): string {
  const lines = content.split("\n");
  const linesCapped = lines.slice(0, maxLines);

  let byteCount = 0;
  let lastSafeLine = 0;
  for (let i = 0; i < linesCapped.length; i++) {
    const lineBytes = Buffer.byteLength(linesCapped[i]!, "utf-8");
    const separatorByte = i > 0 ? 1 : 0;
    if (byteCount + separatorByte + lineBytes > maxBytes) break;
    byteCount += separatorByte + lineBytes;
    lastSafeLine = i + 1;
  }

  const truncatedLines = linesCapped.slice(0, lastSafeLine);
  let result = truncatedLines.join("\n");

  const wasTruncated = lines.length > maxLines || lastSafeLine < linesCapped.length;
  if (wasTruncated) {
    result +=
      "\n\n> WARNING: MEMORY.md was truncated. Keep entries under ~150 chars; move detail into topic files.";
  }

  return result;
}

// ---------------------------------------------------------------------------
// Prompt Construction
// ---------------------------------------------------------------------------

/**
 * Escapes content that will be injected into a prompt to prevent
 * memory content from being interpreted as prompt directives.
 */
function escapeMemoryContent(content: string): string {
  return content
    .replace(/^#/gm, "\\#")  // Prevent heading injection
    .replace(/^>/gm, "\\>"); // Prevent blockquote injection
}

export function buildMemoryPrompt(
  indexContent: string,
  config: Partial<MemoryConfig> = {},
): string {
  if (!indexContent.trim()) return "";

  const escapedContent = escapeMemoryContent(indexContent);

  const sections: string[] = [
    "# auto memory\n",
    "You have a persistent, file-based memory system. This directory already exists -- write to it directly.\n",
    "## Memory Index\n",
    "```\n" + escapedContent + "\n```",
    "\n## When to access memories",
    "- When memories seem relevant, or the user references prior-conversation work.",
    "- If the user says to *ignore* or *not use* memory: proceed as if MEMORY.md were empty.",
    "- Memory records can become stale. Verify before acting on recalled information.",
  ];

  const prompt = sections.join("\n");

  const maxBytes =
    config.maxInjectionBytes ?? DEFAULT_MEMORY_CONFIG.maxInjectionBytes;
  if (Buffer.byteLength(prompt, "utf-8") > maxBytes) {
    const promptLines = prompt.split("\n");
    let byteTotal = 0;
    let safeLine = 0;
    for (let i = 0; i < promptLines.length; i++) {
      const lineBytes = Buffer.byteLength(promptLines[i]!, "utf-8");
      const sep = i > 0 ? 1 : 0;
      if (byteTotal + sep + lineBytes > maxBytes) break;
      byteTotal += sep + lineBytes;
      safeLine = i + 1;
    }
    return promptLines.slice(0, safeLine).join("\n") + "\n[Memory truncated]";
  }

  return prompt;
}
