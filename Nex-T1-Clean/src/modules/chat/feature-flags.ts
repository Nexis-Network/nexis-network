const STREAMING_RESPONSE_HEADERS = {
  "Cache-Control": "no-cache, no-transform",
} as const;

export function getChatStreamingResponseHeaders(
  conversationId?: string | null,
): HeadersInit {
  return conversationId
    ? {
        ...STREAMING_RESPONSE_HEADERS,
        "x-conversation-id": conversationId,
      }
    : STREAMING_RESPONSE_HEADERS;
}
