#!/usr/bin/env node
import { Redis } from "@upstash/redis";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

function buildRedisConfig() {
  const url = process.env.NEX_STORAGE_KV_REST_API_URL;
  const token = process.env.NEX_STORAGE_KV_REST_API_TOKEN;

  if (url && token) {
    return { url, token };
  }

  // Fallback to connection string parsing if absolutely necessary, 
  // but for now we rely on the new standard env vars.
  console.error("[redis-bootstrap] NEX_STORAGE_KV_REST_API_URL and NEX_STORAGE_KV_REST_API_TOKEN must be set.");
  return null;
}

async function ensureHash(client, key, fields) {
  const exists = await client.exists(key);
  if (!exists) {
    await client.hset(key, fields);
    return;
  }

  // Upstash/Redis HTTP API doesn't support pipeline in the same way as ioredis for this specific pattern easily
  // without using the pipeline() method which @upstash/redis has.
  const pipeline = client.pipeline();
  for (const [field, value] of Object.entries(fields)) {
    pipeline.hsetnx(key, field, value);
  }
  await pipeline.exec();
}

async function main() {
  const config = buildRedisConfig();
  if (!config) {
    process.exit(1);
  }

  const client = new Redis(config);

  try {
    const pong = await client.ping();
    console.log("[redis-bootstrap] Connected to Redis:", pong);

    await ensureHash(client, "metrics:wallets", {
      generated: "0",
      last_generated_at: "",
      last_generated_user: "",
    });

    console.log("[redis-bootstrap] Ensured base hashes.");
  } catch (error) {
    console.error("[redis-bootstrap] Failed to bootstrap Redis:", error);
    process.exitCode = 1;
  }
  // No quit() needed for HTTP client
}

main();
