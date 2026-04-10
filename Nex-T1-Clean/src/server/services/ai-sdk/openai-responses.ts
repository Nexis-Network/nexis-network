import {
  buildDirectOpenAIHeaders,
  buildOpenAIHeaders,
  directOpenaiConfig,
  hasUsableOpenAIApiKey,
  openaiConfig,
} from "@/server/services/ai-sdk/openai";


import { logger } from '@/lib/logger';
const DEFAULT_OPENAI_TIMEOUT_MS = Number(process.env.OPENAI_RESPONSES_TIMEOUT_MS ?? 15000);
const clampTimeout = (value: number) => (Number.isFinite(value) && value > 0 ? value : DEFAULT_OPENAI_TIMEOUT_MS);

const usesGatewayResponsesPath = (baseUrl?: string) =>
  typeof baseUrl === "string" &&
  /ai-gateway\.vercel\.sh\/v1\/ai(?:\/|$)/i.test(baseUrl);

const shouldPreferDirectResponsesTransport =
  usesGatewayResponsesPath(openaiConfig.baseURL) &&
  hasUsableOpenAIApiKey(directOpenaiConfig.apiKey);

const activeOpenAIResponsesConfig = shouldPreferDirectResponsesTransport
  ? directOpenaiConfig
  : openaiConfig;

const buildResponsesHeaders = shouldPreferDirectResponsesTransport
  ? buildDirectOpenAIHeaders
  : buildOpenAIHeaders;

class ResponsesProtocolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResponsesProtocolError";
  }
}

const responsesEndpoint = (() => {
  const rawBase =
    activeOpenAIResponsesConfig.baseURL &&
    activeOpenAIResponsesConfig.baseURL.trim().length > 0
      ? activeOpenAIResponsesConfig.baseURL.trim()
      : "https://api.openai.com/v1";

  const withoutTrailingSlash = rawBase.replace(/\/+$/, "");

  // Some environments set the base URL to a specific endpoint (e.g. /chat/completions).
  // The Responses API expects the base path to stop at /v1, so remove any known endpoint suffixes.
  const sanitizedBase = withoutTrailingSlash
    .replace(/\/responses$/i, "")
    .replace(/\/chat\/completions$/i, "")
    .replace(/\/assistants\/runs$/i, "");

  return `${sanitizedBase}/responses`;
})();

let responsesEndpointValidated: boolean | null = null;
let probeAttempted = false;

const shouldSkipProbe =
  (process.env.OPENAI_SKIP_RESPONSES_PROBE ?? "").trim().toLowerCase() === "true";

/**
 * Checks if the OpenAI Responses API endpoint is available.
 * 
 * The probe uses a lightweight HEAD request first, then falls back to OPTIONS.
 * If both fail, we assume the endpoint IS supported and let the actual POST
 * call fail if it doesn't work (fail-open approach).
 * 
 * This is more robust than the previous approach which blocked on OPTIONS 405.
 */
export async function ensureResponsesEndpointIsAllowed(): Promise<boolean> {
  // Skip probe if explicitly configured
  if (shouldSkipProbe) {
    return true;
  }
  
  // Return cached result if we have a definitive answer
  if (responsesEndpointValidated === true) {
    return true;
  }
  
  // If we've already probed and got a definitive "not allowed", return false
  if (responsesEndpointValidated === false && probeAttempted) {
    return false;
  }

  // Mark that we've attempted the probe
  probeAttempted = true;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), clampTimeout(Math.min(DEFAULT_OPENAI_TIMEOUT_MS, 5000)));
    
    // Try HEAD first (more commonly supported than OPTIONS)
    const res = await fetch(responsesEndpoint, {
      method: "HEAD",
      headers: buildResponsesHeaders(),
      signal: controller.signal,
    }).catch(() => null);
    clearTimeout(timeout);

    // If HEAD returns any response (including 405), the endpoint exists
    // Only a complete network failure or timeout means we can't determine
    if (res) {
      // If we get any 2xx or 4xx (client errors like 400, 401, 403, 404),
      // the endpoint is reachable. 405 on HEAD doesn't mean POST won't work.
      if (res.status >= 200 && res.status < 500) {
        responsesEndpointValidated = true;
        return true;
      }
      
      // Server errors (5xx) are transient - assume endpoint is valid
      // and let the actual POST call handle retries
      if (res.status >= 500) {
        logger.warn(`[openai-responses] Probe returned ${res.status}, assuming endpoint is available`);
        responsesEndpointValidated = true;
        return true;
      }
    }

    // If HEAD failed completely, try OPTIONS as fallback
    const controller2 = new AbortController();
    const timeout2 = setTimeout(() => controller2.abort(), clampTimeout(Math.min(DEFAULT_OPENAI_TIMEOUT_MS, 5000)));
    
    const optionsRes = await fetch(responsesEndpoint, {
      method: "OPTIONS",
      headers: buildResponsesHeaders(),
      signal: controller2.signal,
    }).catch(() => null);
    clearTimeout(timeout2);

    if (optionsRes) {
      // Any response from OPTIONS means the endpoint exists
      responsesEndpointValidated = true;
      return true;
    }

    // Both probes failed completely - assume endpoint is valid (fail-open)
    // The actual POST call will fail with a more meaningful error if needed
    logger.warn("[openai-responses] Both HEAD and OPTIONS probes failed, assuming endpoint is available (fail-open)");
    responsesEndpointValidated = true;
    return true;
  } catch (error) {
    // On any error during probe, assume endpoint is valid (fail-open)
    // This is safer than blocking the entire feature
    logger.warn("[openai-responses] Probe error, assuming endpoint is available (fail-open):", 
      error instanceof Error ? error.message : String(error));
    responsesEndpointValidated = true;
    return true;
  }
}

export type ResponseContentBlock = {
  type: string;
  [key: string]: UntypedJson;
};

export type ResponseMessageBlock = {
  role?: string;
  content?: ResponseContentBlock[] | string;
};

export type OpenAIResponsePayload = {
  output?: ResponseMessageBlock[];
  response?: {
    output?: ResponseMessageBlock[];
  };
  events?: OpenAIStreamEvent[];
  [key: string]: UntypedJson;
};

export type OpenAIStreamEvent = {
  event: string;
  data: Record<string, UntypedJson>;
};

export const callOpenAiResponses = async (
  payload: Record<string, UntypedJson>,
  handlers?: {
    onEvent?: (event: OpenAIStreamEvent) => void;
    onTextDelta?: (text: string) => void;
  },
): Promise<OpenAIResponsePayload> => {
  const allowed = await ensureResponsesEndpointIsAllowed();
  if (!allowed) {
    throw new Error("OpenAI Responses endpoint not supported (405 or probe failed)");
  }

  // Filter out invalid parameters that OpenAI doesn't recognize
  // Common issues: tool_config (should use tools array), timeout_ms (internal only)
  const sanitizedPayload = Object.fromEntries(
    Object.entries(payload).filter(([key]) => {
      // List of known invalid parameters for OpenAI Responses API
      const invalidParams = ["timeout_ms", "tool_config"];
      if (invalidParams.includes(key)) {
        logger.warn(`[openai-responses] Removing invalid parameter: ${key}`);
        return false;
      }
      return true;
    })
  );

  // Debug log to identify payload issues in development
  if (process.env.NODE_ENV === "development") {
    logger.debug("[openai-responses] Sending payload keys:", Object.keys(sanitizedPayload));
    // Log tool structure to debug format issues
    if (Array.isArray(sanitizedPayload.tools)) {
      logger.debug("[openai-responses] Tools count:", sanitizedPayload.tools.length);
      logger.debug("[openai-responses] First tool:", JSON.stringify(sanitizedPayload.tools[0], null, 2));
    }
  }

  const controller = new AbortController();
  const timeoutMs = clampTimeout(Number(payload["timeout_ms"] ?? DEFAULT_OPENAI_TIMEOUT_MS));
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const response = await fetch(responsesEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...buildResponsesHeaders(),
    },
    body: JSON.stringify(sanitizedPayload),
    signal: controller.signal,
  });

  clearTimeout(timer);

  // Handle non-OK responses (including prompt variable errors) before streaming logic
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    let parsed = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = null;
    }

    const errorCode = parsed?.error?.code ?? parsed?.error?.type;
    const message = parsed?.error?.message ?? text;

    // Common failure: prompt variable mismatch. Retry once without variables.
    const isPromptVariableError = errorCode === "prompt_variable_unknown" ||
      (typeof message === "string" && message.includes("Unknown prompt variables"));

    if (isPromptVariableError) {
      logger.warn("[openai-responses] Removing prompt.variables and retrying after 400 error");
      const retryPayload = { ...sanitizedPayload };
      if (retryPayload.prompt && typeof retryPayload.prompt === "object") {
        retryPayload.prompt = { ...(retryPayload.prompt as Record<string, UntypedJson>) };
        delete (retryPayload.prompt as Record<string, UntypedJson>).variables;
      }

      const retryResponse = await fetch(responsesEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...buildResponsesHeaders(),
        },
        body: JSON.stringify(retryPayload),
        signal: controller.signal,
      });

      if (payload.stream === true) {
        return await streamOpenAiResponses(retryResponse, handlers);
      }

      if (!retryResponse.ok) {
        const retryText = await retryResponse.text().catch(() => "");
        throw new Error(
          `OpenAI Responses API retry failed with status ${retryResponse.status}${retryText ? `: ${retryText}` : ""}`,
        );
      }
      return (await retryResponse.json()) as OpenAIResponsePayload;
    }

    throw new Error(
      `OpenAI Responses API request failed with status ${response.status}${message ? `: ${message}` : ""}`,
    );
  }

  // If the caller requests streaming (stream: true), parse the SSE stream to maintain compatibility.
  if (payload.stream === true) {
    try {
      return await streamOpenAiResponses(response, handlers);
    } catch (error) {
      if (error instanceof ResponsesProtocolError) {
        // Fallback to non-streaming request to preserve correctness when upstream violates the protocol.
        const nonStreamPayload = { ...payload, stream: false };
        const fallbackResponse = await fetch(responsesEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...buildResponsesHeaders(),
          },
          body: JSON.stringify(nonStreamPayload),
          signal: controller.signal,
        });

        if (!fallbackResponse.ok) {
          const text = await fallbackResponse.text().catch(() => "");
          throw new Error(
            `OpenAI Responses API fallback request failed with status ${fallbackResponse.status}${text ? `: ${text}` : ""}`,
          );
        }

        return (await fallbackResponse.json()) as OpenAIResponsePayload;
      }
      throw error;
    }
  }

  return (await response.json()) as OpenAIResponsePayload;
};

/**
 * Stream the OpenAI Responses SSE payload and rebuild a simplified OpenAIResponsePayload.
 * This preserves downstream expectations while enabling latency reduction.
 */
export const streamOpenAiResponses = async (
  response: Response,
  handlers?: {
    onEvent?: (event: OpenAIStreamEvent) => void;
    onTextDelta?: (text: string) => void;
  },
): Promise<OpenAIResponsePayload> => {
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `OpenAI Responses API stream failed with status ${response.status}${text ? `: ${text}` : ""}`,
    );
  }

  if (!response.body) {
    throw new Error("OpenAI Responses API stream returned an empty body.");
  }

  const decoder = new TextDecoder("utf-8");
  const reader = response.body.getReader();
  let buffer = "";
  let aggregatedText = "";
  const events: OpenAIStreamEvent[] = [];
  let completedResponse: ResponseMessageBlock[] | undefined;

  const computeDelta = (parsed: Record<string, UntypedJson>): string => {
    if (typeof parsed.delta === "string") return parsed.delta;
    if (typeof parsed.text === "string") {
      const text = parsed.text;
      // Some gateways send cumulative text instead of token deltas; accept only monotonic growth.
      if (text.startsWith(aggregatedText)) {
        return text.slice(aggregatedText.length);
      }
      throw new ResponsesProtocolError(
        "Responses stream returned non-monotonic cumulative text; aborting stream to maintain output integrity.",
      );
    }
    throw new ResponsesProtocolError(
      "Responses stream missing delta/text for response.output_text.delta event.",
    );
  };

  const flushEvents = () => {
    const segments = buffer.split("\n\n");
    // keep last partial segment in buffer
    buffer = segments.pop() ?? "";

    for (const segment of segments) {
      const lines = segment.split("\n").filter(Boolean);
      let eventName = "message";
      const dataParts: string[] = [];

      for (const line of lines) {
        if (line.startsWith("event:")) {
          eventName = line.replace(/^event:\s*/, "");
        } else if (line.startsWith("data:")) {
          dataParts.push(line.replace(/^data:\s*/, ""));
        }
      }

      if (!dataParts.length) continue;

      try {
        const parsed = JSON.parse(dataParts.join("\n")) as Record<string, UntypedJson>;
        const evt: OpenAIStreamEvent = { event: eventName, data: parsed };
        events.push(evt);
        handlers?.onEvent?.(evt);

        if (eventName === "response.output_text.delta") {
          const delta = computeDelta(parsed);
          if (delta.length > 0) {
            aggregatedText += delta;
            handlers?.onTextDelta?.(delta);
          }
        } else if (eventName === "response.completed") {
          // The completed payload typically includes { response: { output: [...] } }
          if (parsed && typeof parsed === "object") {
            const maybeResponse = (parsed).response ?? parsed;
            if (maybeResponse && Array.isArray((maybeResponse).output)) {
              completedResponse = (maybeResponse).output as ResponseMessageBlock[];
            }
          }
        }
      } catch {
        // swallow parse errors for robustness
      }
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    flushEvents();
  }

  // flush remaining buffer
  flushEvents();

  if (completedResponse) {
    return {
      output: completedResponse,
      response: { output: completedResponse },
      events,
    };
  }

  return {
    output: [
      {
        role: "assistant",
        content: [
          {
            type: "output_text",
            text: aggregatedText,
          },
        ],
      },
    ],
    events,
  };
};

const resolveOutputMessages = (
  payload: OpenAIResponsePayload,
): ResponseMessageBlock[] => {
  if (Array.isArray(payload.output) && payload.output.length > 0) {
    return payload.output;
  }
  if (payload.response && Array.isArray(payload.response.output)) {
    return payload.response.output;
  }
  return [];
};

export const extractTextFromOutput = (payload: OpenAIResponsePayload): string => {
  const messages = resolveOutputMessages(payload);
  const parts: string[] = [];

  for (const message of messages) {
    if (!message?.content) continue;
    if (typeof message.content === "string") {
      parts.push(message.content);
      continue;
    }
    for (const block of message.content) {
      if (block && block.type === "output_text" && typeof block.text === "string") {
        parts.push(block.text);
      } else if (block && block.type === "text" && typeof block.text === "string") {
        parts.push(block.text);
      }
    }
  }

  return parts.join("\n\n").trim();
};

export type ToolCallRecord = {
  type: string;
  name?: string;
  callId?: string;
  arguments?: UntypedJson;
  output?: UntypedJson;
};

export const extractToolCalls = (
  payload: OpenAIResponsePayload,
): ToolCallRecord[] => {
  const messages = resolveOutputMessages(payload);
  const records: ToolCallRecord[] = [];

  for (const message of messages) {
    if (!message?.content || typeof message.content === "string") continue;
    for (const block of message.content) {
      if (!block) continue;
      if (block.type === "tool_call") {
        records.push({
          type: block.type,
          name: typeof block.name === "string" ? block.name : undefined,
          callId: typeof block.call_id === "string" ? block.call_id : undefined,
          arguments: block.arguments,
        });
      } else if (block.type === "tool_result") {
        records.push({
          type: block.type,
          callId: typeof block.call_id === "string" ? block.call_id : undefined,
          output:
            block.output !== undefined
              ? block.output
              : block.result !== undefined
                ? block.result
                : block,
        });
      }
    }
  }

  return records;
};

export type ImageBlock = {
  url?: string;
  b64_json?: string;
  mime_type?: string;
  size?: string;
  prompt?: string;
  [key: string]: UntypedJson;
};

export const extractImagesFromOutput = (
  payload: OpenAIResponsePayload,
): ImageBlock[] => {
  const messages = resolveOutputMessages(payload);
  const images: ImageBlock[] = [];

  for (const message of messages) {
    if (!message?.content || typeof message.content === "string") continue;
    for (const block of message.content) {
      if (!block) continue;
      if (block.type === "output_image" && block.image && typeof block.image === "object") {
        images.push(block.image as ImageBlock);
      } else if (block.type === "image" && block.image && typeof block.image === "object") {
        images.push(block.image as ImageBlock);
      } else if (block.type === "image_url" && block.image_url) {
        images.push({ url: String(block.image_url) });
      }
    }
  }

  return images;
};
