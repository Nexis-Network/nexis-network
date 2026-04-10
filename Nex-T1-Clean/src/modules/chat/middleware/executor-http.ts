/**
 * HTTP Hook Executor -- Executes webhook hooks via HTTP POST
 *
 * Supports header interpolation with environment variables
 * and enforces timeouts via AbortController.
 */

import type { HttpHookCommand, HookInput } from "./types";

/**
 * Executes an HTTP webhook hook by POSTing the hook input as JSON.
 *
 * Headers support environment variable interpolation using `$VAR_NAME` syntax.
 * The timeout is enforced via AbortController.
 */
export async function executeHttpHook(
  hook: HttpHookCommand,
  input: HookInput,
  timeoutMs: number,
): Promise<{ body: string; statusCode: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...interpolateHeaders(hook.headers ?? {}),
    };

    const response = await fetch(hook.url, {
      method: "POST",
      headers,
      body: JSON.stringify(input),
      signal: controller.signal,
    });

    const body = await response.text();
    return { body, statusCode: response.status };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return { body: "Hook HTTP request timed out", statusCode: 0 };
    }
    const message = error instanceof Error ? error.message : String(error);
    return { body: message, statusCode: 0 };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Interpolates environment variable references ($VAR_NAME) in header values.
 * Only matches uppercase variable names with underscores and digits.
 */
export function interpolateHeaders(
  headers: Record<string, string>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    result[key] = value.replace(/\$([A-Z_][A-Z0-9_]*)/g, (_, name: string) => {
      return process.env[name] ?? "";
    });
  }
  return result;
}
