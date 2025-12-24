import "server-only";

import { sanitizeId } from "@/lib/server/local-store";
import {
  agentsFetch,
  buildAgentServiceHeaders,
  buildAgentsUrl,
  requireAgentsServiceBaseUrl,
  type AgentServiceAuth,
} from "@/lib/server/agents-service";

export type KnowledgeFile = {
  name: string;
  size: number;
  updatedAt: string;
};

function toString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeKnowledgeFile(raw: unknown): KnowledgeFile | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const name = toString(obj.name ?? obj.filename ?? obj.file_name);
  if (!name) return null;
  const size = toNumber(obj.size ?? obj.bytes ?? obj.length) ?? 0;
  const updatedAt = toString(obj.updatedAt ?? obj.updated_at ?? obj.modifiedAt ?? obj.modified_at);
  return {
    name,
    size,
    updatedAt: updatedAt ?? new Date().toISOString(),
  };
}

function extractFiles(data: unknown): KnowledgeFile[] {
  if (Array.isArray(data)) {
    return data.map(normalizeKnowledgeFile).filter(Boolean) as KnowledgeFile[];
  }
  if (!data || typeof data !== "object") return [];
  const obj = data as Record<string, unknown>;
  const candidates = [obj.files, obj.items, obj.data, obj.knowledge];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.map(normalizeKnowledgeFile).filter(Boolean) as KnowledgeFile[];
    }
  }
  return [];
}

export async function listKnowledgeFiles(
  appId: string,
  auth?: AgentServiceAuth,
): Promise<KnowledgeFile[]> {
  const normalized = sanitizeId(appId);
  if (!normalized) return [];
  const baseUrl = requireAgentsServiceBaseUrl();
  const headers = buildAgentServiceHeaders(auth);
  const encoded = encodeURIComponent(normalized);
  const paths = [
    `knowledge?appId=${encoded}`,
    `knowledge/${encoded}`,
    `agents/${encoded}/knowledge`,
    `${encoded}/knowledge`,
  ];

  let lastError: string | null = null;
  for (const path of paths) {
    const url = buildAgentsUrl(baseUrl, path);
    const result = await agentsFetch(url, { headers });
    if (result.ok) {
      const files = extractFiles(result.data);
      return files.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }
    if (result.status !== 404 && result.status !== 405) {
      lastError =
        typeof result.data === "string"
          ? result.data
          : `Request failed (${result.status})`;
      break;
    }
    lastError = `Request failed (${result.status})`;
  }

  if (lastError) {
    throw new Error(lastError);
  }
  return [];
}
