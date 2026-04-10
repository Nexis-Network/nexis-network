/**
 * Nex Skill & Plugin System -- Type Definitions
 *
 * Defines the shape of skills, plugins, deferred tools, and their lifecycle
 * states. Skills are markdown-based capability modules; plugins are bundles
 * that group skills, hooks, and MCP server configs under a single identity.
 */

// ---------------------------------------------------------------------------
// Skill Frontmatter (parsed from markdown skill files)
// ---------------------------------------------------------------------------

/**
 * Frontmatter fields parsed from a `SKILL.md` or `*.skill.md` file.
 * Uses a YAML block delimited by `---`.
 */
export type SkillFrontmatter = {
  readonly name: string;
  readonly description: string;
  readonly tags?: readonly string[];
  readonly model?: string;
  readonly userInvocable?: boolean;
  readonly allowedTools?: readonly string[];
  readonly whenToUse?: string;
  readonly context?: "inline" | "fork";
};

// ---------------------------------------------------------------------------
// Skill Definition
// ---------------------------------------------------------------------------

/**
 * A fully resolved skill definition, either parsed from disk or registered
 * programmatically. This is the canonical in-memory representation.
 */
export type SkillDefinition = {
  /** Unique skill identifier (kebab-case). */
  readonly name: string;
  /** Human-readable description shown in system prompts and search results. */
  readonly description: string;
  /** Markdown prompt content injected into context when the skill is active. */
  readonly prompt: string;
  /** Tools this skill provides or requires. */
  readonly tools?: readonly string[];
  /** Model override when this skill is active. */
  readonly model?: string;
  /** Whether users can invoke this skill directly (default: true). */
  readonly userInvocable?: boolean;
  /** Tags for relevance-based selection. */
  readonly tags?: readonly string[];
  /** Hint for when the system should auto-select this skill. */
  readonly whenToUse?: string;
  /** Execution context: inline within current turn or forked subagent. */
  readonly context?: "inline" | "fork";
  /** Absolute path of the source file (undefined for programmatic skills). */
  readonly sourcePath?: string;
  /** Plugin that owns this skill, if any. */
  readonly pluginId?: string;
};

// ---------------------------------------------------------------------------
// Deferred Tool (ToolSearch pattern)
// ---------------------------------------------------------------------------

/**
 * A tool that is known to exist but not yet loaded into the active tool set.
 * The ToolSearch mechanism uses these stubs to let the model discover and
 * request on-demand loading.
 */
export type DeferredTool = {
  /** Tool name (must be unique across all deferred and active tools). */
  readonly name: string;
  /** Brief description for search/matching purposes. */
  readonly description: string;
  /** Skill that provides this tool. */
  readonly skillName: string;
  /** Optional search hint for keyword relevance scoring. */
  readonly searchHint?: string;
};

// ---------------------------------------------------------------------------
// Plugin Definition & State
// ---------------------------------------------------------------------------

/** Plugin lifecycle states. */
export type PluginState =
  | "installed"
  | "loaded"
  | "active"
  | "disabled"
  | "error";

/** Hook configuration shape (reuses the middleware hook types). */
export type PluginHooksConfig = {
  /** Hook event name -> matcher arrays, same shape as HooksConfig. */
  readonly [event: string]: ReadonlyArray<{
    matcher?: string;
    hooks: ReadonlyArray<{
      type: "command" | "http" | "prompt";
      [key: string]: unknown;
    }>;
  }>;
};

/** MCP server config provided by a plugin (matches McpServerConfig shape). */
export type PluginMcpServer = {
  readonly name: string;
  readonly transport: "stdio" | "sse" | "http";
  readonly command?: string;
  readonly args?: readonly string[];
  readonly url?: string;
  readonly headers?: Readonly<Record<string, string>>;
  readonly env?: Readonly<Record<string, string>>;
};

/**
 * A plugin bundles skills, hooks, and MCP servers under a single identity.
 * Plugins are the unit of installation, activation, and deactivation.
 */
export type PluginDefinition = {
  /** Unique plugin identifier (reverse-domain or kebab-case). */
  readonly id: string;
  /** Human-readable name. */
  readonly name: string;
  /** Semantic version string. */
  readonly version: string;
  /** Description for discovery. */
  readonly description?: string;
  /** Skills provided by this plugin. */
  readonly skills: readonly SkillDefinition[];
  /** Hook configurations contributed by this plugin. */
  readonly hooks?: PluginHooksConfig;
  /** MCP servers contributed by this plugin. */
  readonly mcpServers?: readonly PluginMcpServer[];
};

/**
 * Runtime state of an installed plugin.
 */
export type PluginInstance = {
  readonly definition: PluginDefinition;
  state: PluginState;
  /** Error message when state is "error". */
  error?: string;
  /** Timestamp of last state transition. */
  lastTransitionAt: number;
};

// ---------------------------------------------------------------------------
// Registry Capacity Limits
// ---------------------------------------------------------------------------

export const MAX_REGISTRY_SKILLS = 500;
export const MAX_CACHE_ENTRIES = 100;
export const MAX_PLUGINS = 50;
