export const LOCAL_CONVERSATION_PREFIX = "local-conversation-";

export function isLocalConversationId(
  value?: string | null,
): value is string {
  return (
    typeof value === "string" &&
    value.startsWith(LOCAL_CONVERSATION_PREFIX) &&
    value.length > LOCAL_CONVERSATION_PREFIX.length
  );
}

export function createLocalConversationId(): string {
  return `${LOCAL_CONVERSATION_PREFIX}${crypto.randomUUID()}`;
}
