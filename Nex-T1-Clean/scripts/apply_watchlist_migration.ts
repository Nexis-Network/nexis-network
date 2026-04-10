import { config as loadEnv } from "dotenv";

import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

loadEnv({ path: ".env.local" });
loadEnv();

const connectionString =
  process.env.DATABASE_URL_UNPOOLED?.trim() ||
  process.env.RAILWAY_DATABASE_URL?.trim() ||
  process.env.DATABASE_URL?.trim();

if (!connectionString) {
  throw new Error(
    "Set DATABASE_URL_UNPOOLED, RAILWAY_DATABASE_URL, or DATABASE_URL before running this migration.",
  );
}

const client = new Client({
  connectionString,
});

async function applyMigration() {
  await client.connect();
  const sqlPath = path.join(process.cwd(), 'supabase/migrations/20260124000000_create_watchlist.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  await client.query(sql);
  console.log('Migration applied successfully');
  await client.end();
}

applyMigration().catch(console.error);
