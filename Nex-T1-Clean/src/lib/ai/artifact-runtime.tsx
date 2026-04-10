"use client";

import { useArtifact as useSdkArtifact } from "@ai-sdk-tools/artifacts/client";
import { Provider as ChatStoreProvider } from "@ai-sdk-tools/store";
import type { UIMessage } from "ai";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type {
  ArtifactDefinitionLike,
  MessageArtifactCallbacks,
  MessageArtifactRecord,
  UseMessageArtifactReturn,
} from "@/lib/ai/use-message-artifact";
import {
  isNewerArtifact,
  normalizeArtifactRecord,
} from "@/lib/ai/use-message-artifact";
import {
  CANONICAL_ARTIFACT_CARD_TYPES,
  CANONICAL_IDE_ARTIFACT_TYPES,
} from "@/modules/chat/ui-message-parts";

export const OPEN_ARTIFACT_PANEL_EVENT = "openArtifactPanel";
const ARTIFACT_PART_PREFIX = "data-artifact-";
const DEFAULT_ARTIFACT_HEADER_TITLE = "Artifacts";

export type ArtifactRequestDetail = {
  messages: UIMessage[];
  query?: string;
  artifactId?: string;
  purpose?: string;
};

type ArtifactRegistry = Record<string, MessageArtifactRecord<UntypedJson>>;
type MessageWithParts = {
  parts?: unknown;
  payloads?: unknown;
};

type LatestMessageArtifact = {
  partType: string;
  artifact: MessageArtifactRecord<UntypedJson>;
};

const SYNCABLE_PAYLOAD_ARTIFACT_TYPES = new Set<string>([
  ...CANONICAL_ARTIFACT_CARD_TYPES,
  ...CANONICAL_IDE_ARTIFACT_TYPES,
]);

function normalizeArtifactId(value: string): string {
  const cleaned = value
    .replace(/^data-artifact-/, "")
    .trim()
    .toLowerCase();

  if (["table_editor", "table-editor", "table", "tableartifact"].includes(cleaned)) {
    return "table-editor";
  }

  if (
    [
      "market-terminal",
      "market_terminal",
      "marketterminal",
      "market-screener",
      "terminal-screener",
    ].includes(cleaned)
  ) {
    return "market-terminal";
  }

  if (["agent_wallets", "agent-wallets", "wallets"].includes(cleaned)) {
    return "agent-wallets";
  }

  if (["burn_rate", "burn-rate", "burn-rate-chart", "burnrate"].includes(cleaned)) {
    return "burn-rate-chart";
  }

  if (["pumpfun-v2", "pumpfun_v2"].includes(cleaned)) {
    return "pumpfun-v2";
  }

  return cleaned;
}

type ArtifactRuntimeContextValue = {
  artifacts: ArtifactRegistry;
  loading: boolean;
  error: string | null;
  canRetry: boolean;
  headerTitle: string;
  clearArtifacts: () => void;
  requestArtifact: (
    detail: ArtifactRequestDetail,
    options?: { resume?: boolean },
  ) => Promise<void>;
  retryLastRequest: () => void;
  upsertArtifact: (
    artifactId: string,
    candidate: unknown,
  ) => MessageArtifactRecord<UntypedJson> | null;
  upsertArtifactEnvelope: (
    partType: string,
    candidate: unknown,
  ) => MessageArtifactRecord<UntypedJson> | null;
};

const ArtifactRuntimeContext =
  createContext<ArtifactRuntimeContextValue | null>(null);

function deriveHeaderTitle(detail: ArtifactRequestDetail): string {
  if (typeof detail.purpose === "string" && detail.purpose.trim().length > 0) {
    return detail.purpose.trim();
  }

  const query = (detail.query ?? "").toLowerCase();
  if (
    /eth|btc|sol|usdt|dex|token|liquidity|memecoin|defi|crypto|pair|on-chain/.test(
      query,
    )
  ) {
    return "Crypto Market Analysis";
  }
  if (
    /\b[a-z]{1,5}\b/.test(query) &&
    /stock|nasdaq|nyse|ticker|share|price/.test(query)
  ) {
    return "Stock Market Analysis";
  }
  if (
    /financial|revenue|expenses|cash flow|runway|balance sheet|burn rate/.test(
      query,
    )
  ) {
    return "Financial Analysis";
  }
  return "Market Analysis";
}

function getArtifactIdFromPartType(partType: string): string | null {
  if (!partType.startsWith(ARTIFACT_PART_PREFIX)) {
    return null;
  }

  const artifactId = normalizeArtifactId(
    partType.slice(ARTIFACT_PART_PREFIX.length),
  );
  return artifactId.length > 0 ? artifactId : null;
}

function getNestedParts(candidate: unknown): unknown[] | undefined {
  if (!candidate || typeof candidate !== "object") {
    return undefined;
  }

  const record = candidate as { parts?: unknown };
  return Array.isArray(record.parts) ? (record.parts as unknown[]) : undefined;
}

function toSyncableArtifactRecord(
  artifactId: string,
  candidate: unknown,
  sequence: number,
): MessageArtifactRecord<UntypedJson> | null {
  const normalized = normalizeArtifactRecord<UntypedJson>(artifactId, candidate);
  if (!normalized) {
    return null;
  }

  const record =
    candidate && typeof candidate === "object"
      ? (candidate as Record<string, UntypedJson>)
      : null;

  const hasExplicitOrdering =
    typeof record?.version === "number" ||
    typeof record?.createdAt === "number" ||
    typeof record?.updatedAt === "number";

  if (hasExplicitOrdering) {
    return normalized;
  }

  return {
    ...normalized,
    id:
      typeof normalized.id === "string" && normalized.id.length > 0
        ? normalized.id
        : `${artifactId}-artifact`,
    type:
      typeof normalized.type === "string" && normalized.type.length > 0
        ? normalized.type
        : artifactId,
    version: sequence,
    createdAt: sequence,
    updatedAt: sequence,
  };
}

function visitMessageArtifactParts(
  parts: unknown,
  latestArtifacts: Map<string, LatestMessageArtifact>,
  sequenceRef: { current: number },
): void {
  if (!Array.isArray(parts)) {
    return;
  }

  for (const part of parts) {
    if (!part || typeof part !== "object") {
      continue;
    }

    const typedPart = part as {
      type?: unknown;
      data?: unknown;
      output?: unknown;
      result?: unknown;
      parts?: unknown;
    };

    if (typeof typedPart.type === "string") {
      const artifactId = getArtifactIdFromPartType(typedPart.type);
      if (artifactId) {
        const rawArtifact =
          typedPart.data ?? typedPart.output ?? typedPart.result;
        const nextRecord = toSyncableArtifactRecord(
          artifactId,
          rawArtifact,
          ++sequenceRef.current,
        );

        if (nextRecord) {
          const current = latestArtifacts.get(artifactId)?.artifact;
          if (!current || isNewerArtifact(current, nextRecord)) {
            latestArtifacts.set(artifactId, {
              partType: typedPart.type,
              artifact: nextRecord,
            });
          }
        }
      }
    }

    visitMessageArtifactParts(typedPart.parts, latestArtifacts, sequenceRef);
    visitMessageArtifactParts(
      getNestedParts(typedPart.data),
      latestArtifacts,
      sequenceRef,
    );
    visitMessageArtifactParts(
      getNestedParts(typedPart.output),
      latestArtifacts,
      sequenceRef,
    );
    visitMessageArtifactParts(
      getNestedParts(typedPart.result),
      latestArtifacts,
      sequenceRef,
    );
  }
}

function visitCompatArtifactPayloads(
  payloads: unknown,
  latestArtifacts: Map<string, LatestMessageArtifact>,
  sequenceRef: { current: number },
): void {
  if (!Array.isArray(payloads)) {
    return;
  }

  for (const payload of payloads) {
    if (!payload || typeof payload !== "object") {
      continue;
    }

    const typedPayload = payload as {
      type?: unknown;
      data?: unknown;
    };

    if (typeof typedPayload.type !== "string") {
      continue;
    }

    const artifactId = normalizeArtifactId(typedPayload.type);
    if (!artifactId || !SYNCABLE_PAYLOAD_ARTIFACT_TYPES.has(artifactId)) {
      continue;
    }

    const nextRecord = toSyncableArtifactRecord(
      artifactId,
      typedPayload.data ?? payload,
      ++sequenceRef.current,
    );

    if (!nextRecord) {
      continue;
    }

    const current = latestArtifacts.get(artifactId)?.artifact;
    if (!current || isNewerArtifact(current, nextRecord)) {
      latestArtifacts.set(artifactId, {
        partType: `${ARTIFACT_PART_PREFIX}${artifactId}`,
        artifact: nextRecord,
      });
    }
  }
}

export function collectLatestMessageArtifacts(
  messages: readonly MessageWithParts[],
): LatestMessageArtifact[] {
  const latestArtifacts = new Map<string, LatestMessageArtifact>();
  const sequenceRef = { current: 0 };

  for (const message of messages) {
    visitMessageArtifactParts(message?.parts, latestArtifacts, sequenceRef);
    visitCompatArtifactPayloads(message?.payloads, latestArtifacts, sequenceRef);
  }

  return Array.from(latestArtifacts.values());
}

function selectLatestArtifact<TData>(
  storeArtifact: MessageArtifactRecord<TData> | null,
  manualArtifact: MessageArtifactRecord<TData> | null,
): MessageArtifactRecord<TData> | null {
  if (!storeArtifact) {
    return manualArtifact;
  }

  if (!manualArtifact) {
    return storeArtifact;
  }

  return isNewerArtifact(storeArtifact, manualArtifact)
    ? manualArtifact
    : storeArtifact;
}

function normalizeTypedArtifactRecord<TData>(
  artifactDef: ArtifactDefinitionLike<TData>,
  candidate: unknown,
): MessageArtifactRecord<TData> | null {
  return normalizeArtifactRecord<TData>(
    artifactDef.id,
    candidate,
    artifactDef.validate,
  );
}

function validateArtifactRecord<TData>(
  artifactDef: ArtifactDefinitionLike<TData>,
  artifact: MessageArtifactRecord<UntypedJson> | MessageArtifactRecord<TData> | null,
): MessageArtifactRecord<TData> | null {
  if (!artifact) {
    return null;
  }

  if (!artifactDef.validate) {
    return artifact as MessageArtifactRecord<TData>;
  }

  try {
    return {
      ...artifact,
      payload: artifactDef.validate(artifact.payload),
    };
  } catch {
    return null;
  }
}

function getLatestStoreArtifact<TData>(
  artifactDef: ArtifactDefinitionLike<TData>,
  storeArtifactState: {
    currentIndex?: number;
    versions: unknown[];
    hasData: boolean;
    data: unknown;
    status: string;
    progress?: number;
    error?: string;
  },
): MessageArtifactRecord<TData> | null {
  const preferredVersion = storeArtifactState.versions[
    storeArtifactState.currentIndex ?? 0
  ];

  const versionCandidates = [
    preferredVersion,
    ...storeArtifactState.versions.toReversed().filter((version) => version !== preferredVersion),
  ];

  for (const version of versionCandidates) {
    if (!version) {
      continue;
    }

    const normalized = normalizeTypedArtifactRecord(artifactDef, version);
    if (normalized) {
      return normalized;
    }
  }

  if (!storeArtifactState.hasData || storeArtifactState.data === null) {
    return null;
  }

  return normalizeTypedArtifactRecord(artifactDef, {
    id: `${artifactDef.id}-artifact`,
    type: artifactDef.id,
    status: storeArtifactState.status,
    progress: storeArtifactState.progress,
    error: storeArtifactState.error,
    version: 0,
    createdAt: 0,
    updatedAt: 0,
    payload: storeArtifactState.data,
  });
}

function ArtifactRuntimeInnerProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [artifacts, setArtifacts] = useState<ArtifactRegistry>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  const [headerTitle, setHeaderTitle] = useState(
    DEFAULT_ARTIFACT_HEADER_TITLE,
  );
  const latestRequestRef = useRef<ArtifactRequestDetail | null>(null);

  const resetArtifactsState = useCallback(() => {
    setArtifacts({});
    setLoading(false);
    setError(null);
    setCanRetry(false);
    setHeaderTitle(DEFAULT_ARTIFACT_HEADER_TITLE);
  }, []);

  const clearArtifacts = useCallback(() => {
    latestRequestRef.current = null;
    resetArtifactsState();
  }, [resetArtifactsState]);

  const upsertArtifact = useCallback(
    (artifactId: string, candidate: unknown) => {
      const normalized = normalizeArtifactRecord<UntypedJson>(
        artifactId,
        candidate,
      );
      if (!normalized) {
        return null;
      }

      setArtifacts((current) => {
        const existing = current[artifactId];
        if (existing && !isNewerArtifact(existing, normalized)) {
          return current;
        }

        return {
          ...current,
          [artifactId]: normalized,
        };
      });

      return normalized;
    },
    [],
  );

  const upsertArtifactEnvelope = useCallback(
    (partType: string, candidate: unknown) => {
      const artifactId = getArtifactIdFromPartType(partType);
      if (!artifactId) {
        return null;
      }

      return upsertArtifact(artifactId, candidate);
    },
    [upsertArtifact],
  );

  const requestArtifact = useCallback(
    async (detail: ArtifactRequestDetail, options?: { resume?: boolean }) => {
      if (!options?.resume) {
        setHeaderTitle(deriveHeaderTitle(detail));
      }

      latestRequestRef.current = detail;
      setLoading(false);
      setError(null);
      setCanRetry(false);

      if (typeof window !== "undefined" && !options?.resume) {
        window.dispatchEvent(new CustomEvent(OPEN_ARTIFACT_PANEL_EVENT));
      }
    },
    [],
  );

  const retryLastRequest = useCallback(() => {
    if (!latestRequestRef.current) {
      return;
    }

    void requestArtifact(latestRequestRef.current, { resume: true });
  }, [requestArtifact]);

  const value = useMemo<ArtifactRuntimeContextValue>(
    () => ({
      artifacts,
      loading,
      error,
      canRetry,
      headerTitle,
      clearArtifacts,
      requestArtifact,
      retryLastRequest,
      upsertArtifact,
      upsertArtifactEnvelope,
    }),
    [
      artifacts,
      loading,
      error,
      canRetry,
      headerTitle,
      clearArtifacts,
      requestArtifact,
      retryLastRequest,
      upsertArtifact,
      upsertArtifactEnvelope,
    ],
  );

  return (
    <ArtifactRuntimeContext.Provider value={value}>
      {children}
    </ArtifactRuntimeContext.Provider>
  );
}

export function ArtifactRuntimeProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ChatStoreProvider>
      <ArtifactRuntimeInnerProvider>{children}</ArtifactRuntimeInnerProvider>
    </ChatStoreProvider>
  );
}

export function useArtifactRuntime() {
  const context = useContext(ArtifactRuntimeContext);
  if (!context) {
    throw new Error(
      "useArtifactRuntime must be used within an ArtifactRuntimeProvider",
    );
  }

  return context;
}

export function useSyncMessageArtifacts(
  messages: readonly MessageWithParts[],
): void {
  const { upsertArtifactEnvelope } = useArtifactRuntime();
  const latestArtifacts = useMemo(
    () => collectLatestMessageArtifacts(messages),
    [messages],
  );

  useEffect(() => {
    for (const { partType, artifact } of latestArtifacts) {
      upsertArtifactEnvelope(partType, artifact);
    }
  }, [latestArtifacts, upsertArtifactEnvelope]);
}

export function useArtifactRegistryArtifact<TData>(
  artifactDef: ArtifactDefinitionLike<TData>,
  callbacks?: MessageArtifactCallbacks<TData>,
): UseMessageArtifactReturn<TData> {
  const { artifacts } = useArtifactRuntime();
  const [storeArtifactState] = useSdkArtifact(
    artifactDef as never,
    { version: 0 } as never,
  );
  const callbacksRef = useRef(callbacks);
  const previousArtifactRef = useRef<MessageArtifactRecord<TData> | null>(null);

  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  const manualArtifact = useMemo(
    () =>
      validateArtifactRecord(
        artifactDef,
        artifacts[artifactDef.id] as MessageArtifactRecord<UntypedJson> | undefined ?? null,
      ),
    [artifactDef, artifacts],
  );

  const storeArtifact = useMemo(
    () => getLatestStoreArtifact(artifactDef, storeArtifactState),
    [artifactDef, storeArtifactState],
  );

  const latestArtifact = useMemo(
    () => selectLatestArtifact(storeArtifact, manualArtifact),
    [manualArtifact, storeArtifact],
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
      callbacksRef.current?.onProgress?.(
        latestArtifact.progress ?? 0,
        latestArtifact.payload,
      );
    }

    if (latestArtifact.status !== previousStatus) {
      callbacksRef.current?.onStatusChange?.(
        latestArtifact.status,
        previousStatus,
      );
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
        latestArtifact?.status === "loading" ||
        latestArtifact?.status === "streaming",
      hasData: latestArtifact !== null,
      artifact: latestArtifact,
    }),
    [latestArtifact],
  );
}
