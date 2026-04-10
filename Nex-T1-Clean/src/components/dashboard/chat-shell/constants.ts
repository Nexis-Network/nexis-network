export const CHAT_CONVERSATION_WIDTH_CLASS = "max-w-[750px]";
export const APP_CHAT_CONVERSATION_WIDTH_CLASS = "max-w-full";
export const APP_CHAT_EXPANDED_CONVERSATION_WIDTH_CLASS = "max-w-full";

type ResolveConversationWidthClassOptions = {
  layoutVariant?: "default" | "app";
  useExpandedConversationWidth?: boolean;
};

export function resolveConversationWidthClass({
  layoutVariant = "default",
  useExpandedConversationWidth = false,
}: ResolveConversationWidthClassOptions = {}) {
  if (layoutVariant === "app" && !useExpandedConversationWidth) {
    return APP_CHAT_CONVERSATION_WIDTH_CLASS;
  }

  if (layoutVariant === "app" && useExpandedConversationWidth) {
    return APP_CHAT_EXPANDED_CONVERSATION_WIDTH_CLASS;
  }

  return CHAT_CONVERSATION_WIDTH_CLASS;
}

export const REMOTE_COOLDOWN_MS = 60_000;
