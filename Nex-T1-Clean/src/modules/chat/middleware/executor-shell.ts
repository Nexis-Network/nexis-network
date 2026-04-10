/**
 * Shell Hook Executor -- Runs shell command hooks as child processes
 *
 * The hook input is passed via environment variables.
 * Commands are sourced from trusted config files.
 */

import type { ShellHookCommand, HookInput } from "./types";

/**
 * Executes a shell hook command as a child process.
 *
 * The hook input is passed via the `NEX_HOOK_EVENT` and `NEX_HOOK_INPUT`
 * environment variables (JSON-serialized). The command itself comes from
 * user-authored hook configuration and is executed in a shell.
 *
 * Security note: Commands are sourced from trusted config files
 * (.nex-hooks.json / ~/.nex-t1/hooks.json). The env vars are JSON-serialized
 * and do not participate in shell expansion unless the command explicitly
 * references them (e.g., via `$NEX_HOOK_INPUT`). Shell execution (exec)
 * is intentional here because hook commands may use shell features like
 * pipes, redirects, and glob expansion.
 */
export async function executeShellHook(
  hook: ShellHookCommand,
  input: HookInput,
  timeoutMs: number,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  // NOTE: exec() is used intentionally. Hook commands are user-authored shell
  // commands from config files that may require shell features (pipes, globs,
  // redirects). This is NOT user-input-at-runtime -- it is trusted config.
  const { exec } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const execAsync = promisify(exec);

  // Env vars are set as process environment, not interpolated into the shell string.
  // JSON.stringify produces a well-formed string that is safe as an env var value.
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    NEX_HOOK_EVENT: input.hook_event_name,
    NEX_HOOK_INPUT: JSON.stringify(input),
  };

  try {
    const { stdout, stderr } = await execAsync(hook.command, {
      timeout: timeoutMs,
      env,
      maxBuffer: 1024 * 1024, // 1MB
    });
    return { stdout: stdout ?? "", stderr: stderr ?? "", exitCode: 0 };
  } catch (error: unknown) {
    if (!isExecError(error)) {
      return {
        stdout: "",
        stderr: error instanceof Error ? error.message : String(error),
        exitCode: 1,
      };
    }

    if (error.killed) {
      return { stdout: "", stderr: "Hook timed out", exitCode: -1 };
    }
    return {
      stdout: error.stdout ?? "",
      stderr: error.stderr ?? (error.message || "Unknown error"),
      exitCode: typeof error.code === "number" ? error.code : 1,
    };
  }
}

/** Type guard for exec() error objects which include stdout/stderr/code. */
function isExecError(
  error: unknown,
): error is Error & { stdout?: string; stderr?: string; code?: number; killed?: boolean } {
  return error instanceof Error;
}
