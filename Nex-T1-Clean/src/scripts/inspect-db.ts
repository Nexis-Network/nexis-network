import { config as loadEnv } from "dotenv";

import { Client } from 'pg';

import { logger } from '../lib/logger';

loadEnv({ path: ".env.local" });
loadEnv();
const connectionString =
  process.env.DATABASE_URL_UNPOOLED?.trim() ||
  process.env.RAILWAY_DATABASE_URL?.trim() ||
  process.env.DATABASE_URL?.trim();

if (!connectionString) {
  throw new Error(
    "Set DATABASE_URL_UNPOOLED, RAILWAY_DATABASE_URL, or DATABASE_URL before inspecting the database.",
  );
}

async function inspectTable() {
  const client = new Client({
    connectionString,
    // ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    logger.debug('Connected to database.');

    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'wallet_accounts'
      ORDER BY ordinal_position;
    `);
    
    logger.debug('Columns for wallet_accounts:');
    console.table(res.rows);
  } catch (err) {
    logger.error('Error inspecting table:', err);
  } finally {
    await client.end();
  }
}

inspectTable();
