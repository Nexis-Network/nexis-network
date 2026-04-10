type MessageLike = {
  id: string;
  role?: "user" | "assistant" | string;
  content?: string;
  status?: "pending" | "ready" | "error" | string;
  parts?: unknown[];
  payloads?: unknown[];
  sources?: unknown[];
};

const tailFingerprint = (text: string, width = 24): string => {
  if (!text) return "";
  return text.slice(Math.max(0, text.length - width));
};

function buildPartsFingerprint(parts: unknown[] | undefined): string {
  if (!Array.isArray(parts) || parts.length === 0) {
    return "";
  }

  const lastPart = parts[parts.length - 1];
  if (!lastPart || typeof lastPart !== "object") {
    return String(parts.length);
  }

  const record = lastPart as {
    type?: unknown;
    state?: unknown;
    toolName?: unknown;
    text?: unknown;
  };

  return [
    parts.length,
    typeof record.type === "string" ? record.type : "",
    typeof record.state === "string" ? record.state : "",
    typeof record.toolName === "string" ? record.toolName : "",
    typeof record.text === "string" ? tailFingerprint(record.text) : "",
  ].join(":");
}

/**
 * Builds a stable trigger string that changes when the visible tail of the
 * latest message changes (streaming deltas, payload count, source count).
 */
export function buildAutoScrollTrigger(messages: readonly MessageLike[]): string {
  if (!messages.length) {
    return "";
  }

  const last = messages[messages.length - 1];
  const content = typeof last.content === "string" ? last.content : "";
  const payloadCount = Array.isArray(last.payloads) ? last.payloads.length : 0;
  const sourceCount = Array.isArray(last.sources) ? last.sources.length : 0;

  return [
    last.id,
    last.role ?? "",
    last.status ?? "",
    content.length,
    tailFingerprint(content),
    buildPartsFingerprint(last.parts),
    payloadCount,
    sourceCount,
  ].join("|");
}
