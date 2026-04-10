import { Sandbox } from "@e2b/code-interpreter";
import type { SandboxRequest } from "@/app/api/sandbox/route.schema";
import { DEX_TEMPLATE } from "@/lib/templates/dex-template";
import { SOLANA_RUST_TEMPLATE } from "@/lib/templates/solana-rust-template";
import { SOLIDITY_OZ_TEMPLATE } from "@/lib/templates/solidity-oz-template";
import { UNISWAP_TEMPLATE } from "@/lib/templates/uniswap-template";
import { WEB3_STARTER_TEMPLATE } from "@/lib/templates/web3-starter";
import { getErrorMessage } from "@/lib/utils/error";
import { logger } from "@/lib/logger";
import {
  buildSandboxPreviewUrl,
  getLatestSandboxForUser,
  getSandboxTtlSeconds,
  registerSandboxOwnership,
} from "@/server/services/e2b/sandbox-session";
import { createClient as createSupabaseServerClient } from "@/server/services/supabase/server";
import { logSandboxAudit } from "./sandbox-audit";
import {
  checkSandboxRateLimit,
  getConcurrentSandboxLimit,
  trackActiveSandbox,
} from "./sandbox-rate-limit";
import { resolveSandboxMcpConfig } from "./sandbox-mcp";

type SandboxSupabaseClient = NonNullable<
  Awaited<ReturnType<typeof createSupabaseServerClient>>
>;

const TEMPLATES: Record<string, Array<{ name: string; content?: string }>> = {
  base: WEB3_STARTER_TEMPLATE,
  web3: WEB3_STARTER_TEMPLATE,
  dex: DEX_TEMPLATE,
  uniswap: UNISWAP_TEMPLATE,
  "solidity-oz": SOLIDITY_OZ_TEMPLATE,
  "solana-rust": SOLANA_RUST_TEMPLATE,
};

const WEB_DEV_SERVER_TEMPLATES = new Set([
  "base",
  "web3",
  "dex",
  "uniswap",
  "nextjs-developer",
]);

export type CreateSandboxSessionResult =
  | {
      ok: true;
      data: {
        sandboxId: string;
        previewUrl: string;
        reused?: boolean;
        files?: Array<{ name: string; content: string; type: string }>;
      };
    }
  | {
      ok: false;
      status: number;
      code: string;
      message: string;
      details?: UntypedJson;
      headers?: Record<string, string>;
    };

export async function createSandboxSession(args: {
  clientIp: string;
  e2bApiKey: string;
  orgId: string | null;
  request: SandboxRequest;
  supabase: SandboxSupabaseClient;
  userId: string;
}): Promise<CreateSandboxSessionResult> {
  const rateLimit = await checkSandboxRateLimit(args.userId);
  if (!rateLimit.allowed) {
    return {
      ok: false,
      status: 429,
      code: "RATE_LIMIT_EXCEEDED",
      message: "Rate limit exceeded",
      details: {
        retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
      },
      headers: {
        "X-RateLimit-Remaining": String(rateLimit.remaining),
        "X-RateLimit-Reset": String(rateLimit.resetAt),
      },
    };
  }

  await logSandboxAudit({
    userId: args.userId,
    orgId: args.orgId,
    action: "create",
    githubRepoUrl: args.request.githubRepoUrl,
    dependencies: args.request.dependencies,
    fileCount: args.request.files.length,
    timestamp: new Date().toISOString(),
    clientIp: args.clientIp,
  });

  try {
    const existingSandboxId = await getLatestSandboxForUser(args.userId);
    if (existingSandboxId) {
      try {
        const existingSandbox = await Sandbox.connect(existingSandboxId, {
          apiKey: args.e2bApiKey,
        });
        const previewUrl = buildSandboxPreviewUrl({
          sandboxId: existingSandbox.sandboxId,
          sandboxDomain: (existingSandbox as { sandboxDomain?: string })
            .sandboxDomain,
        });

        await registerSandboxOwnership(args.userId, existingSandbox.sandboxId);
        return {
          ok: true,
          data: {
            sandboxId: existingSandbox.sandboxId,
            previewUrl,
            reused: true,
          },
        };
      } catch (error) {
        logger.warn(
          "[sandbox] Existing sandbox unavailable, creating a new one",
          getErrorMessage(error, "sandbox_connect_failed"),
        );
      }
    }

    const mcpResolution = await resolveSandboxMcpConfig({
      supabase: args.supabase,
      userId: args.userId,
      mcpServers: args.request.mcpServers,
    });
    if (!mcpResolution.ok) {
      return {
        ok: false,
        status: 400,
        code: "MCP_VALIDATION_FAILED",
        message: "MCP server validation failed",
        details: mcpResolution.errors,
      };
    }

    const sandboxOpts: Record<string, UntypedJson> = {
      apiKey: args.e2bApiKey,
      timeout: getSandboxTtlSeconds(),
    };
    if (args.request.template === "nextjs-developer") {
      sandboxOpts.template = "nextjs-developer";
    }
    if (Object.keys(mcpResolution.config).length > 0) {
      sandboxOpts.mcp = Object.fromEntries(
        Object.entries(mcpResolution.config).map(([name, config]) => [
          name,
          {
            installCmd: config.installCmd,
            runCmd: config.runCmd,
            ...(config.env && Object.keys(config.env).length > 0
              ? { env: config.env }
              : {}),
          },
        ]),
      );
    }

    const sandbox = await Sandbox.create(sandboxOpts);
    const sandboxId = sandbox.sandboxId;
    const previewUrl = buildSandboxPreviewUrl({
      sandboxId,
      sandboxDomain: (sandbox as { sandboxDomain?: string }).sandboxDomain,
    });

    const canProceed = await trackActiveSandbox(args.userId, sandboxId);
    if (!canProceed) {
      await sandbox.kill().catch(() => {});
      return {
        ok: false,
        status: 429,
        code: "RATE_LIMIT_EXCEEDED",
        message: `Concurrent sandbox limit reached (max ${getConcurrentSandboxLimit()})`,
      };
    }

    await registerSandboxOwnership(args.userId, sandboxId);

    if (args.request.enableDocker) {
      await sandbox.commands.run("sudo dockerd", {
        background: true,
        timeoutMs: 10000,
      });
    }

    if (args.request.githubRepoUrl) {
      await logSandboxAudit({
        userId: args.userId,
        orgId: args.orgId,
        action: "clone_repo",
        sandboxId,
        githubRepoUrl: args.request.githubRepoUrl,
        timestamp: new Date().toISOString(),
        clientIp: args.clientIp,
      });

      await sandbox.commands.run(
        `git clone --depth 1 --single-branch ${args.request.githubRepoUrl} .`,
        { timeoutMs: 120000 },
      );
    }

    const templateFiles =
      args.request.template === "nextjs-developer"
        ? []
        : TEMPLATES[args.request.template] || TEMPLATES.base;
    const filesMap = new Map<string, { name: string; content?: string }>();
    templateFiles.forEach((file) => filesMap.set(file.name, file));
    args.request.files.forEach((file) => {
      filesMap.set(file.path, { name: file.path, content: file.content });
    });

    const filesToWrite = Array.from(filesMap.values());
    const hasPackageJson =
      args.request.template === "nextjs-developer" ||
      filesToWrite.some((file) => file.name === "package.json");

    if (filesToWrite.length > 0) {
      await logSandboxAudit({
        userId: args.userId,
        orgId: args.orgId,
        action: "write_files",
        sandboxId,
        fileCount: filesToWrite.length,
        timestamp: new Date().toISOString(),
        clientIp: args.clientIp,
      });

      await Promise.all(
        filesToWrite.map(async (file) => {
          const dir = file.name.substring(0, file.name.lastIndexOf("/"));
          if (dir) {
            try {
              await sandbox.files.makeDir(dir);
            } catch {
              // Directory already exists.
            }
          }
          if (file.content) {
            await sandbox.files.write(file.name, file.content);
          }
        }),
      );
    }

    if (hasPackageJson) {
      if (args.request.dependencies.length > 0) {
        await logSandboxAudit({
          userId: args.userId,
          orgId: args.orgId,
          action: "install_deps",
          sandboxId,
          dependencies: args.request.dependencies,
          timestamp: new Date().toISOString(),
          clientIp: args.clientIp,
        });

        await sandbox.commands.run(
          `npm install --no-audit --no-fund ${args.request.dependencies.join(" ")}`,
          { timeoutMs: 180000 },
        );
      } else {
        await sandbox.commands.run("npm install --no-audit --no-fund", {
          timeoutMs: 180000,
        });
      }
    }

    await runTemplateSetupHooks(sandbox, args.request.template);

    if (WEB_DEV_SERVER_TEMPLATES.has(args.request.template)) {
      await sandbox.commands.run("npm run dev", { background: true });
    }

    return {
      ok: true,
      data: {
        sandboxId,
        previewUrl,
        files: await readInitialNextDeveloperFiles(sandbox, args.request.template),
      },
    };
  } catch (error) {
    logger.error("[sandbox] Error creating sandbox:", error);
    return {
      ok: false,
      status: 500,
      code: "INTERNAL_ERROR",
      message: getErrorMessage(error, "Unknown error"),
    };
  }
}

async function runTemplateSetupHooks(
  sandbox: Sandbox,
  template: SandboxRequest["template"],
) {
  if (template === "solidity-oz") {
    try {
      await sandbox.commands.run("npm run build", { timeoutMs: 180000 });
    } catch (error) {
      logger.warn(
        "[sandbox] Solidity template post-setup failed",
        getErrorMessage(error, "solidity_post_setup_failed"),
      );
    }
  }

  if (template === "solana-rust") {
    try {
      await sandbox.commands.run("cargo check --workspace", {
        timeoutMs: 180000,
      });
    } catch (error) {
      logger.warn(
        "[sandbox] Solana Rust template post-setup failed",
        getErrorMessage(error, "solana_post_setup_failed"),
      );
    }
  }
}

async function readInitialNextDeveloperFiles(
  sandbox: Sandbox,
  template: SandboxRequest["template"],
): Promise<Array<{ name: string; content: string; type: string }> | undefined> {
  if (template !== "nextjs-developer") {
    return undefined;
  }

  const filePaths = [
    "package.json",
    "app/page.tsx",
    "app/layout.tsx",
    "app/globals.css",
  ];
  const contents = await Promise.all(
    filePaths.map(async (path) => {
      try {
        const content = await sandbox.files.read(path);
        return { path, content };
      } catch {
        return null;
      }
    }),
  );

  const files = contents
    .filter((value): value is { path: string; content: string } => value !== null)
    .map((file) => ({
      name: file.path,
      content: file.content,
      type: "file",
    }));

  return files.length > 0 ? files : undefined;
}
