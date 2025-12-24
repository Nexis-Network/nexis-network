import "server-only";

import { promises as fs } from "fs";
import path from "path";

const DATA_ROOT = path.resolve(process.cwd(), ".data");

export async function ensureDir(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true });
}

export function getDataPath(...segments: string[]) {
  return path.join(DATA_ROOT, ...segments);
}

export async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const contents = await fs.readFile(filePath, "utf8");
    return JSON.parse(contents) as T;
  } catch {
    return fallback;
  }
}

export async function writeJsonFile(filePath: string, payload: unknown) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
}

export function sanitizeId(value: string) {
  if (!value) return null;
  const normalized = value.trim();
  if (!normalized) return null;
  if (!/^[a-zA-Z0-9_-]+$/.test(normalized)) return null;
  return normalized;
}

export function sanitizeFilename(filename: string) {
  const base = path.basename(filename || "").trim();
  if (!base) return null;
  const sanitized = base.replace(/[^a-zA-Z0-9._-]/g, "-");
  return sanitized.length > 0 ? sanitized : null;
}
