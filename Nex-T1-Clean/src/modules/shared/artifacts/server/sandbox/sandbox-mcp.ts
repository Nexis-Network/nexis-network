import {
  checkUserMcpConfig,
  validateMcpForSandbox,
} from "@/lib/mcp/registry";
import type { SandboxRequest } from "@/app/api/sandbox/route.schema";
import { createClient as createSupabaseServerClient } from "@/server/services/supabase/server";

type SandboxSupabaseClient = NonNullable<
  Awaited<ReturnType<typeof createSupabaseServerClient>>
>;

type McpConfigEntry = {
  installCmd: string;
  runCmd: string;
  env?: Record<string, string>;
};

export type SandboxMcpResolution =
  | {
      ok: true;
      config: Record<string, McpConfigEntry>;
    }
  | {
      ok: false;
      errors: Array<{ name: string; error: string }>;
    };

export async function resolveSandboxMcpConfig(args: {
  supabase: SandboxSupabaseClient;
  userId: string;
  mcpServers: SandboxRequest["mcpServers"];
}): Promise<SandboxMcpResolution> {
  const mcpConfig: Record<string, McpConfigEntry> = {};
  const mcpErrors: Array<{ name: string; error: string }> = [];

  for (const server of args.mcpServers) {
    if (server.mode === "registry") {
      const validation = await validateMcpForSandbox(
        args.supabase,
        server.registryId,
      );

      if (!validation?.valid) {
        mcpErrors.push({
          name: server.name,
          error:
            validation?.error_message ??
            `MCP server ${server.registryId} not found or not sandbox-compatible`,
        });
        continue;
      }

      if (validation.required_vars?.length) {
        const configCheck = await checkUserMcpConfig(
          args.supabase,
          args.userId,
          server.registryId,
        );

        if (!configCheck?.has_all_required) {
          mcpErrors.push({
            name: server.name,
            error: `Missing required environment variables: ${
              configCheck?.missing_vars?.join(", ") ??
              validation.required_vars.join(", ")
            }`,
          });
          continue;
        }

        const { data: userConfig } = await args.supabase
          .from("user_mcp_config")
          .select("config_overrides")
          .eq("user_id", args.userId)
          .eq("mcp_id", server.registryId)
          .single();

        mcpConfig[server.name] = {
          installCmd: validation.install_cmd ?? "",
          runCmd: validation.run_cmd ?? "",
          env: userConfig?.config_overrides as Record<string, string> | undefined,
        };
        continue;
      }

      mcpConfig[server.name] = {
        installCmd: validation.install_cmd ?? "",
        runCmd: validation.run_cmd ?? "",
      };
      continue;
    }

    mcpConfig[server.name] = {
      installCmd: `npm install ${server.npmPackage}`,
      runCmd: server.runArgs?.length
        ? `${server.runCommand ?? "npx"} ${server.runArgs.join(" ")}`
        : `npx -y ${server.npmPackage}`,
    };
  }

  if (mcpErrors.length > 0) {
    return { ok: false, errors: mcpErrors };
  }

  return { ok: true, config: mcpConfig };
}
