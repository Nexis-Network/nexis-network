/**
 * Nex Plugin Manager -- Install, Activate, Deactivate, Remove
 * State machine logic is in ./plugin-state.ts
 */

import { logger } from "@/lib/logger";

import type {
  PluginDefinition,
  PluginInstance,
  PluginHooksConfig,
  PluginMcpServer,
} from "./types";
import { MAX_PLUGINS } from "./types";
import { registerSkill } from "./registry";
import {
  transitionState,
  getActivePluginHooks as queryActivePluginHooks,
  getActivePluginMcpServers as queryActivePluginMcpServers,
} from "./plugin-state";

// ---------------------------------------------------------------------------
// Internal State
// ---------------------------------------------------------------------------

const plugins = new Map<string, PluginInstance>();

// ---------------------------------------------------------------------------
// Activation Helpers
// ---------------------------------------------------------------------------

/**
 * Registers all skills from a plugin into the skill registry.
 * Returns the count of successfully registered skills.
 */
function activatePluginSkills(plugin: PluginDefinition): number {
  let count = 0;
  for (const skill of plugin.skills) {
    const registered = registerSkill({
      ...skill,
      pluginId: plugin.id,
    });
    if (registered) count++;
  }
  return count;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Installs and activates a plugin, replacing any existing with same ID. */
export function installPlugin(pluginDef: PluginDefinition): boolean {
  if (!pluginDef.id || !pluginDef.name) {
    logger.warn("[PluginManager] Rejected plugin with missing id or name");
    return false;
  }

  // Capacity check (allow replacement of existing plugins)
  if (!plugins.has(pluginDef.id) && plugins.size >= MAX_PLUGINS) {
    logger.warn(
      `[PluginManager] Capacity limit reached (${MAX_PLUGINS}), cannot install "${pluginDef.id}"`,
    );
    return false;
  }

  // If replacing, deactivate existing first
  const existing = plugins.get(pluginDef.id);
  if (existing && existing.state === "active") {
    transitionState(existing, "disabled");
  }

  const instance: PluginInstance = {
    definition: pluginDef,
    state: "installed",
    lastTransitionAt: Date.now(),
  };

  plugins.set(pluginDef.id, instance);
  transitionState(instance, "loaded");

  // Activate: register skills
  try {
    const skillCount = activatePluginSkills(pluginDef);
    transitionState(instance, "active");

    logger.info("[PluginManager] Plugin activated", {
      pluginId: pluginDef.id,
      version: pluginDef.version,
      skills: skillCount,
      hooks: pluginDef.hooks ? Object.keys(pluginDef.hooks).length : 0,
      mcpServers: pluginDef.mcpServers?.length ?? 0,
    });

    return true;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    transitionState(instance, "error", message);
    logger.error("[PluginManager] Plugin activation failed", {
      pluginId: pluginDef.id,
      error: message,
    });
    return false;
  }
}

/** Deactivates a plugin without removing it. */
export function deactivatePlugin(pluginId: string): boolean {
  const instance = plugins.get(pluginId);
  if (!instance) {
    logger.warn(`[PluginManager] Plugin "${pluginId}" not found`);
    return false;
  }

  if (instance.state === "disabled") {
    return true; // Already disabled
  }

  const transitioned = transitionState(instance, "disabled");
  if (!transitioned) {
    logger.warn(`[PluginManager] Cannot deactivate plugin "${pluginId}" from state "${instance.state}"`);
    return false;
  }

  logger.info("[PluginManager] Plugin deactivated", { pluginId });
  return true;
}

/**
 * Removes a plugin entirely from the manager.
 */
export function removePlugin(pluginId: string): boolean {
  const existed = plugins.delete(pluginId);
  if (existed) {
    logger.info("[PluginManager] Plugin removed", { pluginId });
  }
  return existed;
}

/**
 * Returns all currently active plugins.
 */
export function getActivePlugins(): PluginInstance[] {
  return Array.from(plugins.values()).filter((p) => p.state === "active");
}

/**
 * Returns all installed plugins regardless of state.
 */
export function getAllPlugins(): PluginInstance[] {
  return Array.from(plugins.values());
}

/**
 * Returns a specific plugin by ID.
 */
export function getPlugin(pluginId: string): PluginInstance | undefined {
  return plugins.get(pluginId);
}

/**
 * Delegates to plugin-state to collect hooks from active plugins.
 */
export function getActivePluginHooks(): Array<[string, PluginHooksConfig]> {
  return queryActivePluginHooks(plugins);
}

/**
 * Delegates to plugin-state to collect MCP servers from active plugins.
 */
export function getActivePluginMcpServers(): Array<{
  pluginId: string;
  server: PluginMcpServer;
}> {
  return queryActivePluginMcpServers(plugins);
}

/**
 * Returns the current plugin count.
 */
export function getPluginCount(): number {
  return plugins.size;
}

/**
 * Clears all plugins. Intended for testing or full reset scenarios.
 */
export function clearPlugins(): void {
  plugins.clear();
}
