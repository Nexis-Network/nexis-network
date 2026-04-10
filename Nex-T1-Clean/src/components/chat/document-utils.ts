"use client";

import type { ConversationMessage } from "@/components/dashboard/chat-types";

type ConversationPart = NonNullable<ConversationMessage["parts"]>[number];

export type CreateDocumentData = {
  title?: string;
  status?: string;
  content?: string;
};

export type CreateDocumentPart = {
  type: "data-createDocument";
  id: string;
  data: CreateDocumentData;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isCreateDocumentPart(
  part: ConversationPart,
): part is CreateDocumentPart {
  const candidate = part as {
    type?: unknown;
    id?: unknown;
    data?: unknown;
  };

  if (candidate.type !== "data-createDocument") return false;
  if (typeof candidate.id !== "string") return false;
  if (!isRecord(candidate.data)) return false;

  const { title, status, content } = candidate.data;

  return (
    (title === undefined || typeof title === "string") &&
    (status === undefined || typeof status === "string") &&
    (content === undefined || typeof content === "string")
  );
}

export function findOpenedDocumentPart(
  messages: ConversationMessage[],
  openedDocumentId: string | null,
): CreateDocumentPart | null {
  if (!openedDocumentId) {
    return null;
  }

  const parts = messages
    .flatMap((message) => message.parts ?? [])
    .filter(isCreateDocumentPart)
    .filter((part) => part.id === openedDocumentId);

  return parts[parts.length - 1] ?? null;
}
