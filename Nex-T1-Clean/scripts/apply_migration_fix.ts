import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load env vars
dotenv.config({ path: '.env.local' });

async function main() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('No DATABASE_URL found');
    process.exit(1);
  }

  console.log(`Connecting to database... (using ${connectionString.includes('pgbouncer') ? 'pooled' : 'unpooled'} connection)`);
  
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false } // Required for Supabase/Cloud connections
  });

  try {
    await client.connect();
    
    const migrationPath = path.join(process.cwd(), 'supabase/migrations/20260105000000_fix_org_member_recursion_v4.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Applying migration: 20260105000000_fix_org_member_recursion_v4.sql');
    await client.query(sql);
    
    console.log('Migration applied successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
