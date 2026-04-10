"use client";

import { type ChatStatus } from "ai";

import type { AssistantPayload } from "@/components/dashboard/chat-types";

import type { SyncMessage } from "./chat-session-sync.types";

export function checksum(input: string): number {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function signatureForValue(value: unknown): string {
  try {
    const serialized = JSON.stringify(value ?? null);
    return `${serialized.length}:${checksum(serialized).toString(16)}`;
  } catch {
    const fallback = String(value ?? "");
    return `${fallback.length}:${checksum(fallback).toString(16)}`;
  }
}

export function summarizePayload(payload: AssistantPayload): string {
  if (payload.type === "tool-execution") {
    return [
      payload.type,
      payload.toolCallId ?? "",
      payload.toolName,
      payload.status,
      signatureForValue(payload.input ?? null),
      signatureForValue(payload.output ?? null),
      payload.error ?? "",
    ].join(":");
  }

  return `${payload.type}:${signatureForValue(payload)}`;
}

export function buildSyncSignature(
  messages: SyncMessage[],
  status: ChatStatus,
): string {
  const last = messages.at(-1);
  const lastId = typeof last?.id === "string" ? last.id : "";
  const lastRole = typeof last?.role === "string" ? last.role : "";
  const lastContent =
    typeof last?.content === "string" ? last.content.length : 0;
  const payloadSummary = Array.isArray(last?.payloads)
    ? last.payloads.map(summarizePayload).join("|")
    : "";
  const partsSummary = signatureForValue(last?.parts ?? []);
  const thoughtsSummary = Array.isArray(last?.thoughts)
    ? String(last.thoughts.length)
    : "0";
  const sourcesSummary = Array.isArray(last?.sources)
    ? String(last.sources.length)
    : "0";
  const payloadSignature = `${payloadSummary.length}:${checksum(payloadSummary).toString(16)}`;

  return `${messages.length}:${status}:${lastId}:${lastRole}:${lastContent}:${partsSummary}:${thoughtsSummary}:${sourcesSummary}:${payloadSignature}`;
}
