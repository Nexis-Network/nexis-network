import { z } from "zod";
import {
  isMissingColumnError,
  isMissingRelationError,
  isMissingSchemaObjectError,
} from "@/lib/errors/supabase";

// ============================================================================
// External Registry Types (GitHub-hosted JSON)
// ============================================================================

export type MCPSource = {
  type: "docker" | "git" | "http" | "npm";
  location: string;
  command?: string;
};

export type MCPServer = {
  name: string;
  description: string;
  vendor: string;
  source: MCPSource;
  env?: Record<string, { description?: string; required?: boolean }>;
  tags?: string[];
  logoUrl?: string; // Optional enhancement for UI
};

export type MCPRegistry = {
  version: string;
  servers: MCPServer[];
};

// ============================================================================
// Supabase Registry Types (Sandbox-compatible servers)
// ============================================================================

/** Source type determines how the MCP server is deployed in sandbox */
export type McpSourceType = "npm" | "docker" | "binary" | "internal" | "github";

/** Security tier determines what operations are allowed */
export type McpSecurityTier = "readonly" | "standard" | "privileged";

/** Category for UI organization */
export type McpCategory =
  | "general"
  | "web3"
  | "defi"
  | "ai"
  | "devtools"
  | "data"
  | "productivity"
  | "security"
  | "integrations"
  | "social"
  | "analytics";

/** Optional environment variable with description */
export interface McpOptionalEnvVar {
  name: string;
  description: string;
  default?: string;
}

/** Full MCP registry record from Supabase */
export interface McpRegistryRecord {
  id: string;
  name: string;
  description: string | null;
  capabilities: string[] | null;
  status: "active" | "inactive" | "deprecated";
  is_public: boolean;
  publisher_id: string | null;

  // Sandbox deployment fields
  source_type: McpSourceType;
  npm_package: string | null;
  docker_image: string | null;
  repository_url: string | null;
  install_command: string | null;
  run_command: string;
  run_args: string[];
  required_env_vars: string[];
  optional_env_vars: McpOptionalEnvVar[];
  sandbox_compatible: boolean;

  // UI/metadata fields
  category: McpCategory;
  icon_url: string | null;
  docs_url: string | null;
  security_tier: McpSecurityTier;

  // Audit fields
  approved_by: string | null;
  approved_at: string | null;
  review_notes: string | null;

  created_at: string;
  updated_at: string;
}

/** Sandbox server view (filtered, public, active, sandbox-compatible) */
export interface McpSandboxServer {
  id: string;
  name: string;
  description: string | null;
  source_type: McpSourceType;
  npm_package: string | null;
  docker_image: string | null;
  repository_url: string | null;
  install_command: string | null;
  run_command: string;
  run_args: string[];
  required_env_vars: string[];
  optional_env_vars: McpOptionalEnvVar[];
  category: McpCategory;
  icon_url: string | null;
  docs_url: string | null;
  security_tier: McpSecurityTier;
  capabilities: string[] | null;
  status: string;
  publisher_name: string | null;
  publisher_verified: boolean | null;
}

/** Result of validate_mcp_for_sandbox function */
export interface McpSandboxValidation {
  valid: boolean;
  server_name: string | null;
  source_type: string | null;
  npm_package: string | null;
  install_cmd: string | null;
  run_cmd: string | null;
  required_vars: string[] | null;
  error_message: string | null;
}

/** Result of check_user_mcp_config function */
export interface McpUserConfigCheck {
  configured: boolean;
  missing_vars: string[];
  has_all_required: boolean;
}

// ============================================================================
// Zod Schemas for Sandbox Types
// ============================================================================

export const mcpSourceTypeSchema = z.enum(["npm", "docker", "binary", "internal", "github"]);
export const mcpSecurityTierSchema = z.enum(["readonly", "standard", "privileged"]);
export const mcpCategorySchema = z.enum([
  "general", "web3", "defi", "ai", "devtools",
  "data", "productivity", "security", "integrations", "social", "analytics"
]);

export const mcpOptionalEnvVarSchema = z.object({
  name: z.string(),
  description: z.string(),
  default: z.string().optional(),
});

export const mcpSandboxServerSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  source_type: mcpSourceTypeSchema,
  npm_package: z.string().nullable(),
  docker_image: z.string().nullable(),
  repository_url: z.string().nullable(),
  install_command: z.string().nullable(),
  run_command: z.string(),
  run_args: z.array(z.string()),
  required_env_vars: z.array(z.string()),
  optional_env_vars: z.array(mcpOptionalEnvVarSchema),
  category: mcpCategorySchema,
  icon_url: z.string().nullable(),
  docs_url: z.string().nullable(),
  security_tier: mcpSecurityTierSchema,
  capabilities: z.array(z.string()).nullable(),
  status: z.string(),
  publisher_name: z.string().nullable(),
  publisher_verified: z.boolean().nullable(),
});

export const mcpSandboxValidationSchema = z.object({
  valid: z.boolean(),
  server_name: z.string().nullable(),
  source_type: z.string().nullable(),
  npm_package: z.string().nullable(),
  install_cmd: z.string().nullable(),
  run_cmd: z.string().nullable(),
  required_vars: z.array(z.string()).nullable(),
  error_message: z.string().nullable(),
});

type McpSandboxPublisherRecord = {
  name: string | null;
  verified: boolean | null;
};

type McpSandboxPublisherLookupRow = McpSandboxPublisherRecord & {
  id: string;
};

type McpSandboxRegistryFallbackRow = Omit<
  McpSandboxServer,
  "publisher_name" | "publisher_verified"
> & {
  publisher_id: string | null;
};

type McpLegacyRegistryFallbackRow = {
  id: string;
  name: string;
  sre_url: string | null;
  transport: string | null;
  is_public: boolean | null;
  publisher_id: string | null;
};

const SANDBOX_SERVER_FALLBACK_SELECT = `
  id,
  name,
  description,
  source_type,
  npm_package,
  docker_image,
  repository_url,
  install_command,
  run_command,
  run_args,
  required_env_vars,
  optional_env_vars,
  category,
  icon_url,
  docs_url,
  security_tier,
  capabilities,
  status,
  publisher_id
`;

const LEGACY_SANDBOX_SERVER_FALLBACK_SELECT = `
  id,
  name,
  sre_url,
  transport,
  is_public,
  publisher_id
`;

function mapFallbackRowToSandboxServer(
  row: McpSandboxRegistryFallbackRow,
  publisherById: Map<string, McpSandboxPublisherRecord>
): McpSandboxServer {
  const publisher = row.publisher_id
    ? publisherById.get(row.publisher_id) ?? null
    : null;

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    source_type: row.source_type,
    npm_package: row.npm_package,
    docker_image: row.docker_image,
    repository_url: row.repository_url,
    install_command: row.install_command,
    run_command: row.run_command,
    run_args: row.run_args,
    required_env_vars: row.required_env_vars,
    optional_env_vars: row.optional_env_vars,
    category: row.category,
    icon_url: row.icon_url,
    docs_url: row.docs_url,
    security_tier: row.security_tier,
    capabilities: row.capabilities,
    status: row.status,
    publisher_name: publisher?.name ?? null,
    publisher_verified:
      typeof publisher?.verified === "boolean" ? publisher.verified : null,
  };
}

function mapLegacyFallbackRowToSandboxServer(
  row: McpLegacyRegistryFallbackRow,
  publisherById: Map<string, McpSandboxPublisherRecord>
): McpSandboxServer {
  const publisher = row.publisher_id
    ? publisherById.get(row.publisher_id) ?? null
    : null;
  const transport = row.transport?.trim().toLowerCase() || "sse";

  return {
    id: row.id,
    name: row.name,
    description: `Legacy internal MCP endpoint (${transport}).`,
    source_type: "internal",
    npm_package: null,
    docker_image: null,
    repository_url: null,
    install_command: null,
    run_command: row.sre_url ?? "remote",
    run_args: [],
    required_env_vars: [],
    optional_env_vars: [],
    category: "integrations",
    icon_url: null,
    docs_url: null,
    security_tier: "readonly",
    capabilities: null,
    status: "active",
    publisher_name: publisher?.name ?? null,
    publisher_verified:
      typeof publisher?.verified === "boolean" ? publisher.verified : null,
  };
}

async function getSandboxPublisherMap(
  supabase: SupabaseClient,
  rows: McpSandboxRegistryFallbackRow[]
): Promise<Map<string, McpSandboxPublisherRecord>> {
  const publisherIds = [...new Set(rows.flatMap((row) => row.publisher_id ?? []))];

  if (publisherIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("mcp_publishers")
    .select("id, name, verified")
    .in("id", publisherIds);

  if (error) {
    logger.warn(
      { error },
      "Error fetching sandbox publishers for mcp_registry fallback"
    );
    return new Map();
  }

  return new Map(
    ((data as McpSandboxPublisherLookupRow[] | null) ?? []).map((publisher) => [
      publisher.id,
      {
        name: publisher.name,
        verified:
          typeof publisher.verified === "boolean" ? publisher.verified : null,
      },
    ])
  );
}

async function getSandboxServersFromRegistryFallback(
  supabase: SupabaseClient
): Promise<McpSandboxServer[] | null> {
  const { data, error } = await supabase
    .from("mcp_registry")
    .select(SANDBOX_SERVER_FALLBACK_SELECT)
    .eq("sandbox_compatible", true)
    .eq("status", "active")
    .eq("is_public", true)
    .order("category")
    .order("name");

  if (error) {
    if (isMissingSchemaObjectError(error)) {
      logger.warn(
        { error },
        "Modern mcp_registry sandbox columns unavailable, falling back to legacy registry schema"
      );

      const { data: legacyData, error: legacyError } = await supabase
        .from("mcp_registry")
        .select(LEGACY_SANDBOX_SERVER_FALLBACK_SELECT)
        .eq("is_public", true)
        .order("name");

      if (legacyError) {
        logger.error(
          { error: legacyError },
          "Error fetching sandbox servers from legacy mcp_registry fallback"
        );
        return null;
      }

      const legacyRows =
        (legacyData as McpLegacyRegistryFallbackRow[] | null) ?? [];
      const publisherById = await getSandboxPublisherMap(
        supabase,
        legacyRows.map((row) => ({
          id: row.id,
          name: row.name,
          description: null,
          source_type: "internal",
          npm_package: null,
          docker_image: null,
          repository_url: null,
          install_command: null,
          run_command: row.sre_url ?? "remote",
          run_args: [],
          required_env_vars: [],
          optional_env_vars: [],
          category: "integrations",
          icon_url: null,
          docs_url: null,
          security_tier: "readonly",
          capabilities: null,
          status: "active",
          publisher_id: row.publisher_id,
        }))
      );

      return legacyRows.map((row) =>
        mapLegacyFallbackRowToSandboxServer(row, publisherById)
      );
    }

    logger.error(
      { error },
      "Error fetching sandbox servers from mcp_registry fallback"
    );
    return null;
  }

  const rows = (data as McpSandboxRegistryFallbackRow[] | null) ?? [];
  const publisherById = await getSandboxPublisherMap(supabase, rows);

  return rows.map((row) => mapFallbackRowToSandboxServer(row, publisherById));
}

const REGISTRY_URL =
  "https://raw.githubusercontent.com/Nexis-AI/Ultimate-Catalog-of-Web3-DeFi-Crypto-MCP-Servers-for-Secure-On-Chain-Operations/main/registry.json";

// Validation schema to ensure data integrity
const mcpServerSchema = z.object({
  name: z.string(),
  description: z.string(),
  vendor: z.string(),
  source: z.object({
    type: z.enum(["docker", "git", "http", "npm"]),
    location: z.string(),
    command: z.string().optional(),
  }),
  env: z.record(z.object({
    description: z.string().optional(),
    required: z.boolean().optional(),
  })).optional(),
  tags: z.array(z.string()).optional(),
  logoUrl: z.string().optional(),
});

const registrySchema = z.object({
  version: z.string(),
  servers: z.array(mcpServerSchema),
});

/**
 * Fetches the MCP registry with Next.js 16 caching.
 * Revalidates every 10 minutes.
 */
export async function getMcpRegistry(): Promise<MCPRegistry | null> {
  try {
    const res = await fetch(REGISTRY_URL, {
      next: {
        revalidate: 600, // 10 minutes
        tags: ["mcp-registry"],
      },
      headers: {
        "Accept": "application/json",
      },
    });

    if (!res.ok) {
      logger.error(`Failed to fetch MCP registry: ${res.statusText}`);
      return null;
    }

    const data = await res.json();
    const parsed = registrySchema.safeParse(data);

    if (!parsed.success) {
      logger.error("MCP Registry validation failed:", parsed.error);
      return null;
    }

    return parsed.data;
  } catch (error) {
    logger.error("Error fetching MCP registry:", error);
    return null;
  }
}

/**
 * Get a specific server by name
 */
export async function getMcpServer(name: string): Promise<MCPServer | null> {
  const registry = await getMcpRegistry();
  if (!registry) return null;
  return registry.servers.find((s) => s.name === name) ?? null;
}

// ============================================================================
// Supabase Sandbox Registry Functions
// ============================================================================

import { SupabaseClient } from "@supabase/supabase-js";

import { logger } from '@/lib/logger';
/**
 * Fetches all sandbox-compatible MCP servers from Supabase.
 * Uses the mcp_sandbox_servers view which filters for active, public, sandbox-compatible servers.
 */
export async function getSandboxServers(
  supabase: SupabaseClient
): Promise<McpSandboxServer[]> {
  const { data, error } = await supabase
    .from("mcp_sandbox_servers")
    .select("*")
    .order("category")
    .order("name");

  if (error) {
    logger.warn(
      { error },
      "Error fetching sandbox servers from view, falling back to mcp_registry"
    );
    const fallbackServers = await getSandboxServersFromRegistryFallback(
      supabase
    );
    if (fallbackServers) {
      return fallbackServers;
    }
    return [];
  }

  return data ?? [];
}

/**
 * Fetches sandbox-compatible servers by category.
 */
export async function getSandboxServersByCategory(
  supabase: SupabaseClient,
  category: McpCategory
): Promise<McpSandboxServer[]> {
  const { data, error } = await supabase
    .from("mcp_sandbox_servers")
    .select("*")
    .eq("category", category)
    .order("name");

  if (error) {
    if (
      isMissingColumnError(error) ||
      isMissingRelationError(error) ||
      isMissingSchemaObjectError(error)
    ) {
      const fallbackServers = await getSandboxServers(supabase);
      return fallbackServers.filter((server) => server.category === category);
    }

    logger.error(`Error fetching sandbox servers for category ${category}:`, error);
    return [];
  }

  return data ?? [];
}

/**
 * Fetches a single sandbox server by ID.
 * Returns null if the server doesn't exist or isn't sandbox-compatible.
 */
export async function getSandboxServerById(
  supabase: SupabaseClient,
  id: string
): Promise<McpSandboxServer | null> {
  const { data, error } = await supabase
    .from("mcp_sandbox_servers")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code !== "PGRST116") {
      if (
        isMissingColumnError(error) ||
        isMissingRelationError(error) ||
        isMissingSchemaObjectError(error)
      ) {
        const fallbackServers = await getSandboxServers(supabase);
        return fallbackServers.find((server) => server.id === id) ?? null;
      }
      logger.error(`Error fetching sandbox server ${id}:`, error);
    }
    return null;
  }

  return data;
}

/**
 * Fetches a single sandbox server by name.
 * Returns null if the server doesn't exist or isn't sandbox-compatible.
 */
export async function getSandboxServerByName(
  supabase: SupabaseClient,
  name: string
): Promise<McpSandboxServer | null> {
  const { data, error } = await supabase
    .from("mcp_sandbox_servers")
    .select("*")
    .eq("name", name)
    .single();

  if (error) {
    if (error.code !== "PGRST116") {
      if (
        isMissingColumnError(error) ||
        isMissingRelationError(error) ||
        isMissingSchemaObjectError(error)
      ) {
        const fallbackServers = await getSandboxServers(supabase);
        return (
          fallbackServers.find((server) => server.name === name) ?? null
        );
      }
      logger.error(`Error fetching sandbox server by name ${name}:`, error);
    }
    return null;
  }

  return data;
}

/**
 * Validates an MCP server for sandbox deployment using the database function.
 * Returns validation result including install and run commands.
 */
export async function validateMcpForSandbox(
  supabase: SupabaseClient,
  mcpId: string
): Promise<McpSandboxValidation | null> {
  const { data, error } = await supabase
    .rpc("validate_mcp_for_sandbox", { mcp_id: mcpId })
    .single();

  if (error) {
    logger.warn(`Error validating MCP server ${mcpId}, applying fallback validation`, error);

    const server = await getSandboxServerById(supabase, mcpId);
    if (!server) {
      return null;
    }

    const installCmd =
      server.install_command ??
      (server.source_type === "npm" && server.npm_package
        ? `npm install ${server.npm_package}`
        : null);
    const runCmd = [
      server.run_command,
      ...(Array.isArray(server.run_args) ? server.run_args : []),
    ]
      .filter((segment) => typeof segment === "string" && segment.length > 0)
      .join(" ")
      .trim();

    if (server.source_type === "internal" && !server.npm_package) {
      return {
        valid: false,
        server_name: server.name,
        source_type: server.source_type,
        npm_package: server.npm_package,
        install_cmd: installCmd,
        run_cmd: runCmd || null,
        required_vars: server.required_env_vars,
        error_message:
          "Sandbox deployment metadata is not available for this legacy MCP server yet.",
      };
    }

    return {
      valid: true,
      server_name: server.name,
      source_type: server.source_type,
      npm_package: server.npm_package,
      install_cmd: installCmd,
      run_cmd: runCmd || null,
      required_vars: server.required_env_vars,
      error_message: null,
    };
  }

  return data as McpSandboxValidation;
}

/**
 * Checks if a user has configured all required environment variables for an MCP server.
 */
export async function checkUserMcpConfig(
  supabase: SupabaseClient,
  userId: string,
  mcpId: string
): Promise<McpUserConfigCheck | null> {
  const { data, error } = await supabase
    .rpc("check_user_mcp_config", { p_user_id: userId, p_mcp_id: mcpId })
    .single();

  if (error) {
    logger.error(`Error checking user MCP config:`, error);
    return null;
  }

  return data as McpUserConfigCheck;
}

/**
 * Searches sandbox servers by name or description.
 */
export async function searchSandboxServers(
  supabase: SupabaseClient,
  query: string
): Promise<McpSandboxServer[]> {
  const { data, error } = await supabase
    .from("mcp_sandbox_servers")
    .select("*")
    .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
    .order("name")
    .limit(20);

  if (error) {
    if (
      isMissingColumnError(error) ||
      isMissingRelationError(error) ||
      isMissingSchemaObjectError(error)
    ) {
      const fallbackServers = await getSandboxServers(supabase);
      const normalizedQuery = query.trim().toLowerCase();
      return fallbackServers
        .filter((server) => {
          const haystacks = [server.name, server.description ?? ""]
            .map((value) => value.toLowerCase());
          return haystacks.some((value) => value.includes(normalizedQuery));
        })
        .slice(0, 20);
    }

    logger.error("Error searching sandbox servers:", error);
    return [];
  }

  return data ?? [];
}

/**
 * Gets the catalog view of sandbox servers grouped by category.
 * Useful for displaying in the MCP marketplace UI.
 */
export async function getSandboxCatalog(
  supabase: SupabaseClient
): Promise<Record<McpCategory, McpSandboxServer[]>> {
  const servers = await getSandboxServers(supabase);

  const catalog: Record<McpCategory, McpSandboxServer[]> = {
    general: [],
    web3: [],
    defi: [],
    ai: [],
    devtools: [],
    data: [],
    productivity: [],
    security: [],
    integrations: [],
    social: [],
    analytics: [],
  };

  for (const server of servers) {
    catalog[server.category].push(server);
  }

  return catalog;
}
