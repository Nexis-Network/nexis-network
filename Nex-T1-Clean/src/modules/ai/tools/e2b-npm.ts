/**
 * E2B NPM & Preview Tools
 *
 * Domain: AI Tools - Web Development
 * Responsibility: Manage NPM packages, run scripts, and generate preview URLs
 */

import { Sandbox } from "@e2b/code-interpreter";

import {
  createTool,
  createToolSchema,
  numberProp,
  stringProp,
  type ToolExecutionContext,
} from "./create-tool";
import {
  createStreamableValue,
  readStreamableValue,
} from "@/modules/ai/read-streamable-value";
import {
  DEFAULT_E2B_SANDBOX_HOME,
  DEFAULT_E2B_SANDBOX_USER,
} from "./e2b-runtime-constants";
import { resolveToolSandboxId } from "./e2b-tool-context";

type TerminalStreamPayload = {
  type: "terminal_stream";
  command: string;
  output: string;
  isComplete: boolean;
};

type StreamedCommandSummary = {
  stdout: string;
  stderr: string;
  background: boolean;
  pid?: number;
  error?: string;
};

type CommandEnv = Record<string, string>;

type NpmToolResult = {
  success: boolean;
  stdout: string;
  stderr: string;
  sandboxID: string;
  command: string;
  message?: string;
  pid?: number;
  error?: string;
};

type E2BNpmInput = {
  sandboxID?: string;
  cwd?: string;
};

type NpmInstallInput = E2BNpmInput & {
  packages?: string;
};

type NpmRunInput = E2BNpmInput & {
  script: string;
};

type PreviewUrlInput = E2BNpmInput & {
  port: number;
};

const BACKGROUND_NPM_SCRIPTS = new Set(["dev", "start"]);
const BACKGROUND_STARTUP_DELAY_MS = 1_500;
const DEFAULT_PREVIEW_PORT = 3000;
const DEFAULT_VITE_PORT = 5173;
const PREVIEW_PROXY_CONFIG_FILENAME = ".nex-vite-preview.config.mjs";
const NEX_E2B_ALLOWED_HOST_ENV = "NEX_E2B_ALLOWED_HOST";
const NEX_E2B_BASE_VITE_CONFIG_ENV = "NEX_E2B_BASE_VITE_CONFIG";
const VITE_CONFIG_FILENAMES = [
  "vite.config.ts",
  "vite.config.mts",
  "vite.config.js",
  "vite.config.mjs",
  "vite.config.cts",
  "vite.config.cjs",
] as const;
const COMMON_PROJECT_CWDS = [
  DEFAULT_E2B_SANDBOX_HOME,
  `${DEFAULT_E2B_SANDBOX_HOME}/app`,
  `${DEFAULT_E2B_SANDBOX_HOME}/project`,
  `${DEFAULT_E2B_SANDBOX_HOME}/workspace`,
] as const;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "Unknown error";

const resolveSandboxId = (
  sandboxID: string | undefined,
  context?: ToolExecutionContext,
): string | undefined => resolveToolSandboxId(sandboxID, context);

const quoteShellArg = (value: string): string =>
  `'${value.replace(/'/g, `'\\''`)}'`;

const buildCommand = ({
  command,
  cwd,
}: {
  command: string;
  cwd?: string;
}): string => {
  const normalizedCwd = cwd?.trim();
  if (!normalizedCwd) {
    return command;
  }

  return `cd ${quoteShellArg(normalizedCwd)} && ${command}`;
};

const connectToSandbox = async (sandboxID?: string): Promise<Sandbox> => {
  if (!process.env.E2B_API_KEY) {
    throw new Error("Missing E2B_API_KEY");
  }

  if (sandboxID) {
    try {
      return await Sandbox.connect(sandboxID);
    } catch {
      return await Sandbox.create();
    }
  }

  return await Sandbox.create();
};

function appendCommandDelta({
  current,
  next,
}: {
  current: string;
  next: string;
}): { combined: string; delta: string } {
  if (!next) {
    return { combined: current, delta: "" };
  }

  if (!current) {
    return { combined: next, delta: next };
  }

  if (next === current) {
    return { combined: current, delta: "" };
  }

  if (next.startsWith(current)) {
    return {
      combined: next,
      delta: next.slice(current.length),
    };
  }

  return {
    combined: next,
    delta: next,
  };
}

async function* streamSandboxCommand({
  sandbox,
  command,
  displayCommand = command,
  background = false,
  envs,
  timeoutMs = 300_000,
  startupDelayMs = BACKGROUND_STARTUP_DELAY_MS,
}: {
  sandbox: Sandbox;
  command: string;
  displayCommand?: string;
  background?: boolean;
  envs?: CommandEnv;
  timeoutMs?: number;
  startupDelayMs?: number;
}): AsyncGenerator<TerminalStreamPayload, StreamedCommandSummary, unknown> {
  const stream = createStreamableValue<TerminalStreamPayload>();
  let summary: StreamedCommandSummary = {
    stdout: "",
    stderr: "",
    background,
  };

  const emit = (output: string, isComplete = false) => {
    if (!output && !isComplete) {
      return;
    }

    const payload: TerminalStreamPayload = {
      type: "terminal_stream",
      command: displayCommand,
      output,
      isComplete,
    };

    if (isComplete) {
      stream.done(payload);
      return;
    }

    stream.update(payload);
  };

  emit(`$ ${displayCommand}\n`);

  void (async () => {
    try {
      const runResult = await sandbox.commands.run(command, {
        background,
        user: DEFAULT_E2B_SANDBOX_USER,
        ...(envs ? { envs } : {}),
        timeoutMs,
        onStdout: async (chunk: string) => {
          if (!chunk) return;
          summary.stdout += chunk;
          emit(chunk);
        },
        onStderr: async (chunk: string) => {
          if (!chunk) return;
          summary.stderr += chunk;
          emit(chunk);
        },
      });

      if (background) {
        await sleep(startupDelayMs);
      }

      if (!background && runResult && typeof runResult === "object") {
        const commandResult = runResult as {
          stdout?: unknown;
          stderr?: unknown;
        };

        if (typeof commandResult.stdout === "string") {
          const nextStdout = appendCommandDelta({
            current: summary.stdout,
            next: commandResult.stdout,
          });
          summary.stdout = nextStdout.combined;
          if (nextStdout.delta) {
            emit(nextStdout.delta);
          }
        }

        if (typeof commandResult.stderr === "string") {
          const nextStderr = appendCommandDelta({
            current: summary.stderr,
            next: commandResult.stderr,
          });
          summary.stderr = nextStderr.combined;
          if (nextStderr.delta) {
            emit(nextStderr.delta);
          }
        }
      }

      if (runResult && typeof runResult === "object") {
        const pid = (runResult as { pid?: unknown }).pid;
        if (typeof pid === "number") {
          summary = {
            ...summary,
            pid,
          };
        }
      }

      emit(
        background
          ? "[process started in background]\n"
          : "[command completed]\n",
        true,
      );
    } catch (error) {
      const message = toErrorMessage(error);
      summary = {
        ...summary,
        error: message,
        stderr: summary.stderr
          ? `${summary.stderr}${summary.stderr.endsWith("\n") ? "" : "\n"}${message}`
          : message,
      };
      emit(`[command failed] ${message}\n`, true);
    }
  })();

  for await (const payload of readStreamableValue<TerminalStreamPayload>(
    stream.value,
  )) {
    if (payload) {
      yield payload;
    }
  }

  return summary;
}

function normalizePath(path: string | undefined): string | null {
  const value = path?.trim();
  if (!value) return null;
  return value.replace(/\/+$/, "") || "/";
}

function resolvePackageJsonPath(cwd?: string): string {
  const normalizedCwd = normalizePath(cwd);
  if (!normalizedCwd || normalizedCwd === ".") {
    return "package.json";
  }
  if (normalizedCwd === "/") {
    return "/package.json";
  }
  return `${normalizedCwd}/package.json`;
}

function resolvePathInCwd({
  cwd,
  relativePath,
}: {
  cwd?: string;
  relativePath: string;
}): string {
  if (relativePath.startsWith("/")) {
    return relativePath;
  }

  const cleanedPath = relativePath.replace(/^\.\/+/, "").replace(/^\/+/, "");
  const normalizedCwd = normalizePath(cwd);
  if (!normalizedCwd || normalizedCwd === ".") {
    return `${DEFAULT_E2B_SANDBOX_HOME}/${cleanedPath}`;
  }
  if (normalizedCwd === "/") {
    return `/${cleanedPath}`;
  }
  if (!normalizedCwd.startsWith("/")) {
    return `${DEFAULT_E2B_SANDBOX_HOME}/${normalizedCwd}/${cleanedPath}`;
  }
  return `${normalizedCwd}/${cleanedPath}`;
}

function unwrapShellToken(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function extractPortFromViteScript(scriptCommand: string): number {
  const explicitPort =
    scriptCommand.match(/(?:^|\s)--port(?:=|\s+)(\d{2,5})(?:\s|$)/)?.[1] ??
    scriptCommand.match(/(?:^|\s)-p(?:\s+)(\d{2,5})(?:\s|$)/)?.[1];

  if (!explicitPort) {
    return DEFAULT_VITE_PORT;
  }

  const parsed = Number.parseInt(explicitPort, 10);
  return Number.isFinite(parsed) ? parsed : DEFAULT_VITE_PORT;
}

function buildPackageScriptLookupCwds(cwd?: string): string[] {
  const candidates = [cwd, ...COMMON_PROJECT_CWDS]
    .map((value) => normalizePath(value))
    .filter((value): value is string => Boolean(value));

  return Array.from(new Set(candidates));
}

async function readPackageScript({
  sandbox,
  cwd,
  script,
}: {
  sandbox: Sandbox;
  cwd?: string;
  script: string;
}): Promise<string | null> {
  try {
    const packageJson = await sandbox.files.read(resolvePackageJsonPath(cwd), {
      user: DEFAULT_E2B_SANDBOX_USER,
    });
    const parsed = JSON.parse(packageJson) as {
      scripts?: Record<string, unknown>;
    };
    const scriptCommand = parsed.scripts?.[script];
    return typeof scriptCommand === "string" ? scriptCommand : null;
  } catch {
    return null;
  }
}

async function detectVitePreviewPort({
  sandbox,
  cwd,
}: {
  sandbox: Sandbox;
  cwd?: string;
}): Promise<number | null> {
  const candidateCwds = buildPackageScriptLookupCwds(cwd);

  for (const candidateCwd of candidateCwds) {
    const devScript = await readPackageScript({
      sandbox,
      cwd: candidateCwd,
      script: "dev",
    });
    if (devScript && /\bvite\b/.test(devScript)) {
      return extractPortFromViteScript(devScript);
    }

    const startScript = await readPackageScript({
      sandbox,
      cwd: candidateCwd,
      script: "start",
    });
    if (startScript && /\bvite\b/.test(startScript)) {
      return extractPortFromViteScript(startScript);
    }
  }

  return null;
}

async function findViteConfigPath({
  sandbox,
  cwd,
}: {
  sandbox: Sandbox;
  cwd?: string;
}): Promise<string | null> {
  try {
    const entries = await sandbox.files.list(normalizePath(cwd) || ".", {
      user: DEFAULT_E2B_SANDBOX_USER,
    });
    const configEntry = entries.find((entry) => {
      if (entry.type !== "file") {
        return false;
      }
      return VITE_CONFIG_FILENAMES.includes(
        entry.name as (typeof VITE_CONFIG_FILENAMES)[number],
      );
    });
    if (!configEntry) {
      return null;
    }
    return configEntry.path || resolvePathInCwd({ cwd, relativePath: configEntry.name });
  } catch {
    return null;
  }
}

function extractConfigFromViteScript(scriptCommand: string): string | null {
  const explicitConfig =
    scriptCommand.match(/(?:^|\s)--config(?:=|\s+)("[^"]+"|'[^']+'|\S+)/)?.[1] ??
    scriptCommand.match(/(?:^|\s)-c(?:\s+)("[^"]+"|'[^']+'|\S+)/)?.[1];

  if (!explicitConfig) {
    return null;
  }

  return unwrapShellToken(explicitConfig);
}

function buildVitePreviewConfigContent(): string {
  return `import { defineConfig, loadConfigFromFile, mergeConfig } from 'vite';

const allowedHost = process.env.${NEX_E2B_ALLOWED_HOST_ENV};
const baseConfigPath = process.env.${NEX_E2B_BASE_VITE_CONFIG_ENV};

export default defineConfig(async (env) => {
  const loaded = baseConfigPath
    ? await loadConfigFromFile(env, baseConfigPath, process.cwd())
    : null;

  return mergeConfig(loaded?.config ?? {}, {
    server: {
      host: '0.0.0.0',
      allowedHosts: allowedHost ? [allowedHost] : undefined,
    },
  });
});
`;
}

function applyInlineShellEnv({
  command,
  envs,
}: {
  command: string;
  envs?: CommandEnv;
}): string {
  if (!envs || Object.keys(envs).length === 0) {
    return command;
  }

  const assignments = Object.entries(envs)
    .map(([key, value]) => `${key}=${quoteShellArg(value)}`)
    .join(" ");

  return `${assignments} ${command}`;
}

async function resolveCommandEnv({
  sandbox,
  cwd,
  script,
}: {
  sandbox: Sandbox;
  cwd?: string;
  script: string;
}): Promise<{ envs: CommandEnv; commandSuffix: string } | undefined> {
  const scriptCommand = await readPackageScript({
    sandbox,
    cwd,
    script,
  });

  if (!scriptCommand || !/\bvite\b/.test(scriptCommand)) {
    return undefined;
  }

  const host = sandbox.sandboxDomain || "e2b.dev";
  const port = extractPortFromViteScript(scriptCommand);
  const configuredPath =
    extractConfigFromViteScript(scriptCommand) ??
    (await findViteConfigPath({
      sandbox,
      cwd,
    }));
  const previewConfigPath = resolvePathInCwd({
    cwd,
    relativePath: PREVIEW_PROXY_CONFIG_FILENAME,
  });

  await sandbox.files.write(previewConfigPath, buildVitePreviewConfigContent(), {
    user: DEFAULT_E2B_SANDBOX_USER,
  });

  return {
    envs: {
      [NEX_E2B_ALLOWED_HOST_ENV]: `${port}-${sandbox.sandboxId}.${host}`,
      ...(configuredPath
        ? {
            [NEX_E2B_BASE_VITE_CONFIG_ENV]: resolvePathInCwd({
              cwd,
              relativePath: configuredPath,
            }),
          }
        : {}),
    },
    commandSuffix: ` -- --config ${quoteShellArg(previewConfigPath)}`,
  };
}

export const npm_install = createTool<NpmInstallInput, UntypedJson>({
  description:
    "Install NPM packages in the sandbox. Leave packages empty to install the current package.json dependencies, and set cwd when the project lives outside /home/user. `sandboxID` is optional: omit it or pass `default` on the first call to create/reuse a sandbox, then reuse the returned `sandboxID` in later calls.",
  schema: createToolSchema(
    {
      packages: stringProp(
        "Space-separated list of packages (e.g. 'react react-dom')",
      ),
      sandboxID: stringProp("Optional sandbox ID to reuse. Omit it or pass `default` to create/reuse a sandbox automatically."),
      cwd: stringProp("Working directory that contains package.json (for example /home/user/app)"),
    },
    [],
  ),
  async *execute({ packages, sandboxID, cwd }: NpmInstallInput, context?: ToolExecutionContext) {
    const packageArgs = packages?.trim() ?? "";
    const command = buildCommand({
      command: packageArgs ? `npm install ${packageArgs}` : "npm install",
      cwd,
    });
    const effectiveSandboxID = resolveSandboxId(sandboxID, context);

    try {
      const sandbox = await connectToSandbox(effectiveSandboxID);
      const terminalStream = streamSandboxCommand({
        sandbox,
        command,
      });
      let summary: StreamedCommandSummary | null = null;

      while (true) {
        const next = await terminalStream.next();
        if (next.done) {
          summary = next.value;
          break;
        }

        yield next.value;
      }

      const result: NpmToolResult = {
        success: !summary?.error,
        stdout: summary?.stdout ?? "",
        stderr: summary?.stderr ?? "",
        sandboxID: sandbox.sandboxId,
        command,
        message: summary?.error ? undefined : "Completed",
        ...(summary?.error ? { error: summary.error } : {}),
      };

      yield { result };
    } catch (error) {
      const result: NpmToolResult = {
        success: false,
        stdout: "",
        stderr: "",
        sandboxID: effectiveSandboxID ?? "",
        command,
        error: toErrorMessage(error),
      };

      yield { result };
    }
  },
});

export const npm_run = createTool<NpmRunInput, UntypedJson>({
  description:
    "Run an NPM script (e.g., 'dev', 'build', 'start'). Long-running server scripts are launched in the background. Set cwd when the project lives outside /home/user. `sandboxID` is optional: omit it or pass `default` on the first call to create/reuse a sandbox, then reuse the returned `sandboxID` in later calls.",
  schema: createToolSchema(
    {
      script: stringProp("Name of the script to run (e.g., 'dev')"),
      sandboxID: stringProp("Optional sandbox ID to reuse. Omit it or pass `default` to create/reuse a sandbox automatically."),
      cwd: stringProp("Working directory that contains package.json (for example /home/user/app)"),
    },
    ["script"],
  ),
  async *execute({ script, sandboxID, cwd }: NpmRunInput, context?: ToolExecutionContext) {
    const displayCommand = buildCommand({
      command: `npm run ${script}`,
      cwd,
    });
    const effectiveSandboxID = resolveSandboxId(sandboxID, context);
    const background = BACKGROUND_NPM_SCRIPTS.has(script.trim().toLowerCase());

    try {
      const sandbox = await connectToSandbox(effectiveSandboxID);
      const vitePreviewRuntime = background
        ? await resolveCommandEnv({
            sandbox,
            cwd,
            script,
          })
        : undefined;
      const envs = vitePreviewRuntime?.envs;
      const command = buildCommand({
        command: applyInlineShellEnv({
          command: `npm run ${script}${vitePreviewRuntime?.commandSuffix ?? ""}`,
          envs,
        }),
        cwd,
      });
      const terminalStream = streamSandboxCommand({
        sandbox,
        command,
        displayCommand,
        background,
        envs,
      });
      let summary: StreamedCommandSummary | null = null;

      while (true) {
        const next = await terminalStream.next();
        if (next.done) {
          summary = next.value;
          break;
        }

        yield next.value;
      }

      const result: NpmToolResult = {
        success: !summary?.error,
        stdout: summary?.stdout ?? "",
        stderr: summary?.stderr ?? "",
        sandboxID: sandbox.sandboxId,
        command: displayCommand,
        ...(summary?.pid ? { pid: summary.pid } : {}),
        message: summary?.error
          ? undefined
          : background
            ? "Started in background"
            : "Completed",
        ...(summary?.error ? { error: summary.error } : {}),
      };

      yield { result };
    } catch (error) {
      const result: NpmToolResult = {
        success: false,
        stdout: "",
        stderr: "",
        sandboxID: effectiveSandboxID ?? "",
        command: displayCommand,
        error: toErrorMessage(error),
      };

      yield { result };
    }
  },
});

export const get_preview_url = createTool<PreviewUrlInput, UntypedJson>({
  description:
    "Get the public preview URL for a specific port in the sandbox. When port is omitted or left at the default, the tool attempts to infer the correct Vite dev-server port from the sandbox project before falling back to 3000. `sandboxID` is optional: omit it or pass `default` on the first call to create/reuse a sandbox, then reuse the returned `sandboxID` in later calls.",
  schema: createToolSchema(
    {
      port: numberProp("Port number (e.g., 3000). Leave it at the default to auto-detect common Vite ports when possible.", { default: DEFAULT_PREVIEW_PORT }),
      sandboxID: stringProp("Optional sandbox ID to reuse. Omit it or pass `default` to create/reuse a sandbox automatically."),
    },
    ["port"],
  ),
  execute: async ({ port, sandboxID }: PreviewUrlInput, context?: ToolExecutionContext) => {
    try {
      const sandbox = await connectToSandbox(resolveSandboxId(sandboxID, context));
      const host = sandbox.sandboxDomain || "e2b.dev";
      const requestedPort =
        Number.isFinite(port) && port > 0 ? port : DEFAULT_PREVIEW_PORT;
      const resolvedPort =
        requestedPort === DEFAULT_PREVIEW_PORT
          ? (await detectVitePreviewPort({ sandbox })) ?? requestedPort
          : requestedPort;
      const url = `https://${resolvedPort}-${sandbox.sandboxId}.${host}`;

      return {
        success: true,
        url,
        port: resolvedPort,
        sandboxID: sandbox.sandboxId,
      };
    } catch (error) {
      return {
        success: false,
        error: toErrorMessage(error),
      };
    }
  },
});
