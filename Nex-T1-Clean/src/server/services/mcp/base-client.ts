import { setTimeout as delay } from "timers/promises";

export type McpToolContent =
  | { type: "text"; text: string }
  | { type: "image"; data: string; mimeType: string }
  | {
      type: "resource";
      resource: { url: string; mimeType?: string; text?: string };
    };

export type McpToolResponse = {
  content: McpToolContent[];
  isError?: boolean;
  toolResult?: UntypedJson;
};

export type McpToolInvocationResult<TToolName extends string> = {
  ok: boolean;
  text: string;
  response: McpToolResponse;
  toolResult?: UntypedJson;
  tool?: TToolName;
};

export type McpTransport = "http" | "streamable-http";

export interface HttpMcpClientOptions {
  baseUrl?: string;
  apiKey?: string;
  requestTimeoutMs?: number;
  maxRetries?: number;
  defaultHeaders?: Record<string, string>;
  name?: string;
  /** Transport mode: 'http' for simple POST, 'streamable-http' for SSE session-based */
  transport?: McpTransport;
  /** SSE endpoint path for streamable-http transport (default: /sse) */
  sseEndpoint?: string;
}

export type ToolPathFactory = (
  tool: string,
  args: Record<string, UntypedJson>
) => string;

type JsonRpcEnvelope = {
  jsonrpc?: string;
  id?: string | number;
  result?: UntypedJson;
  error?: {
    code?: number;
    message?: string;
    data?: UntypedJson;
  } | null;
};

const DEFAULT_TOOL_PATH_FACTORIES: ToolPathFactory[] = [
  () => "/mcp/messages",
  (tool) => `/tools/${tool}`,
  () => "/invoke",
  () => "/call",
];

// For streamable-http transport, we only use the messages endpoint from SSE
const STREAMABLE_HTTP_PATH_FACTORIES: ToolPathFactory[] = [
  () => "", // The path comes from SSE endpoint response
];

function isMessagesPath(path: string): boolean {
  const [pathname = ""] = path.split("?");
  return pathname === "/mcp/messages" || pathname === "/messages";
}

export class McpInvocationError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly cause?: UntypedJson
  ) {
    super(message);
    this.name = "McpInvocationError";
  }
}

const exponentialBackoff = (attempt: number) => 250 * 2 ** attempt;

export class HttpMcpClient<TToolName extends string> {
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly defaultHeaders: Record<string, string>;
  private readonly toolPathFactories: ToolPathFactory[];
  private readonly clientName: string;
  private readonly transport: McpTransport;
  private readonly sseEndpoint: string;
  
  // Session state for streamable-http transport
  private sessionEndpoint: string | null = null;
  private sessionExpiry: number = 0;
  private sessionPromise: Promise<string> | null = null;

  constructor(
    private readonly options: HttpMcpClientOptions,
    private readonly toolPaths: ToolPathFactory[] = DEFAULT_TOOL_PATH_FACTORIES
  ) {
    const {
      baseUrl,
      apiKey,
      requestTimeoutMs = 15_000,
      maxRetries = 2,
      defaultHeaders = {},
      name = "MCP Client",
      transport = "http",
      sseEndpoint = "/sse",
    } = options;

    if (!baseUrl) {
      throw new Error(`${name} requires a baseUrl`);
    }

    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
    this.timeoutMs = requestTimeoutMs;
    this.maxRetries = maxRetries;
    this.defaultHeaders = defaultHeaders;
    this.transport = transport;
    this.sseEndpoint = sseEndpoint;
    
    // Use appropriate path factories based on transport
    if (transport === "streamable-http") {
      this.toolPathFactories = STREAMABLE_HTTP_PATH_FACTORIES;
    } else {
      this.toolPathFactories = toolPaths.length
        ? toolPaths
        : DEFAULT_TOOL_PATH_FACTORIES;
    }
    this.clientName = name;
  }
  
  /**
   * Get a session endpoint for streamable-http transport.
   * This opens an SSE connection briefly to get the session-specific messages endpoint.
   */
  private async getSessionEndpoint(): Promise<string> {
    // If we have a valid cached session, use it
    const now = Date.now();
    if (this.sessionEndpoint && this.sessionExpiry > now) {
      return this.sessionEndpoint;
    }
    
    // If there's already a request in flight, wait for it
    if (this.sessionPromise) {
      return this.sessionPromise;
    }
    
    // Create a new session
    this.sessionPromise = this.fetchSessionEndpoint();
    
    try {
      const endpoint = await this.sessionPromise;
      // Cache for 5 minutes (sessions typically last longer, but this is safe)
      this.sessionEndpoint = endpoint;
      this.sessionExpiry = now + 5 * 60 * 1000;
      return endpoint;
    } finally {
      this.sessionPromise = null;
    }
  }
  
  /**
   * Fetch a new session endpoint from the SSE endpoint.
   */
  private async fetchSessionEndpoint(): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    
    try {
      const sseUrl = this.buildRequestUrl(this.sseEndpoint);
      const response = await fetch(sseUrl, {
        method: "GET",
        signal: controller.signal,
        headers: {
          Accept: "text/event-stream",
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
          ...this.defaultHeaders,
        },
      });
      
      if (!response.ok) {
        throw new McpInvocationError(
          `${this.clientName} SSE connection failed with status ${response.status}`,
          response.status
        );
      }
      
      // Read the SSE stream until we get the endpoint event
      const reader = response.body?.getReader();
      if (!reader) {
        throw new McpInvocationError(
          `${this.clientName} SSE response has no body`
        );
      }
      
      const decoder = new TextDecoder();
      let buffer = "";
      
      // Read chunks until we find the endpoint
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        
        buffer += decoder.decode(value, { stream: true });
        
        // Look for endpoint event in the buffer
        // Format: "event: endpoint\ndata: /messages?sessionId=xxx\n\n"
        const endpointMatch = buffer.match(/event:\s*endpoint\s*\ndata:\s*([^\n]+)/);
        if (endpointMatch) {
          const endpoint = endpointMatch[1].trim();
          // Cancel the reader since we have what we need
          reader.cancel().catch(() => {});
          return endpoint;
        }
        
        // Also check for direct sessionId in data (some servers format differently)
        const sessionMatch = buffer.match(/sessionId=([a-f0-9-]+)/i);
        if (sessionMatch) {
          const sessionId = sessionMatch[1];
          reader.cancel().catch(() => {});
          return `/messages?sessionId=${sessionId}`;
        }
      }
      
      throw new McpInvocationError(
        `${this.clientName} SSE did not return session endpoint`
      );
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new McpInvocationError(
          `${this.clientName} SSE connection timed out after ${this.timeoutMs}ms`
        );
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  async invoke(
    tool: TToolName,
    args: Record<string, UntypedJson> = {}
  ): Promise<McpToolInvocationResult<TToolName>> {
    const result = await this.invokeInternal(tool, args);
    if (!result.ok) {
      throw new McpInvocationError(
        `${this.clientName} tool ${tool} failed: ${result.text}`,
        undefined,
        result
      );
    }
    return result;
  }

  async invokeRaw(
    tool: TToolName,
    args: Record<string, UntypedJson> = {}
  ): Promise<McpToolInvocationResult<TToolName>> {
    return this.invokeInternal(tool, args);
  }

  protected buildBody(
    path: string,
    tool: string,
    args: Record<string, UntypedJson>
  ) {
    if (isMessagesPath(path)) {
      return {
        jsonrpc: "2.0",
        id: `rpc-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        method: "tools/call",
        params: {
          name: tool,
          arguments: args ?? {},
        },
      } satisfies Record<string, UntypedJson>;
    }
    if (path === "/invoke" || path === "/call") {
      return { name: tool, arguments: args };
    }
    return { arguments: args };
  }

  private async invokeInternal(
    tool: TToolName,
    args: Record<string, UntypedJson>
  ): Promise<McpToolInvocationResult<TToolName>> {
    let lastError: UntypedJson;

    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      const shouldRetry = attempt < this.maxRetries;

      // For streamable-http, get session endpoint first
      if (this.transport === "streamable-http") {
        try {
          const sessionPath = await this.getSessionEndpoint();
          const response = await this.fetchJson(sessionPath, this.buildBody(sessionPath, tool, args));
          const result = this.parseResponse(tool, response);

          if (!result.ok && shouldRetry) {
            // Invalidate session on error in case it expired
            this.sessionEndpoint = null;
            this.sessionExpiry = 0;
            lastError = result;
            await delay(this.retryDelay(attempt));
            continue;
          }

          return result;
        } catch (error) {
          // Invalidate session on error
          this.sessionEndpoint = null;
          this.sessionExpiry = 0;
          lastError = error;
          
          if (!shouldRetry) {
            throw error instanceof McpInvocationError
              ? error
              : new McpInvocationError(
                  `${this.clientName} request failed`,
                  undefined,
                  error
                );
          }
          await delay(this.retryDelay(attempt));
          continue;
        }
      }

      // Standard HTTP transport - try multiple paths
      for (const pathFactory of this.toolPathFactories) {
        const path = pathFactory(tool, args);
        try {
          const response = await this.fetchJson(path, this.buildBody(path, tool, args));
          const result = this.parseResponse(tool, response);

          if (!result.ok && shouldRetry) {
            lastError = result;
            await delay(this.retryDelay(attempt));
            continue;
          }

          return result;
        } catch (error) {
          lastError = error;
          if (!shouldRetry) {
            throw error instanceof McpInvocationError
              ? error
              : new McpInvocationError(
                  `${this.clientName} request failed`,
                  undefined,
                  error
                );
          }
        }
      }

      if (shouldRetry) {
        await delay(this.retryDelay(attempt));
      }
    }

    throw new McpInvocationError(
      `${this.clientName} failed to invoke tool after retries`,
      undefined,
      lastError
    );
  }

  private retryDelay(attempt: number): number {
    return exponentialBackoff(attempt) + Math.random() * 150;
  }

  private buildRequestUrl(path: string): string {
    if (/^https?:\/\//i.test(path)) {
      return path;
    }

    const url = new URL(this.baseUrl);
    const [rawPathname, rawSearch = ""] = path.split("?");
    const normalizedPathname = rawPathname.startsWith("/")
      ? rawPathname
      : `/${rawPathname}`;
    const basePath = url.pathname.replace(/\/$/, "");
    const dedupedPathname =
      basePath.endsWith("/mcp") && normalizedPathname.startsWith("/mcp/")
        ? normalizedPathname.slice("/mcp".length)
        : normalizedPathname;
    const joinedPath = `${basePath}${dedupedPathname}` || "/";

    url.pathname = joinedPath.replace(/\/{2,}/g, "/");
    url.search = rawSearch ? `?${rawSearch}` : "";
    url.hash = "";

    return url.toString();
  }

  private async fetchJson(path: string, body: object): Promise<UntypedJson> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.buildRequestUrl(path), {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
          ...this.defaultHeaders,
        },
        body: JSON.stringify(body ?? {}),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new McpInvocationError(
          `${this.clientName} tool request failed with status ${response.status}${
            text ? `: ${text}` : ""
          }`,
          response.status
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new McpInvocationError(
          `${this.clientName} tool request timed out after ${this.timeoutMs}ms`
        );
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private parseResponse(
    tool: TToolName,
    response: UntypedJson
  ): McpToolInvocationResult<TToolName> {
    const envelope = this.asJsonRpcEnvelope(response);

    if (envelope) {
      if (envelope.error) {
        const normalized = this.normalizeToolResponse(envelope.result);
        const message =
          typeof envelope.error.message === "string"
            ? envelope.error.message
            : "MCP JSON-RPC error";

        return {
          ok: false,
          text: message,
          response: { ...normalized, isError: true },
          toolResult: normalized.toolResult,
          tool,
        };
      }

      return this.createInvocationResult(
        tool,
        this.normalizeToolResponse(envelope.result)
      );
    }

    return this.createInvocationResult(
      tool,
      this.normalizeToolResponse(response)
    );
  }

  private asJsonRpcEnvelope(value: UntypedJson): JsonRpcEnvelope | null {
    if (!value || typeof value !== "object") {
      return null;
    }

    const candidate = value as JsonRpcEnvelope;
    if (
      "jsonrpc" in candidate ||
      "result" in candidate ||
      "error" in candidate
    ) {
      return candidate;
    }

    return null;
  }

  private normalizeToolResponse(payload: UntypedJson): McpToolResponse {
    if (typeof payload === "string") {
      return {
        content: [{ type: "text", text: payload }],
        isError: false,
      };
    }

    if (payload && typeof payload === "object") {
      const candidate = payload as Partial<McpToolResponse> & { text?: string };

      let content: McpToolContent[] = [];

      if (Array.isArray(candidate.content)) {
        content = candidate.content.filter((item) => this.isMcpContent(item));
      }

      if (!content.length && typeof candidate.text === "string") {
        content = [{ type: "text", text: candidate.text }];
      }

      return {
        content,
        isError:
          typeof candidate.isError === "boolean" ? candidate.isError : false,
        toolResult: candidate.toolResult,
      };
    }

    return { content: [], isError: true };
  }

  private isMcpContent(value: UntypedJson): value is McpToolContent {
    if (!value || typeof value !== "object") {
      return false;
    }

    const { type } = value as { type?: UntypedJson };
    if (type === "text") {
      return typeof (value as { text?: UntypedJson }).text === "string";
    }

    if (type === "image") {
      const { data, mimeType } = value as {
        data?: UntypedJson;
        mimeType?: UntypedJson;
      };
      return typeof data === "string" && typeof mimeType === "string";
    }

    if (type === "resource") {
      return typeof (value as { resource?: UntypedJson }).resource === "object";
    }

    return false;
  }

  private createInvocationResult(
    tool: TToolName,
    response: McpToolResponse
  ): McpToolInvocationResult<TToolName> {
    const text =
      response.content?.find((item) => item.type === "text")?.text?.trim() ??
      "";

    return {
      ok: !response.isError,
      text,
      response,
      toolResult: response.toolResult,
      tool,
    };
  }
}
