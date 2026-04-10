/**
 * Nex Skill Scanner -- Disk-based Discovery and Frontmatter Parsing
 */

import fs from "fs/promises";
import path from "path";

import { logger } from "@/lib/logger";

import type { SkillDefinition, SkillFrontmatter } from "./types";
import { registerSkill } from "./registry";

// ---------------------------------------------------------------------------
// Frontmatter Parsing
// ---------------------------------------------------------------------------

/** Strips surrounding YAML quotes (single or double) from a value. */
function stripQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/** Parses YAML-style frontmatter and body from a markdown string. */
export function parseFrontmatter(
  content: string,
): { frontmatter: SkillFrontmatter; body: string } | null {
  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---(?:\n([\s\S]*))?$/);
  if (!match) return null;

  const [, yamlBlock, body] = match;
  const builder: Record<string, unknown> = {};

  for (const line of (yamlBlock ?? "").split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx < 0) continue;

    const key = line.slice(0, colonIdx).trim();
    const rawValue = line.slice(colonIdx + 1).trim();

    if (!key) continue;

    if (key === "tags" || key === "allowedTools") {
      builder[key] = rawValue
        .replace(/^\[|\]$/g, "")
        .split(",")
        .map((s) => stripQuotes(s.trim()))
        .filter(Boolean);
      continue;
    }

    if (rawValue === "true") {
      builder[key] = true;
      continue;
    }
    if (rawValue === "false") {
      builder[key] = false;
      continue;
    }

    builder[key] = stripQuotes(rawValue);
  }

  if (typeof builder.name !== "string" || !builder.name) return null;
  if (typeof builder.description !== "string" || !builder.description) return null;
  if (
    builder.context !== undefined &&
    builder.context !== "inline" &&
    builder.context !== "fork"
  ) {
    return null;
  }

  const frontmatter: SkillFrontmatter = {
    name: builder.name,
    description: builder.description,
    ...(Array.isArray(builder.tags) ? { tags: builder.tags as string[] } : {}),
    ...(typeof builder.model === "string" ? { model: builder.model } : {}),
    ...(typeof builder.userInvocable === "boolean"
      ? { userInvocable: builder.userInvocable }
      : {}),
    ...(Array.isArray(builder.allowedTools)
      ? { allowedTools: builder.allowedTools as string[] }
      : {}),
    ...(typeof builder.whenToUse === "string"
      ? { whenToUse: builder.whenToUse }
      : {}),
    ...(builder.context === "inline" || builder.context === "fork"
      ? { context: builder.context }
      : {}),
  };

  return {
    frontmatter,
    body: body ?? "",
  };
}

// ---------------------------------------------------------------------------
// Directory Scanning
// ---------------------------------------------------------------------------

/** Scans a single directory for skill .md files and SKILL.md subdirectories. */
async function discoverSkillsInDirectory(
  dirPath: string,
): Promise<SkillDefinition[]> {
  const discovered: SkillDefinition[] = [];
  const resolvedDir = path.resolve(dirPath);

  let entries: string[];
  try {
    entries = await fs.readdir(resolvedDir);
  } catch {
    return discovered;
  }

  for (const entry of entries) {
    if (entry.includes("..") || entry.includes(path.sep)) continue;
    const fullPath = path.join(resolvedDir, entry);
    if (!fullPath.startsWith(resolvedDir + path.sep)) continue;

    let stat;
    try {
      stat = await fs.lstat(fullPath);
    } catch {
      continue;
    }

    if (stat.isSymbolicLink()) continue;

    if (stat.isDirectory()) {
      const skillFile = path.join(fullPath, "SKILL.md");
      try {
        const content = await fs.readFile(skillFile, "utf-8");
        const parsed = parseFrontmatter(content);
        if (parsed) {
          discovered.push({
            ...parsed.frontmatter,
            prompt: parsed.body,
            sourcePath: skillFile,
          });
        }
      } catch {
        /* no SKILL.md in subdirectory */
      }
    } else if (stat.isFile() && entry.endsWith(".md")) {
      try {
        const content = await fs.readFile(fullPath, "utf-8");
        const parsed = parseFrontmatter(content);
        if (parsed) {
          discovered.push({
            ...parsed.frontmatter,
            prompt: parsed.body,
            sourcePath: fullPath,
          });
        }
      } catch {
        /* unreadable file */
      }
    }
  }

  return discovered;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Scans directories for skill files and registers them (last-write-wins). */
export async function discoverSkills(
  directories: string[],
): Promise<number> {
  let registered = 0;

  for (const dir of directories) {
    const skills = await discoverSkillsInDirectory(dir);
    for (const skill of skills) {
      if (registerSkill(skill)) {
        registered++;
      }
    }
  }

  logger.debug("[SkillRegistry] Discovery complete", {
    directories: directories.length,
    registered,
    total: registered,
  });

  return registered;
}
