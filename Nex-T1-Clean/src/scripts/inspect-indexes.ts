import { config as loadEnv } from "dotenv";

import { Client } from 'pg';


import { logger } from '@/lib/logger';
loadEnv({ path: ".env.local" });
loadEnv();
const connectionString =
  process.env.DATABASE_URL_UNPOOLED?.trim() ||
  process.env.RAILWAY_DATABASE_URL?.trim() ||
  process.env.DATABASE_URL?.trim();

if (!connectionString) {
  throw new Error(
    "Set DATABASE_URL_UNPOOLED, RAILWAY_DATABASE_URL, or DATABASE_URL before inspecting indexes.",
  );
}

async function inspectIndexes() {
  const client = new Client({
    connectionString,
    // ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    logger.debug('Connected to database.');

    // Check agent_deployment indexes (to confirm no redundancy)
    logger.debug('\n--- Indexes on public.agent_deployment ---');
    const resDeployment = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'agent_deployment';
    `);
    // console.table is preserved for CLI scripts as it provides formatted output
     
    console.table(resDeployment.rows);

    // Check performance_metrics parent table indexes
    // Note: performance_metrics might be the parent table name
    logger.debug('\n--- Indexes on public.performance_metrics (parent) ---');
    const resPerf = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'performance_metrics';
    `);
    // console.table is preserved for CLI scripts as it provides formatted output
     
    console.table(resPerf.rows);

  } catch (err) {
    logger.error('Error inspecting indexes:', err);
  } finally {
    await client.end();
  }
}

inspectIndexes();
