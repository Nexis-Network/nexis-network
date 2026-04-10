/**
 * Attachment types and builders for the context-pipeline message builder.
 *
 * Each attachment represents a unit of injected context (memory, skill discovery,
 * MCP resource content, or project instructions) that is formatted as a tagged
 * user message so the model can distinguish injected context from real user turns.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AttachmentType =
  | "memory"
  | "skill"
  | "mcp_resource"
  | "project_instructions";

export type AttachmentScope = "session" | "global" | "project";

export type Attachment = {
  /** Discriminant for the kind of injected context. */
  type: AttachmentType;
  /** The raw content to inject (markdown, plain text, XML, etc.). */
  content: string;
  /** Human-readable origin label (e.g. file path, MCP server name). */
  source: string;
  /** Visibility scope — used downstream for compaction priority. */
  scope: AttachmentScope;
};

export type AttachmentMessage = {
  role: "user";
  content: string;
  /** Marks the message as injected metadata so compaction can treat it differently. */
  isMeta: true;
};

// ---------------------------------------------------------------------------
// Tag mapping
// ---------------------------------------------------------------------------

const TAG_BY_TYPE: Record<AttachmentType, string> = {
  memory: "memory-context",
  skill: "skill-discovery",
  mcp_resource: "mcp-resource",
  project_instructions: "project-instructions",
};

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

/**
 * Format a single {@link Attachment} as a user message wrapped in a
 * `<system-reminder>` block with a typed inner tag.
 *
 * The outer `<system-reminder>` wrapper matches the convention used by
 * `prependUserContext` so the model treats it as injected context rather
 * than a real user turn.
 */
export function buildAttachmentMessage(attachment: Attachment): AttachmentMessage {
  const tag = TAG_BY_TYPE[attachment.type];

  const body = [
    `<system-reminder>`,
    `<${tag} source="${escapeAttr(attachment.source)}" scope="${attachment.scope}">`,
    attachment.content,
    `</${tag}>`,
    `</system-reminder>`,
  ].join("\n");

  return {
    role: "user",
    content: body,
    isMeta: true,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal attribute-value escaping (quotes and angle brackets). */
function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
