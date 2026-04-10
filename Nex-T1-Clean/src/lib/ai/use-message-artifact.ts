"use client";

import { useEffect, useMemo, useRef } from "react";
import type { NexChatMessage } from "@/types/chat-message";

export type MessageArtifactStatus = "idle" | "loading" | "streaming" | "complete" | "error";

export type MessageArtifactRecord<TData> = {
  id: string;
  type: string;
  status: MessageArtifactStatus;
  payload: TData;
  version: number;
  createdAt: number;
  updatedAt?: number;
  progress?: number;
  error?: string;
};

export type MessageArtifactCallbacks<TData> = {
  onUpdate?: (newData: TData, oldData: TData | null) => void;
  onComplete?: (data: TData) => void;
  onError?: (error: string, data: TData | null) => void;
  onProgress?: (progress: number, data: TData | null) => void;
  onStatusChange?: (newStatus: MessageArtifactStatus, oldStatus: MessageArtifactStatus) => void;
};

export type UseMessageArtifactReturn<TData> = {
  data: TData | null;
  status: MessageArtifactStatus;
  progress?: number;
  error?: string;
  isActive: boolean;
  hasData: boolean;
  artifact: MessageArtifactRecord<TData> | null;
};

type ArtifactPayloadValidator<TData> = (data: unknown) => TData;

export type ArtifactDefinitionLike<TData = unknown> = {
  id: string;
  validate?: ArtifactPayloadValidator<TData>;
};

type PartLike = {
  type?: string;
  data?: UntypedJson;
  output?: UntypedJson;
  result?: UntypedJson;
  parts?: UntypedJson[];
};

type NestedPartContainer = {
  parts?: UntypedJson[];
};

export function normalizeArtifactStatus(status: unknown): MessageArtifactStatus {
  switch (status) {
    case "loading":
    case "streaming":
    case "complete":
    case "error":
      return status;
    default:
      return "complete";
  }
}

export function isNewerArtifact<TData>(
  current: MessageArtifactRecord<TData>,
  incoming: MessageArtifactRecord<TData>,
): boolean {
  if (incoming.version !== current.version) {
    return incoming.version > current.version;
  }

  const currentUpdatedAt = current.updatedAt ?? current.createdAt;
  const incomingUpdatedAt = incoming.updatedAt ?? incoming.createdAt;

  if (incomingUpdatedAt !== currentUpdatedAt) {
    return incomingUpdatedAt > currentUpdatedAt;
  }

  return incoming.createdAt > current.createdAt;
}

export function normalizeArtifactRecord<TData>(
  artifactId: string,
  candidate: unknown,
  validate?: ArtifactPayloadValidator<TData>,
): MessageArtifactRecord<TData> | null {
  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  const record = candidate as Record<string, UntypedJson>;
  const rawPayload = "payload" in record ? record.payload : candidate;
  let payload: TData;

  if (validate) {
    try {
      payload = validate(rawPayload);
    } catch {
      return null;
    }
  } else {
    payload = rawPayload as TData;
  }

  const id =
    typeof record.id === "string" && record.id.length > 0
      ? record.id
      : `${artifactId}-artifact`;

  return {
    id,
    type:
      typeof record.type === "string" && record.type.length > 0
        ? record.type
        : artifactId,
    status: normalizeArtifactStatus(record.status),
    payload,
    version: typeof record.version === "number" ? record.version : 0,
    createdAt: typeof record.createdAt === "number" ? record.createdAt : 0,
    updatedAt: typeof record.updatedAt === "number" ? record.updatedAt : undefined,
    progress: typeof record.progress === "number" ? record.progress : undefined,
    error: typeof record.error === "string" ? record.error : undefined,
  };
}

function visitNestedParts<TData>(
  parts: unknown,
  artifactPartType: string,
  artifactId: string,
  artifactsById: Map<string, MessageArtifactRecord<TData>>,
  validate?: ArtifactPayloadValidator<TData>,
): void {
  if (!Array.isArray(parts)) {
    return;
  }

  for (const part of parts) {
    if (!part || typeof part !== "object") {
      continue;
    }

    const typedPart = part as PartLike;

    if (typedPart.type === artifactPartType) {
      const artifactRecord = normalizeArtifactRecord<TData>(
        artifactId,
        typedPart.data ?? typedPart.output ?? typedPart.result,
        validate,
      );

      if (artifactRecord) {
        const current = artifactsById.get(artifactRecord.id);
        if (!current || isNewerArtifact(current, artifactRecord)) {
          artifactsById.set(artifactRecord.id, artifactRecord);
        }
      }
    }

    visitNestedParts<TData>(
      typedPart.parts,
      artifactPartType,
      artifactId,
      artifactsById,
      validate,
    );

    const nestedValues = [typedPart.data, typedPart.output, typedPart.result];
    for (const nestedValue of nestedValues) {
      if (!nestedValue || typeof nestedValue !== "object") {
        continue;
      }

      visitNestedParts<TData>(
        (nestedValue as NestedPartContainer).parts,
        artifactPartType,
        artifactId,
        artifactsById,
        validate,
      );
    }
  }
}

export function extractArtifactsFromMessages<TData>(
  messages: readonly NexChatMessage[],
  artifactId: string,
  validate?: ArtifactPayloadValidator<TData>,
): MessageArtifactRecord<TData>[] {
  const artifactsById = new Map<string, MessageArtifactRecord<TData>>();
  const artifactPartType = `data-artifact-${artifactId}`;

  for (const message of messages) {
    visitNestedParts<TData>(
      message.parts,
      artifactPartType,
      artifactId,
      artifactsById,
      validate,
    );
  }

  return Array.from(artifactsById.values()).sort((left, right) => {
    if (left.createdAt !== right.createdAt) {
      return right.createdAt - left.createdAt;
    }

    return right.version - left.version;
  });
}

export function useMessageArtifact<TData>(
  messages: readonly NexChatMessage[],
  artifactDef: ArtifactDefinitionLike<TData>,
  callbacks?: MessageArtifactCallbacks<TData>,
): UseMessageArtifactReturn<TData> {
  const callbacksRef = useRef(callbacks);
  const previousArtifactRef = useRef<MessageArtifactRecord<TData> | null>(null);

  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  const latestArtifact = useMemo(
    () =>
      extractArtifactsFromMessages<TData>(
        messages,
        artifactDef.id,
        artifactDef.validate,
      )[0] ?? null,
    [artifactDef.id, artifactDef.validate, messages],
  );

  useEffect(() => {
    if (!latestArtifact) {
      previousArtifactRef.current = null;
      return;
    }

    const previousArtifact = previousArtifactRef.current;
    const previousData = previousArtifact?.payload ?? null;
    const previousStatus = previousArtifact?.status ?? "idle";

    if (
      previousArtifact &&
      previousArtifact.id === latestArtifact.id &&
      previousArtifact.version === latestArtifact.version &&
      previousArtifact.updatedAt === latestArtifact.updatedAt
    ) {
      return;
    }

    callbacksRef.current?.onUpdate?.(latestArtifact.payload, previousData);

    if (latestArtifact.progress !== previousArtifact?.progress) {
      callbacksRef.current?.onProgress?.(latestArtifact.progress ?? 0, latestArtifact.payload);
    }

    if (latestArtifact.status !== previousStatus) {
      callbacksRef.current?.onStatusChange?.(latestArtifact.status, previousStatus);
    }

    if (latestArtifact.status === "complete" && previousStatus !== "complete") {
      callbacksRef.current?.onComplete?.(latestArtifact.payload);
    }

    if (latestArtifact.status === "error" && previousStatus !== "error") {
      callbacksRef.current?.onError?.(
        latestArtifact.error ?? "Unknown artifact error",
        latestArtifact.payload,
      );
    }

    previousArtifactRef.current = latestArtifact;
  }, [latestArtifact]);

  return useMemo(
    () => ({
      data: latestArtifact?.payload ?? null,
      status: latestArtifact?.status ?? "idle",
      progress: latestArtifact?.progress,
      error: latestArtifact?.error,
      isActive:
        latestArtifact?.status === "loading" || latestArtifact?.status === "streaming",
      hasData: latestArtifact !== null,
      artifact: latestArtifact,
    }),
    [latestArtifact],
  );
}
