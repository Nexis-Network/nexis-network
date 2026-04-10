import { type UIMessage } from "ai";

import { getErrorMessage } from "@/lib/utils/error";
import { findLatestMessageByRole } from "@/modules/chat/message-search";
import {
  ChatExecutionPreferencesSchema,
  type ChatExecutionPreferences,
} from "@/modules/chat/execution-preferences";
import {
  appChatToolContract,
  registerAppChatToolContractFromMessages,
} from "@/modules/chat/app-chat-tool-contract";
import { validateInputUIMessages } from "@/modules/chat/persistence/ui-message-codec";
import type { JsonObject } from "@/types/json";

export type ChatUIRequestBody = {
  messages: UIMessage[];
  id?: string;
  marketContext?: string;
  model?: string;
  sessionId?: string;
  systemPromptProfileId?: string;
  walletContext?: JsonObject;
  executionPreferences?: ChatExecutionPreferences;
};

export type ParsedChatUIRequest = {
  body: ChatUIRequestBody;
  latestUserMessage: UIMessage | null;
};

type ParseChatUIRequestResult =
  | { ok: true; value: ParsedChatUIRequest }
  | { ok: false; error: string };

function isJsonObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export async function parseChatUIRequest(
  request: Request,
): Promise<ParseChatUIRequestResult> {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch (error) {
    return { ok: false, error: getErrorMessage(error, "Invalid JSON") };
  }

  if (!isJsonObject(rawBody) || !Array.isArray(rawBody.messages)) {
    return { ok: false, error: "Payload must include a messages array." };
  }

  const executionPreferencesResult = ChatExecutionPreferencesSchema.safeParse(
    rawBody.executionPreferences,
  );

  try {
    registerAppChatToolContractFromMessages(rawBody.messages);
    const uiMessages = await validateInputUIMessages(rawBody.messages, {
      tools: appChatToolContract,
    });

    const id = readOptionalString(rawBody.id);
    const marketContext = readOptionalString(rawBody.marketContext);
    const model = readOptionalString(rawBody.model);
    const sessionId = readOptionalString(rawBody.sessionId);
    const systemPromptProfileId = readOptionalString(
      rawBody.systemPromptProfileId,
    );
    const walletContext = isJsonObject(rawBody.walletContext)
      ? rawBody.walletContext
      : undefined;

    return {
      ok: true,
      value: {
        body: {
          messages: uiMessages,
          ...(id ? { id } : {}),
          ...(marketContext ? { marketContext } : {}),
          ...(model ? { model } : {}),
          ...(sessionId ? { sessionId } : {}),
          ...(systemPromptProfileId ? { systemPromptProfileId } : {}),
          ...(walletContext ? { walletContext } : {}),
          ...(executionPreferencesResult.success
            ? { executionPreferences: executionPreferencesResult.data }
            : {}),
        },
        latestUserMessage: findLatestMessageByRole(uiMessages, "user"),
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: getErrorMessage(error, "Invalid messages payload"),
    };
  }
}
