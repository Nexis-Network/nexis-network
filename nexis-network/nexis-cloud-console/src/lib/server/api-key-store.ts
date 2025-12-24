import "server-only";

import crypto from "crypto";
import path from "path";
import { getDataPath, readJsonFile, writeJsonFile } from "@/lib/server/local-store";
import { encryptSecret } from "@/lib/server/secrets";

export type ApiKeyRecord = {
  id: string;
  label: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  secret: string;
  createdBy: string | null;
};

export type ApiKeyView = Omit<ApiKeyRecord, "secret">;

const STORE_PATH = path.join(getDataPath("api-keys"), "keys.json");

async function readStore(): Promise<ApiKeyRecord[]> {
  return readJsonFile<ApiKeyRecord[]>(STORE_PATH, []);
}

async function writeStore(records: ApiKeyRecord[]) {
  await writeJsonFile(STORE_PATH, records);
}

function generateApiKey(): { value: string; prefix: string } {
  const raw = crypto.randomBytes(24).toString("base64url");
  const value = `nexis_${raw}`;
  return { value, prefix: value.slice(0, 10) };
}

export async function listApiKeys(): Promise<ApiKeyView[]> {
  const records = await readStore();
  return records.map((record) => ({
    id: record.id,
    label: record.label,
    prefix: record.prefix,
    createdAt: record.createdAt,
    lastUsedAt: record.lastUsedAt,
    revokedAt: record.revokedAt,
    createdBy: record.createdBy,
  }));
}

export async function createApiKey(label: string, createdBy: string | null) {
  const now = new Date().toISOString();
  const { value, prefix } = generateApiKey();
  const record: ApiKeyRecord = {
    id: crypto.randomUUID(),
    label,
    prefix,
    createdAt: now,
    lastUsedAt: null,
    revokedAt: null,
    secret: encryptSecret(value),
    createdBy,
  };
  const records = await readStore();
  records.unshift(record);
  await writeStore(records);
  return { record, plaintext: value };
}

export async function revokeApiKey(id: string) {
  const records = await readStore();
  const now = new Date().toISOString();
  const next = records.map((record) =>
    record.id === id ? { ...record, revokedAt: now } : record,
  );
  await writeStore(next);
  return next.find((record) => record.id === id) || null;
}
