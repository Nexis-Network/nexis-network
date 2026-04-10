import { redis } from "@/server/services/redis";

import { logger } from "@/lib/logger";

export type ArtifactLedgerToolRef = {
  id?: string;
  name: string;
};

export type ArtifactLedgerRecord = {
  artifactId: string;
  artifactType: string;
  title?: string | null;
  sessionId?: string | null;
  userId?: string | null;
  previewUrl?: string | null;
  snapshotVersion: number;
  provenance: string;
  relatedToolCalls: ArtifactLedgerToolRef[];
  createdAt: string;
  updatedAt: string;
};

const ARTIFACT_LEDGER_KEY_PREFIX = "chat:artifact-ledger:";
const ARTIFACT_LEDGER_TTL_SECONDS = 60 * 60 * 24 * 7;
const MAX_ARTIFACT_LEDGER_RECORDS = 64;

function buildLedgerScopeKey(input: {
  sessionId?: string | null;
  userId?: string | null;
}): string | null {
  if (input.sessionId && input.sessionId.trim().length > 0) {
    return `${ARTIFACT_LEDGER_KEY_PREFIX}session:${input.sessionId.trim()}`;
  }

  if (input.userId && input.userId.trim().length > 0) {
    return `${ARTIFACT_LEDGER_KEY_PREFIX}user:${input.userId.trim()}`;
  }

  return null;
}

export async function listArtifactLedgerRecords(
  input: {
    sessionId?: string | null;
    userId?: string | null;
    limit?: number;
  },
): Promise<ArtifactLedgerRecord[]> {
  const key = buildLedgerScopeKey(input);
  if (!key) return [];

  try {
    const raw = await redis.get<string>(key);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as ArtifactLedgerRecord[];
    if (!Array.isArray(parsed)) return [];

    return parsed.slice(0, Math.max(1, Math.min(input.limit ?? 8, MAX_ARTIFACT_LEDGER_RECORDS)));
  } catch (error) {
    logger.warn("[artifact-ledger] failed to list records", { key, error });
    return [];
  }
}

export async function upsertArtifactLedgerRecord(
  record: ArtifactLedgerRecord,
): Promise<ArtifactLedgerRecord | null> {
  const key = buildLedgerScopeKey(record);
  if (!key) return null;

  try {
    const existing = await listArtifactLedgerRecords({
      sessionId: record.sessionId,
      userId: record.userId,
      limit: MAX_ARTIFACT_LEDGER_RECORDS,
    });

    const next: ArtifactLedgerRecord[] = [];
    let inserted = false;
    for (const entry of existing) {
      if (entry.artifactId === record.artifactId) {
        next.push({
          ...entry,
          ...record,
          createdAt: entry.createdAt || record.createdAt,
          updatedAt: record.updatedAt,
        });
        inserted = true;
        continue;
      }
      next.push(entry);
    }

    if (!inserted) {
      next.unshift(record);
    }

    await redis.set(key, JSON.stringify(next.slice(0, MAX_ARTIFACT_LEDGER_RECORDS)), {
      ex: ARTIFACT_LEDGER_TTL_SECONDS,
    });

    return record;
  } catch (error) {
    logger.warn("[artifact-ledger] failed to upsert record", {
      artifactId: record.artifactId,
      error,
    });
    return null;
  }
}
