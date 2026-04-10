"use client";

import { useMemo, useCallback } from "react";
import { DefaultChatTransport } from "ai";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { sanitizeUiMessagesForNativeChatRoute } from "@/modules/chat/controller/ui-message-sanitizer";
import { createChatHttpError } from "./chat-http-error";

export {
  ChatHttpError,
  createChatHttpError,
  extractChatHttpErrorMessage,
  type ChatHttpErrorKind,
  type ChatHttpErrorMetadata,
  type ChatHttpRetryPolicy,
} from "./chat-http-error";

type UseChatTransportOptions = {
  onConversationId?: (conversationId: string) => void;
  conversationId?: string | null;
};

type CancelActiveStreamResult = "cancelled" | "inactive";

function normalizeConversationId(value?: string | null): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function useChatTransport(api: string, options: UseChatTransportOptions = {}) {
  const { onConversationId, conversationId } = options;
  const buildAuthHeaders = useCallback(async (initHeaders?: HeadersInit) => {
    const headers = new Headers(initHeaders);
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return headers;
    }

    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token ?? null;
      if (accessToken) {
        headers.set("Authorization", `Bearer ${accessToken}`);
      }
    } catch {
      // ignore session fetch errors
    }

    return headers;
  }, []);

  const fetchWithCredentials = useCallback(
    async (url: string | URL | Request, init?: RequestInit) => {
      const headers = await buildAuthHeaders(init?.headers);

      const response = await fetch(url, {
        ...init,
        headers,
        credentials: "include",
      });

      if (!response.ok) {
        throw await createChatHttpError(response);
      }

      const conversationId = response.headers.get("x-conversation-id");
      if (conversationId && conversationId.trim().length > 0) {
        onConversationId?.(conversationId.trim());
      }

      return response;
    },
    [buildAuthHeaders, onConversationId],
  );

  const cancelActiveStream = useCallback(
    async (nextConversationId: string | null): Promise<CancelActiveStreamResult> => {
      const normalizedConversationId = normalizeConversationId(nextConversationId);
      if (!normalizedConversationId) {
        return "inactive";
      }

      const headers = await buildAuthHeaders();
      const response = await fetch(
        `${api}/${encodeURIComponent(normalizedConversationId)}/cancel`,
        {
          method: "POST",
          headers,
          credentials: "include",
        },
      );

      if (response.status === 202) {
        return "cancelled";
      }

      if (response.status === 204 || response.status === 404) {
        return "inactive";
      }

      throw await createChatHttpError(response);
    },
    [api, buildAuthHeaders],
  );

  const chatTransport = useMemo(
    () =>
      new DefaultChatTransport({
        api,
        credentials: "include",
        prepareSendMessagesRequest: async ({
          api: currentApi,
          id,
          messages,
          body,
          headers,
          credentials,
          trigger,
          messageId,
        }) => ({
          api: currentApi,
          body: {
            ...body,
            id,
            messages: sanitizeUiMessagesForNativeChatRoute(messages),
            trigger,
            messageId,
          },
          credentials: credentials ?? "include",
          headers: await buildAuthHeaders(headers),
        }),
        fetch: fetchWithCredentials,
        prepareReconnectToStreamRequest: async ({ api: currentApi, headers, credentials, id }) => {
          const reconnectConversationId =
            typeof conversationId === "string" && conversationId.trim().length > 0
              ? conversationId.trim()
              : id;

          return {
            api: `${currentApi}/${reconnectConversationId}/stream`,
            credentials: credentials ?? "include",
            headers: await buildAuthHeaders(headers),
          };
        },
      }),
    [api, buildAuthHeaders, conversationId, fetchWithCredentials],
  );

  return {
    chatTransport,
    cancelActiveStream,
  };
}
