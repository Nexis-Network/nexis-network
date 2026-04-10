/**
 * Nex Skill & Plugin System
 *
 * Provides on-demand skill loading with deferred tool discovery and a
 * plugin lifecycle manager that bundles skills, hooks, and MCP servers.
 *
 * Subsystems:
 * 1. Types — Skill, plugin, and deferred tool type definitions
 * 2. Registry — Discovery, registration, and contextual lookup
 * 3. Loader — On-demand loading with LRU cache
 * 4. Plugin Manager — Plugin installation, activation, and deactivation
 */

// ── Types ────────────────────────────────────────────────────────────────

export type {
  SkillDefinition,
  SkillFrontmatter,
  DeferredTool,
  PluginDefinition,
  PluginInstance,
  PluginState,
  PluginHooksConfig,
  PluginMcpServer,
} from "./types";

export {
  MAX_REGISTRY_SKILLS,
  MAX_CACHE_ENTRIES,
  MAX_PLUGINS,
} from "./types";

// ── Registry ─────────────────────────────────────────────────────────────

export {
  registerSkill,
  getSkillByName,
  getAllSkills,
  getSkillsForContext,
  getDeferredTools,
  getRegistrySize,
  clearRegistry,
} from "./registry";

// ── Scanner ─────────────────────────────────────────────────────────────

export { discoverSkills } from "./scanner";

// ── Loader ───────────────────────────────────────────────────────────────

export {
  loadSkillOnDemand,
  injectSkillContext,
  injectMultipleSkills,
  getCacheSize,
  clearSkillCache,
  invalidateCachedSkill,
} from "./loader";

// ── Plugin Manager ───────────────────────────────────────────────────────

export {
  installPlugin,
  deactivatePlugin,
  removePlugin,
  getActivePlugins,
  getAllPlugins,
  getPlugin,
  getActivePluginHooks,
  getActivePluginMcpServers,
  getPluginCount,
  clearPlugins,
} from "./plugin-manager";
