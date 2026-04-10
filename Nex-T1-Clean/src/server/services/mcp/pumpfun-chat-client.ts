import {
  HttpMcpClient,
  type HttpMcpClientOptions,
  type McpToolInvocationResult,
} from "./base-client";

export type PumpFunChatToolName =
  | "PumpFunChat_ReadMessages"
  | "PumpFunChat_GetLatestMessage"
  | "PumpFunChat_SendMessage"
  | "PumpFunChat_GetStatus";

export type PumpFunChatClientOptions = HttpMcpClientOptions;

const DEFAULT_BASE_URL =
  process.env.MCP_PUMPFUN_CHAT_BASE_URL ?? "https://pumpfun-chat.nex-t1.ai";

export class PumpFunChatMcpClient extends HttpMcpClient<PumpFunChatToolName> {
  constructor(options: PumpFunChatClientOptions = {}) {
    super(
      {
        baseUrl: options.baseUrl ?? DEFAULT_BASE_URL,
        apiKey: options.apiKey ?? process.env.MCP_PUMPFUN_CHAT_API_KEY,
        requestTimeoutMs: options.requestTimeoutMs,
        maxRetries: options.maxRetries,
        defaultHeaders: options.defaultHeaders,
        name: "Pump.fun Chat MCP",
      },
    );
  }

  async invoke(
    tool: PumpFunChatToolName,
    args: Record<string, UntypedJson> = {},
  ): Promise<McpToolInvocationResult<PumpFunChatToolName>> {
    return super.invoke(tool, args);
  }

  async invokeRaw(
    tool: PumpFunChatToolName,
    args: Record<string, UntypedJson> = {},
  ): Promise<McpToolInvocationResult<PumpFunChatToolName>> {
    return super.invokeRaw(tool, args);
  }
}

export const defaultPumpFunChatClient = new PumpFunChatMcpClient();
