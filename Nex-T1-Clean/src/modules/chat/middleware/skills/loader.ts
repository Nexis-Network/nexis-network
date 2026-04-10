/**
 * Nex Skill Loader -- On-Demand Skill Loading with LRU Cache
 *
 * Handles lazy loading of skill prompt content and injection into system
 * prompts. Uses an LRU cache bounded to MAX_CACHE_ENTRIES to avoid
 * unbounded memory growth in long-running server processes.
 */

import fs from "fs/promises";

import { logger } from "@/lib/logger";

import type { SkillDefinition } from "./types";
import { MAX_CACHE_ENTRIES } from "./types";
import { getSkillByName } from "./registry";
import { parseFrontmatter as parseSkillFrontmatter } from "./scanner";

// ---------------------------------------------------------------------------
// LRU Cache
// ---------------------------------------------------------------------------

type CacheEntry = {
  content: string;
  loadedAt: number;
  accessedAt: number;
};

const cache = new Map<string, CacheEntry>();

/**
 * Evicts the least recently accessed entries until capacity is restored.
 * Uses a while loop to handle cases where multiple evictions are needed
 * (e.g., if MAX_CACHE_ENTRIES was reduced or concurrent calls added entries).
 */
function evictLRU(): void {
  while (cache.size > MAX_CACHE_ENTRIES) {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of cache) {
      if (entry.accessedAt < oldestTime) {
        oldestTime = entry.accessedAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      cache.delete(oldestKey);
    } else {
      // Safety: should not happen, but prevents infinite loop
      break;
    }
  }
}

/**
 * Retrieves a cached skill content, updating access time on hit.
 */
function getCached(skillName: string): string | undefined {
  const entry = cache.get(skillName);
  if (!entry) return undefined;
  entry.accessedAt = Date.now();
  return entry.content;
}

/**
 * Stores skill content in cache, evicting LRU entry if needed.
 */
function setCached(skillName: string, content: string): void {
  const now = Date.now();
  cache.set(skillName, { content, loadedAt: now, accessedAt: now });
  evictLRU();
}

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

/**
 * Reads skill prompt content from disk for a registered skill.
 * Returns the prompt content or null if the skill has no source file
 * or the file is unreadable.
 */
async function readSkillContent(
  skill: SkillDefinition,
): Promise<string | null> {
  // Skill already has its prompt loaded (programmatic registration)
  if (skill.prompt) {
    return skill.prompt;
  }

  // Disk-based skill: read from sourcePath
  if (!skill.sourcePath) return null;

  try {
    const raw = await fs.readFile(skill.sourcePath, "utf-8");
    const parsed = parseSkillFrontmatter(raw);
    return parsed?.body ?? raw;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn(
      `[SkillLoader] Failed to read skill file "${skill.sourcePath}":`,
      message,
    );
    return null;
  }
}

/**
 * Loads a skill's prompt content on demand, using the LRU cache.
 * Returns the prompt string or null if the skill is not found or unreadable.
 *
 * @param skillName - Registered skill name to load
 */
export async function loadSkillOnDemand(
  skillName: string,
): Promise<string | null> {
  // Check cache first
  const cached = getCached(skillName);
  if (cached !== undefined) return cached;

  // Lookup in registry
  const skill = getSkillByName(skillName);
  if (!skill) {
    logger.debug(`[SkillLoader] Skill "${skillName}" not found in registry`);
    return null;
  }

  const content = await readSkillContent(skill);
  if (content === null) return null;

  setCached(skillName, content);

  logger.debug(`[SkillLoader] Loaded skill "${skillName}"`, {
    cached: cache.size,
    fromDisk: !!skill.sourcePath,
  });

  return content;
}

// ---------------------------------------------------------------------------
// XML Escaping
// ---------------------------------------------------------------------------

/**
 * Escapes a string for safe inclusion in an XML attribute value.
 * Prevents prompt injection via skill names or descriptions that
 * contain XML-special characters.
 */
function escapeXmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Escapes a string for safe inclusion in XML body content.
 * Prevents skill prompt content from breaking the wrapping XML tags.
 */
function escapeXmlContent(value: string): string {
  // Only escape sequences that could close or break the surrounding tags
  return value
    .replace(/<\/skill>/gi, "&lt;/skill&gt;")
    .replace(/<\/technical_skills>/gi, "&lt;/technical_skills&gt;");
}

// ---------------------------------------------------------------------------
// Prompt Injection
// ---------------------------------------------------------------------------

/**
 * Loads a skill and injects its prompt content into a system prompt string.
 * The skill content is wrapped in `<skill name="...">` XML tags, matching
 * the existing skill-loader.ts convention.
 *
 * @param skillName - Skill to inject
 * @param systemPrompt - Base system prompt to augment
 * @returns Augmented system prompt (unchanged if skill not found)
 */
export async function injectSkillContext(
  skillName: string,
  systemPrompt: string,
): Promise<string> {
  const content = await loadSkillOnDemand(skillName);
  if (!content) return systemPrompt;

  const skill = getSkillByName(skillName);
  const escapedName = escapeXmlAttr(skillName);
  const description = skill?.description ?? "";
  const header = description
    ? `<skill name="${escapedName}" description="${escapeXmlAttr(description)}">`
    : `<skill name="${escapedName}">`;

  const skillBlock = `${header}\n${escapeXmlContent(content)}\n</skill>`;

  return `${systemPrompt}\n\n<technical_skills>\n${skillBlock}\n</technical_skills>`;
}

/**
 * Loads multiple skills and injects them all into a system prompt.
 * More efficient than calling injectSkillContext in a loop because
 * it batches the loading and wraps all skills in a single
 * `<technical_skills>` block.
 *
 * @param skillNames - Skills to inject
 * @param systemPrompt - Base system prompt to augment
 * @returns Augmented system prompt
 */
export async function injectMultipleSkills(
  skillNames: string[],
  systemPrompt: string,
): Promise<string> {
  if (skillNames.length === 0) return systemPrompt;

  const unique = Array.from(new Set(skillNames));
  const blocks: string[] = [];

  for (const name of unique) {
    const content = await loadSkillOnDemand(name);
    if (!content) continue;

    const skill = getSkillByName(name);
    const escapedName = escapeXmlAttr(name);
    const description = skill?.description ?? "";
    const header = description
      ? `<skill name="${escapedName}" description="${escapeXmlAttr(description)}">`
      : `<skill name="${escapedName}">`;

    blocks.push(`${header}\n${escapeXmlContent(content)}\n</skill>`);
  }

  if (blocks.length === 0) return systemPrompt;

  return `${systemPrompt}\n\n<technical_skills>\n${blocks.join("\n\n")}\n</technical_skills>`;
}

// ---------------------------------------------------------------------------
// Cache Management
// ---------------------------------------------------------------------------

/**
 * Returns the current cache size.
 */
export function getCacheSize(): number {
  return cache.size;
}

/**
 * Clears the skill content cache. Intended for testing or when
 * skill files have been modified on disk.
 */
export function clearSkillCache(): void {
  cache.clear();
}

/**
 * Removes a specific skill from the cache, forcing a re-read on
 * next access. Useful when a skill file is known to have changed.
 */
export function invalidateCachedSkill(skillName: string): void {
  cache.delete(skillName);
}
