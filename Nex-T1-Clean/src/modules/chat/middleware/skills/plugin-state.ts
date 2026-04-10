/**
 * Nex Plugin State Machine -- Transitions, Hooks, and MCP Server Queries
 *
 * Manages the state machine for plugin lifecycle transitions and
 * provides query functions for active plugin hooks and MCP servers.
 */

import { logger } from "@/lib/logger";

import type {
  PluginInstance,
  PluginState,
  PluginMcpServer,
  PluginHooksConfig,
} from "./types";

// ---------------------------------------------------------------------------
// State Transitions
// ---------------------------------------------------------------------------

/**
 * Valid state transitions. A plugin can only move between states along
 * these edges. The "error" state can be reached from any non-terminal
 * state, and "disabled" can be reached from "active" or "error".
 */
export const VALID_TRANSITIONS: ReadonlyMap<PluginState, readonly PluginState[]> =
  new Map<PluginState, readonly PluginState[]>([
    ["installed", ["loaded", "error"]],
    ["loaded", ["active", "error"]],
    ["active", ["disabled", "error"]],
    ["disabled", ["loaded", "error"]],
    ["error", ["disabled"]],
  ]);

/**
 * Transitions a plugin to a new state. Returns false if the transition
 * is invalid according to the state machine definition.
 */
export function transitionState(
  instance: PluginInstance,
  newState: PluginState,
  error?: string,
): boolean {
  const oldState = instance.state;
  const allowed = VALID_TRANSITIONS.get(oldState);

  if (!allowed || !allowed.includes(newState)) {
    logger.warn("[PluginManager] Invalid state transition", {
      pluginId: instance.definition.id,
      from: oldState,
      to: newState,
    });
    return false;
  }

  instance.state = newState;
  instance.error = error;
  instance.lastTransitionAt = Date.now();

  logger.debug("[PluginManager] State transition", {
    pluginId: instance.definition.id,
    from: oldState,
    to: newState,
    error,
  });

  return true;
}

// ---------------------------------------------------------------------------
// Hook Integration
// ---------------------------------------------------------------------------

/**
 * Collects all hook configurations from active plugins. These should be
 * merged into the middleware dispatcher's config when building the
 * effective hooks configuration.
 *
 * @param plugins - The plugin instance map to query
 * @returns Array of [pluginId, hooksConfig] tuples for active plugins
 */
export function getActivePluginHooks(
  plugins: ReadonlyMap<string, PluginInstance>,
): Array<[string, PluginHooksConfig]> {
  const result: Array<[string, PluginHooksConfig]> = [];

  for (const instance of plugins.values()) {
    if (instance.state !== "active") continue;
    if (!instance.definition.hooks) continue;

    result.push([instance.definition.id, instance.definition.hooks]);
  }

  return result;
}

// ---------------------------------------------------------------------------
// MCP Server Integration
// ---------------------------------------------------------------------------

/**
 * Collects all MCP server configurations from active plugins. These should
 * be passed to the MCP client manager for connection establishment.
 *
 * @param plugins - The plugin instance map to query
 * @returns Array of MCP server configs with their source plugin ID
 */
export function getActivePluginMcpServers(
  plugins: ReadonlyMap<string, PluginInstance>,
): Array<{ pluginId: string; server: PluginMcpServer }> {
  const result: Array<{ pluginId: string; server: PluginMcpServer }> = [];

  for (const instance of plugins.values()) {
    if (instance.state !== "active") continue;
    if (!instance.definition.mcpServers) continue;

    for (const server of instance.definition.mcpServers) {
      result.push({ pluginId: instance.definition.id, server });
    }
  }

  return result;
}
