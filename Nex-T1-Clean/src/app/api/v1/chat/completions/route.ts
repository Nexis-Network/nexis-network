import { extractClientIP } from "@/lib/request-utils";
import { authenticatePublicApiKey } from "@/server/security/public-api-key-auth";
import { enforcePublicApiRateLimit } from "@/server/security/public-api-rate-limit";
import { executeDeveloperResponse } from "@/server/services/developer-api/responses-service";

import {
  publicErrorResponse,
  publicJsonResponse,
  publicValidationErrorResponse,
} from "@/app/api/v1/_shared/public-api-response";
import { chatCompletionsSchema } from "@/app/api/v1/chat/completions/route.schema";

function mergeHeaders(response: Response, headers: Record<string, string>) {
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

function formatPromptFromMessages(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
): string {
  return messages.map((message) => `${message.role.toUpperCase()}: ${message.content}`).join("\n\n");
}

export async function POST(request: Request) {
  const rawBody = await request.json().catch(() => null);
  const parsed = chatCompletionsSchema.safeParse(rawBody);
  if (!parsed.success) {
    return publicValidationErrorResponse(parsed.error);
  }

  const auth = await authenticatePublicApiKey({
    authorizationHeader: request.headers.get("authorization"),
    productId: parsed.data.model,
    requestIp: extractClientIP(request),
  });
  if (!auth.ok) {
    return publicErrorResponse({
      code: auth.code,
      message: auth.message,
      status: auth.status,
    });
  }

  const rateLimit = await enforcePublicApiRateLimit(auth.context);
  if (!rateLimit.ok) {
    return mergeHeaders(
      publicErrorResponse({
        code: rateLimit.code,
        message: rateLimit.message,
        status: rateLimit.status,
      }),
      rateLimit.headers,
    );
  }

  try {
    const result = await executeDeveloperResponse({
      auth: auth.context,
      request: {
        model: parsed.data.model,
        input: formatPromptFromMessages(parsed.data.messages),
        maxOutputTokens: parsed.data.max_tokens,
        temperature: parsed.data.temperature,
        metadata: parsed.data.metadata ?? null,
      },
      requestKind: "chat.completions",
    });

    const data = result.response;
    const text =
      ((((data.output as UntypedJson[])?.[0] as Record<string, UntypedJson>)?.content as UntypedJson[])?.[0] as Record<string, UntypedJson>)?.text ??
      "";
    const usage = (data.usage as Record<string, number>) ?? {};
    const completion = {
      id: `chatcmpl_${String(data.id).replace(/^resp_/, "")}`,
      object: "chat.completion",
      created: data.created,
      model: data.model,
      choices: [
        {
          index: 0,
          finish_reason: "stop",
          message: {
            role: "assistant",
            content: text,
          },
        },
      ],
      usage: {
        prompt_tokens: usage.input_tokens ?? 0,
        completion_tokens: usage.output_tokens ?? 0,
        total_tokens: usage.total_tokens ?? 0,
      },
    };

    return mergeHeaders(
      mergeHeaders(publicJsonResponse(completion), result.headers),
      rateLimit.headers,
    );
  } catch (error) {
    return mergeHeaders(
      publicErrorResponse({
        code: "INTERNAL_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to execute chat completion.",
        status: 500,
      }),
      rateLimit.headers,
    );
  }
}
