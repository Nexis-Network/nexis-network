import {
  callOpenAiResponses,
  extractTextFromOutput,
  extractToolCalls,
  type ToolCallRecord,
} from "@/server/services/ai-sdk/openai-responses";

export type OpenAIMcpServerConfiguration = {
  serverName: string;
  serverConfiguration?: Record<string, UntypedJson>;
};

export type OpenAIMcpInvocationOptions = {
  prompt?: string;
  context?: string;
  messages?: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  model?: string;
  maxOutputTokens?: number;
  temperature?: number;
};

export type OpenAIMcpInvocationResult = {
  text: string;
  toolCalls: ToolCallRecord[];
  raw: UntypedJson;
};

const DEFAULT_MODEL = process.env.OPENAI_MCP_MODEL ?? "gpt-5.4";

const defaultToolset = (() => {
  const raw = process.env.OPENAI_MCP_TOOLSET;
  if (!raw) return [] as OpenAIMcpServerConfiguration[];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((entry) => {
          if (!entry) return null;
          if (typeof entry === "string") {
            return { serverName: entry.trim() };
          }
          if (typeof entry === "object" && typeof entry.serverName === "string") {
            return {
              serverName: entry.serverName.trim(),
              serverConfiguration:
                typeof entry.serverConfiguration === "object"
                  ? (entry.serverConfiguration as Record<string, UntypedJson>)
                  : undefined,
            } satisfies OpenAIMcpServerConfiguration;
          }
          return null;
        })
        .filter((entry): entry is OpenAIMcpServerConfiguration => Boolean(entry));
    }
  } catch {
    // ignore JSON parse failure
  }

  return raw
    .split(",")
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
    .map(
      (serverName) =>
        ({
          serverName,
        }) satisfies OpenAIMcpServerConfiguration,
    );
})();

const dedupeToolset = (
  toolset: OpenAIMcpServerConfiguration[],
): OpenAIMcpServerConfiguration[] => {
  const seen = new Map<string, OpenAIMcpServerConfiguration>();
  for (const entry of toolset) {
    if (!entry?.serverName) continue;
    seen.set(entry.serverName, entry);
  }
  return Array.from(seen.values());
};

const toApiToolset = (toolset: OpenAIMcpServerConfiguration[]) => {
  if (!toolset.length) return undefined;

  return toolset.map((entry) => ({
    type: "mcp" as const,
    server_name: entry.serverName,
    ...(entry.serverConfiguration
      ? { server_configuration: entry.serverConfiguration }
      : {}),
  }));
};

export const invokeOpenAiMcp = async (
  options: OpenAIMcpInvocationOptions,
): Promise<OpenAIMcpInvocationResult> => {
  const {
    prompt,
    context,
    messages = [],
    model = DEFAULT_MODEL,
    maxOutputTokens,
    temperature,
  } = options;

  const inputMessages: Array<{ role: string; content: string }> = [];

  if (context) {
    inputMessages.push({ role: "system", content: context });
  }

  for (const message of messages) {
    if (message?.role && message?.content) {
      inputMessages.push({ role: message.role, content: message.content });
    }
  }

  if (prompt) {
    inputMessages.push({ role: "user", content: prompt });
  }

  if (!inputMessages.length) {
    throw new Error("invokeOpenAiMcp requires at least one message or prompt.");
  }

  const mergedToolset = dedupeToolset(defaultToolset);
  const payload: Record<string, UntypedJson> = {
    model,
    input: inputMessages,
    stream: true,
  };

  const apiToolset = toApiToolset(mergedToolset);
  if (apiToolset) {
    payload.toolset = apiToolset;
  }

  if (typeof maxOutputTokens === "number") {
    payload.max_output_tokens = maxOutputTokens;
  }

  if (typeof temperature === "number") {
    payload.temperature = temperature;
  }

  const data = await callOpenAiResponses(payload);

  return {
    text: extractTextFromOutput(data),
    toolCalls: extractToolCalls(data),
    raw: data,
  };
};
