import type { V0Message } from "@/lib/v0/types";

import type { CreateMessageRecord, CreateNormalizedMessage, CreateRenderablePart } from "./types";

type BinaryNode = string | [string, Record<string, unknown>, ...BinaryNode[]];

function safeParseBinary(content: string, experimentalContent?: Array<unknown[]>): Array<unknown[]> {
  if (Array.isArray(experimentalContent) && experimentalContent.length > 0) {
    return experimentalContent;
  }

  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function renderChildren(children: BinaryNode[]): string {
  return children.map(renderNode).join("");
}

function renderList(tag: string, children: BinaryNode[]): string {
  const ordered = tag === "ol";
  return children
    .map((child, index) => {
      const rendered = renderNode(child).trim();
      const prefix = ordered ? `${index + 1}. ` : "- ";
      return rendered ? `${prefix}${rendered}` : "";
    })
    .filter(Boolean)
    .join("\n");
}

function renderNode(node: BinaryNode): string {
  if (typeof node === "string") {
    return node;
  }

  const [tag, props, ...children] = node;
  const text = renderChildren(children);

  if (tag === "p") return `${text}\n\n`;
  if (tag === "br") return "\n";
  if (tag === "strong" || tag === "b") return `**${text}**`;
  if (tag === "em" || tag === "i") return `*${text}*`;
  if (tag === "code") return `\`${text}\``;
  if (tag === "blockquote") return `> ${text}\n\n`;
  if (/^h[1-6]$/.test(tag)) return `${"#".repeat(Number(tag.slice(1)))} ${text}\n\n`;
  if (tag === "a" && typeof props.href === "string") return `[${text}](${props.href})`;
  if (tag === "li") return text;
  if (tag === "ul" || tag === "ol") return `${renderList(tag, children)}\n\n`;
  if (tag === "Codeblock") {
    const language = typeof props.lang === "string" ? props.lang : "text";
    return `\n\`\`\`${language}\n${text}\n\`\`\`\n\n`;
  }

  return text;
}

export function extractV0MessageText(message: Pick<V0Message, "content" | "experimental_content" | "attachments">): string {
  const binary = safeParseBinary(message.content, message.experimental_content);
  if (binary.length === 0) {
    return message.content;
  }

  const chunks = binary
    .map((segment) => {
      if (!Array.isArray(segment) || segment.length < 2) {
        return "";
      }

      const [type, payload] = segment;
      if (type === 0 && Array.isArray(payload)) {
        return payload.map((node) => renderNode(node as BinaryNode)).join("");
      }
      if (type === 2 && typeof payload === "string") {
        return `$${payload}$`;
      }
      if (type === 3 && typeof payload === "string") {
        return `$$\n${payload}\n$$`;
      }
      return "";
    })
    .filter(Boolean);

  if (Array.isArray(message.attachments) && message.attachments.length > 0) {
    const attachmentText = message.attachments
      .map((attachment) => {
        const label = attachment.name || attachment.url;
        return `[${label}](${attachment.url})`;
      })
      .join("\n");

    if (attachmentText) {
      chunks.push(attachmentText);
    }
  }

  return chunks.join("\n\n").trim();
}

export function buildCreateMessageRecord(
  projectId: string,
  message: V0Message,
  streamMode: boolean,
): Omit<CreateMessageRecord, "id" | "created_at" | "updated_at"> {
  return {
    project_id: projectId,
    provider_message_id: message.id,
    role: message.role,
    content_raw: {
      content: message.content,
      experimental_content: message.experimental_content ?? null,
      attachments: message.attachments ?? [],
      type: message.type,
      finishReason: message.finishReason ?? null,
    },
    content_text: extractV0MessageText(message),
    stream_mode: streamMode,
  };
}

export function normalizeCreateMessage(record: CreateMessageRecord): CreateNormalizedMessage {
  const raw = (record.content_raw ?? {}) as {
    attachments?: Array<{ url: string; name?: string; contentType?: string }>;
  };

  const parts: CreateRenderablePart[] = [];
  if (record.content_text.trim().length > 0) {
    parts.push({ type: "text", text: record.content_text });
  }

  for (const attachment of raw.attachments ?? []) {
    if (attachment.url) {
      parts.push({
        type: "attachment",
        url: attachment.url,
        name: attachment.name,
        contentType: attachment.contentType,
      });
    }
  }

  return {
    id: record.id,
    providerMessageId: record.provider_message_id,
    role: record.role,
    createdAt: record.created_at,
    contentText: record.content_text,
    parts,
  };
}
