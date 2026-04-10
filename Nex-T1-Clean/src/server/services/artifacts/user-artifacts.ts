import { createServiceRoleClient } from "@/server/services/supabase/service-role";

import { logger } from "@/lib/logger";

export type UserArtifactRecord = {
  artifactId: string;
  userId: string;
  conversationId?: string | null;
  modelKey?: string | null;
  artifactType: string;
  title?: string | null;
  tags?: string[];
  sandboxId?: string | null;
  previewUrl?: string | null;
  snapshot?: UntypedJson;
  metadata?: Record<string, UntypedJson>;
};

export type UserArtifactDetail = {
  artifactId: string;
  userId: string;
  conversationId: string | null;
  modelKey: string | null;
  artifactType: string;
  title: string | null;
  tags: string[];
  sandboxId: string | null;
  previewUrl: string | null;
  snapshot: UntypedJson;
  metadata: Record<string, UntypedJson>;
  createdAt: string;
  updatedAt: string;
};

const normalizeTags = (tags?: string[]) => {
  if (!Array.isArray(tags)) return [];
  return Array.from(
    new Set(
      tags
        .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
        .filter((tag) => tag.length > 0)
        .slice(0, 16),
    ),
  );
};

const safeString = (value: string | null | undefined, max = 280) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
};

const isRecord = (value: unknown): value is Record<string, UntypedJson> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const coerceString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const pickLanguage = (path: string, fallback = "text") => {
  const extension = path.split(".").pop()?.toLowerCase();
  switch (extension) {
    case "ts":
      return "typescript";
    case "tsx":
      return "tsx";
    case "js":
      return "javascript";
    case "jsx":
      return "jsx";
    case "json":
      return "json";
    case "html":
      return "html";
    case "css":
      return "css";
    case "md":
      return "markdown";
    case "sol":
      return "solidity";
    case "py":
      return "python";
    case "sh":
      return "bash";
    default:
      return fallback;
  }
};

const CANONICAL_IDE_SNAPSHOT_TYPES = new Set([
  "code",
  "preview",
  "web",
  "canvas",
  "html",
  "pdf-viewer",
  "smart-contract-viewer",
  "transaction-flow",
  "code-execution",
  "web-preview",
  "file-tree",
  "terminal",
]);

function normalizeUserArtifactSnapshot(input: UserArtifactRecord): UntypedJson {
  const snapshot = isRecord(input.snapshot) ? input.snapshot : null;

  if (
    snapshot &&
    Array.isArray(snapshot.files) &&
    (
      "terminal" in snapshot ||
      "previewUrl" in snapshot ||
      "previewHtml" in snapshot ||
      "jsxPreview" in snapshot ||
      "queue" in snapshot ||
      "testResults" in snapshot
    )
  ) {
    return snapshot;
  }

  if (snapshot && Array.isArray(snapshot.nodes) && Array.isArray(snapshot.edges)) {
    return {
      artifactId: safeString(input.artifactId, 200) ?? "workflow-artifact",
      title: safeString(input.title ?? null, 200) ?? "Workflow Canvas",
      status: coerceString(snapshot.status) ?? undefined,
      nodes: snapshot.nodes,
      edges: snapshot.edges,
      viewport: snapshot.viewport,
      legend: snapshot.legend,
    };
  }

  if (!CANONICAL_IDE_SNAPSHOT_TYPES.has(input.artifactType)) {
    return snapshot ?? { value: input.snapshot ?? null };
  }

  const record = snapshot ?? {};
  const files = (() => {
    if (Array.isArray(record.files)) {
      return record.files
        .map((entry) => {
          if (!isRecord(entry)) return null;
          const path =
            coerceString(entry.path) ??
            coerceString(entry.fileName) ??
            coerceString(entry.name);
          if (!path) return null;

          return {
            path,
            content:
              coerceString(entry.content) ??
              coerceString(entry.code) ??
              coerceString(entry.source) ??
              coerceString(entry.html) ??
              undefined,
            language: coerceString(entry.language) ?? pickLanguage(path),
            kind: "file" as const,
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
    }

    const singleContent =
      coerceString(record.code) ??
      coerceString(record.content) ??
      coerceString(record.source) ??
      coerceString(record.html);
    if (!singleContent) {
      return [];
    }

    const inferredPath =
      coerceString(record.path) ??
      coerceString(record.fileName) ??
      (input.artifactType === "html" ? "index.html" : "src/artifact.tsx");

    return [
      {
        path: inferredPath,
        content: singleContent,
        language: coerceString(record.language) ?? pickLanguage(inferredPath),
        kind: "file" as const,
      },
    ];
  })();

  const terminalOutput =
    coerceString(record.output) ??
    coerceString(record.stdout) ??
    coerceString(record.text);
  const metadataCommand =
    input.metadata && typeof input.metadata.command === "string"
      ? input.metadata.command
      : null;

  return {
    artifactId: safeString(input.artifactId, 200) ?? "artifact",
    conversationId: safeString(input.conversationId ?? null, 200),
    sandboxId: safeString(input.sandboxId ?? null, 200),
    title: safeString(input.title ?? null, 200) ?? "Artifact Workbench",
    mode: input.artifactType,
    status: coerceString(record.status) ?? undefined,
    entryFile: files[0]?.path,
    activePath: files[0]?.path,
    files,
    terminal: terminalOutput
      ? {
          command:
            coerceString(record.command) ??
            safeString(metadataCommand ?? null, 200) ??
            undefined,
          output: terminalOutput,
          isComplete:
            typeof record.isComplete === "boolean" ? record.isComplete : true,
        }
      : undefined,
    previewUrl:
      safeString(input.previewUrl ?? null, 500) ??
      coerceString(record.previewUrl) ??
      coerceString(record.url) ??
      undefined,
    previewHtml:
      coerceString(record.html) ??
      coerceString(record.srcDoc) ??
      undefined,
    updatedAt: new Date().toISOString(),
  };
}

export async function upsertUserArtifactRecord(input: UserArtifactRecord): Promise<void> {
  if (!input.userId || !input.artifactId || !input.artifactType) {
    return;
  }

  try {
    const supabase = createServiceRoleClient();

    const payload = {
      artifact_id: input.artifactId,
      user_id: input.userId,
      conversation_id: safeString(input.conversationId ?? null, 200),
      model_key: safeString(input.modelKey ?? null, 120),
      artifact_type: safeString(input.artifactType, 120),
      title: safeString(input.title ?? null, 200),
      tags: normalizeTags(input.tags),
      sandbox_id: safeString(input.sandboxId ?? null, 200),
      preview_url: safeString(input.previewUrl ?? null, 500),
      snapshot: normalizeUserArtifactSnapshot(input),
      metadata: input.metadata ?? {},
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("user_artifacts")
      .upsert(payload, { onConflict: "artifact_id,user_id" });

    if (error) {
      logger.error("[user-artifacts] upsert failed", error);
    }
  } catch (error) {
    logger.error("[user-artifacts] upsert exception", error);
  }
}

export async function loadUserArtifactSummary(userId: string, limit = 25): Promise<{
  artifactsLast30d: number;
  artifacts: Array<{
    artifactId: string;
    artifactType: string;
    title?: string | null;
    createdAt: string;
    tags: string[];
  }>;
}> {
  if (!userId) {
    return { artifactsLast30d: 0, artifacts: [] };
  }

  try {
    const supabase = createServiceRoleClient();

    const thirtyDaysAgoIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [countResult, listResult] = await Promise.all([
      supabase
        .from("user_artifacts")
        .select("id", { head: true, count: "exact" })
        .eq("user_id", userId)
        .gte("created_at", thirtyDaysAgoIso),
      supabase
        .from("user_artifacts")
        .select("artifact_id, artifact_type, title, created_at, tags")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(Math.max(1, Math.min(limit, 100))),
    ]);

    if (countResult.error) {
      logger.warn("[user-artifacts] count query failed", countResult.error);
    }
    if (listResult.error) {
      logger.warn("[user-artifacts] list query failed", listResult.error);
    }

    const artifacts = (listResult.data ?? []).map((entry) => ({
      artifactId: entry.artifact_id,
      artifactType: entry.artifact_type,
      title: entry.title,
      createdAt: entry.created_at,
      tags: Array.isArray(entry.tags)
        ? entry.tags.filter((tag): tag is string => typeof tag === "string")
        : [],
    }));

    return {
      artifactsLast30d: countResult.count ?? 0,
      artifacts,
    };
  } catch (error) {
    logger.error("[user-artifacts] summary exception", error);
    return { artifactsLast30d: 0, artifacts: [] };
  }
}

export async function loadUserArtifactDetail(
  userId: string,
  artifactId: string,
): Promise<UserArtifactDetail | null> {
  if (!userId || !artifactId) {
    return null;
  }

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("user_artifacts")
      .select(
        "artifact_id, user_id, conversation_id, model_key, artifact_type, title, tags, sandbox_id, preview_url, snapshot, metadata, created_at, updated_at",
      )
      .eq("user_id", userId)
      .eq("artifact_id", artifactId)
      .maybeSingle();

    if (error) {
      logger.warn("[user-artifacts] detail query failed", error);
      return null;
    }
    if (!data) {
      return null;
    }

    return {
      artifactId: data.artifact_id,
      userId: data.user_id,
      conversationId: data.conversation_id ?? null,
      modelKey: data.model_key ?? null,
      artifactType: data.artifact_type,
      title: data.title ?? null,
      tags: Array.isArray(data.tags)
        ? data.tags.filter((tag): tag is string => typeof tag === "string")
        : [],
      sandboxId: data.sandbox_id ?? null,
      previewUrl: data.preview_url ?? null,
      snapshot:
        data.snapshot && typeof data.snapshot === "object"
          ? data.snapshot
          : { value: data.snapshot ?? null },
      metadata:
        data.metadata && typeof data.metadata === "object"
          ? (data.metadata as Record<string, UntypedJson>)
          : {},
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (error) {
    logger.error("[user-artifacts] detail exception", error);
    return null;
  }
}
