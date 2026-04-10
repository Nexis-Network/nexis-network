import { config as loadEnv } from "dotenv";

import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';


import { logger } from '@/lib/logger';
loadEnv({ path: ".env.local" });
loadEnv();
const connectionString =
  process.env.DATABASE_URL_UNPOOLED?.trim() ||
  process.env.RAILWAY_DATABASE_URL?.trim() ||
  process.env.DATABASE_URL?.trim();

if (!connectionString) {
  throw new Error(
    "Set DATABASE_URL_UNPOOLED, RAILWAY_DATABASE_URL, or DATABASE_URL before pushing a migration.",
  );
}
const migrationFile = 'supabase/migrations/20260128000005_drop_unused_partition_indexes.sql';

async function runMigration() {
  const client = new Client({
    connectionString,
    // ssl: { rejectUnauthorized: false } 
  });

  try {
    await client.connect();
    logger.debug('Connected to database.');

    const sqlPath = path.resolve(process.cwd(), migrationFile);
    if (!fs.existsSync(sqlPath)) {
        logger.error(`Migration file not found: ${sqlPath}`);
        process.exit(1);
    }
    
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    logger.debug('Running migration...');
    const startTime = Date.now();
    await client.query(sql);
    const duration = Date.now() - startTime;
    
    logger.debug(`Migration applied successfully in ${duration}ms!`);
  } catch (err) {
    logger.error('Error applying migration:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
