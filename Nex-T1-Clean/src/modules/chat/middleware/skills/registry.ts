/**
 * Nex Skill Registry -- Registration, Lookup, and Deferred Tools
 *
 * In-memory registry for skill definitions with bounded capacity.
 * Supports:
 * - Programmatic registration
 * - Name-based lookup
 * - Tag/intent-based contextual selection
 * - Deferred tool listing for on-demand loading
 *
 * Disk-based discovery is in ./scanner.ts
 */

import { logger } from "@/lib/logger";

import type { SkillDefinition, DeferredTool } from "./types";
import { MAX_REGISTRY_SKILLS } from "./types";

// ---------------------------------------------------------------------------
// Internal State
// ---------------------------------------------------------------------------

const registry = new Map<string, SkillDefinition>();

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * Registers a skill definition in the in-memory registry.
 * Returns false if capacity is exceeded and the skill was not added.
 * Overwrites an existing skill with the same name.
 */
export function registerSkill(definition: SkillDefinition): boolean {
  if (!definition.name || !definition.description) {
    logger.warn("[SkillRegistry] Skipped skill with missing name or description");
    return false;
  }

  // Capacity check (allow overwrites of existing names)
  if (
    !registry.has(definition.name) &&
    registry.size >= MAX_REGISTRY_SKILLS
  ) {
    logger.warn(
      `[SkillRegistry] Capacity limit reached (${MAX_REGISTRY_SKILLS}), cannot register "${definition.name}"`,
    );
    return false;
  }

  registry.set(definition.name, definition);
  return true;
}

// ---------------------------------------------------------------------------
// Lookup
// ---------------------------------------------------------------------------

/**
 * Retrieves a skill by its unique name.
 */
export function getSkillByName(name: string): SkillDefinition | undefined {
  return registry.get(name);
}

/**
 * Returns all registered skill definitions (defensive copy).
 */
export function getAllSkills(): SkillDefinition[] {
  return Array.from(registry.values());
}

/**
 * Selects skills whose tags or whenToUse hint match the given criteria.
 * Scoring is simple: each matching tag adds 1 point, a whenToUse substring
 * match on the intent string adds 2 points. Results are sorted by score
 * descending and capped at `limit`.
 *
 * @param tags - Tags to match against skill tags
 * @param intent - Free-text intent string for whenToUse matching
 * @param limit - Maximum number of results (default: 10)
 */
export function getSkillsForContext(
  tags: string[],
  intent?: string,
  limit = 10,
): SkillDefinition[] {
  const tagSet = new Set(tags.map((t) => t.toLowerCase()));
  const intentLower = intent?.toLowerCase() ?? "";

  const scored: Array<{ skill: SkillDefinition; score: number }> = [];

  for (const skill of registry.values()) {
    let score = 0;

    // Tag matching
    if (skill.tags) {
      for (const tag of skill.tags) {
        if (tagSet.has(tag.toLowerCase())) {
          score += 1;
        }
      }
    }

    // whenToUse intent matching
    if (intentLower && skill.whenToUse) {
      const whenLower = skill.whenToUse.toLowerCase();
      if (whenLower.includes(intentLower) || intentLower.includes(whenLower)) {
        score += 2;
      }
    }

    if (score > 0) {
      scored.push({ skill, score });
    }
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.skill);
}

// ---------------------------------------------------------------------------
// Deferred Tools
// ---------------------------------------------------------------------------

/**
 * Collects all tools declared by registered skills into a flat list of
 * deferred tool stubs. These are used by the ToolSearch mechanism for
 * on-demand discovery.
 */
export function getDeferredTools(): DeferredTool[] {
  const tools: DeferredTool[] = [];

  for (const skill of registry.values()) {
    if (!skill.tools || skill.tools.length === 0) continue;

    for (const toolName of skill.tools) {
      tools.push({
        name: toolName,
        description: `Tool provided by skill "${skill.name}": ${skill.description}`,
        skillName: skill.name,
        searchHint: skill.whenToUse,
      });
    }
  }

  return tools;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/**
 * Returns the current registry size.
 */
export function getRegistrySize(): number {
  return registry.size;
}

/**
 * Clears the entire registry. Intended for testing or full reset scenarios.
 */
export function clearRegistry(): void {
  registry.clear();
}
