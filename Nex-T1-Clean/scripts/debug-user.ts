import { config as loadEnv } from "dotenv";

import { Client } from 'pg';

loadEnv({ path: ".env.local" });
loadEnv();

const connectionString =
  process.env.DATABASE_URL_UNPOOLED?.trim() ||
  process.env.RAILWAY_DATABASE_URL?.trim() ||
  process.env.DATABASE_URL?.trim();

if (!connectionString) {
  throw new Error(
    "Set DATABASE_URL_UNPOOLED, RAILWAY_DATABASE_URL, or DATABASE_URL before running this debug script.",
  );
}

const client = new Client({
  connectionString,
  ssl: false
});

async function main() {
  await client.connect();
  try {
    console.log('Connected.');
    
    // Check current user
    const resUser = await client.query('SELECT current_user, session_user');
    console.log('User:', resUser.rows[0]);

    // Check superuser status
    const resSuper = await client.query("SELECT usename, usesuper FROM pg_user WHERE usename = current_user");
    console.log('Is Superuser?', resSuper.rows[0]);

    // Check table owner
    const resOwner = await client.query("SELECT tableowner FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'migrations'");
    if (resOwner.rows.length > 0) {
        console.log('Table Owner:', resOwner.rows[0].tableowner);
    } else {
        console.log('Table owner not found via pg_tables.');
    }

    // Check roles
    const resRoles = await client.query("SELECT rolname FROM pg_roles WHERE rolname LIKE 'supabase%' OR rolname = 'postgres'");
    console.log('Relevant Roles:', resRoles.rows.map(r => r.rolname));

    // Check membership
    // Is postgres a member of the owner?
    if (resOwner.rows.length > 0) {
        const owner = resOwner.rows[0].tableowner;
        try {
            // Check if current user can set role to owner
            // OR checks generic membership
            console.log(`Checking if postgres is member of ${owner}...`);
            // This query is complex, simpler validation: try SET ROLE
            // But let's just Try SET ROLE in a try-catch
            await client.query(`SET ROLE "${owner}"`);
            console.log(`SET ROLE "${owner}" SUCCESS!`);
        } catch (e) {
            console.log(`SET ROLE "${owner}" FAILED:`, (e as Error).message);
        }
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

main();
