/**
 * MCP Transport Creation & Cleanup
 *
 * Creates transport instances for stdio, sse, and http MCP connections.
 * Provides safe cleanup for partial connection failures.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
// SSEClientTransport is deprecated in MCP SDK >= 1.12; kept for backward compat with older servers
// eslint-disable-next-line deprecation/deprecation
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { ScopedMcpServerConfig } from "./types";

// Union of concrete transport types -- the SDK does not export a shared
// Transport interface via a stable public path, so we derive it here.
export type McpTransportInstance =
  | InstanceType<typeof StdioClientTransport>
  // eslint-disable-next-line deprecation/deprecation
  | InstanceType<typeof SSEClientTransport>
  | InstanceType<typeof StreamableHTTPClientTransport>;

// Re-export Client for use by other modules
export { Client };

export function createTransport(config: ScopedMcpServerConfig): McpTransportInstance {
  switch (config.transport) {
    case "stdio": {
      if (!config.command) {
        throw new Error(`stdio server "${config.name}" requires a command`);
      }
      const mergedEnv: Record<string, string> = {};
      if (config.env) {
        for (const [k, v] of Object.entries(process.env)) {
          if (v !== undefined) mergedEnv[k] = v;
        }
        Object.assign(mergedEnv, config.env);
      }
      return new StdioClientTransport({
        command: config.command,
        args: config.args ?? [],
        env: config.env ? mergedEnv : undefined,
      });
    }
    case "sse": {
      if (!config.url) {
        throw new Error(`sse server "${config.name}" requires a url`);
      }
      // eslint-disable-next-line deprecation/deprecation
      return new SSEClientTransport(new URL(config.url), {
        requestInit: config.headers
          ? { headers: config.headers }
          : undefined,
      });
    }
    case "http": {
      if (!config.url) {
        throw new Error(`http server "${config.name}" requires a url`);
      }
      return new StreamableHTTPClientTransport(new URL(config.url), {
        requestInit: config.headers
          ? { headers: config.headers }
          : undefined,
      });
    }
    default: {
      const _exhaustive: never = config.transport;
      throw new Error(`Unknown transport: ${String(_exhaustive)}`);
    }
  }
}

/**
 * Attempt to close a transport, ignoring errors.
 * Prevents resource leaks when connection setup fails partway through.
 */
export async function safeCloseTransport(transport: McpTransportInstance): Promise<void> {
  try {
    await transport.close();
  } catch {
    // Transport close failures are non-critical during cleanup
  }
}

/**
 * Generic timeout wrapper for async operations.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms,
    );
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e: unknown) => { clearTimeout(timer); reject(e); },
    );
  });
}
