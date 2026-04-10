#!/usr/bin/env node
import pg from 'pg';

const url = process.env.DATABASE_URL || process.env.ALEMBIC_DATABASE_URL;
if (!url) {
  console.error('Set DATABASE_URL or ALEMBIC_DATABASE_URL');
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });

function rowls() {
  return `
SELECT c.relname AS table,
       c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind='r'
ORDER BY c.relname;`;
}

async function main() {
  await client.connect();
  const policies = await client.query(`SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check FROM pg_policies ORDER BY tablename, policyname;`);
  const views = await client.query(`SELECT table_name FROM information_schema.views WHERE table_schema='public' ORDER BY table_name;`);
  const rls = await client.query(rowls());
  const funcs = await client.query(`SELECT n.nspname as schema, p.proname as name, p.prosecdef as security_definer, p.proconfig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public';`);
  const triggers = await client.query(`SELECT event_object_schema as schema, event_object_table as table, trigger_name FROM information_schema.triggers WHERE trigger_schema='public' ORDER BY event_object_table, trigger_name;`);

  console.log('=== RLS Tables ===');
  console.table(rls.rows);
  console.log('\n=== Policies ===');
  console.table(policies.rows.map(r=>({table:r.tablename, policy:r.policyname, cmd:r.cmd, roles:r.roles, qual:r.qual, with_check:r.with_check})));
  console.log('\n=== Views ===');
  console.table(views.rows);
  console.log('\n=== Functions (search_path/security) ===');
  console.table(funcs.rows.map(r=>({fn:`${r.schema}.${r.name}()`, security_definer:r.security_definer, proconfig:r.proconfig})));
  console.log('\n=== Triggers ===');
  console.table(triggers.rows);
  await client.end();
}

main().catch((e)=>{ console.error(e); process.exit(1); });

