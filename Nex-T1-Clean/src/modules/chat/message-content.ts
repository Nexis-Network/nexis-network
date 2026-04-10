function stringifyContentPart(part: unknown): string {
  if (typeof part === "string") {
    return part;
  }

  if (typeof part === "number" || typeof part === "boolean") {
    return String(part);
  }

  if (part && typeof part === "object") {
    const text = (part as { text?: unknown }).text;
    if (typeof text === "string") {
      return text;
    }

    try {
      return JSON.stringify(part);
    } catch {
      return "";
    }
  }

  return "";
}

export function stringifyChatMessageContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content.map((part) => stringifyContentPart(part)).join(" ");
  }

  if (typeof content === "number" || typeof content === "boolean") {
    return String(content);
  }

  return "";
}
