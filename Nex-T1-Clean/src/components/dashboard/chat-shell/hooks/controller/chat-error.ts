export const toUserFacingChatError = (error: Error): string => {
  const message = error.message || "Unknown chat error";
  const lower = message.toLowerCase();

  if (
    lower.includes("cloudflare 524") ||
    lower.includes("error code 524") ||
    lower.includes("timed out")
  ) {
    return "Chat request timed out. Please try again in a minute.";
  }

  if (lower.includes("<!doctype html") || lower.includes("<html")) {
    return "Chat request failed with an upstream HTML error. Please retry.";
  }

  return message.length > 220 ? `${message.slice(0, 220)}...` : message;
};
