#!/usr/bin/env node

/**
 * Supabase migration ledger repair helper.
 *
 * Marks historical migrations as applied in `supabase_migrations.schema_migrations`
 * so that `supabase db push` stops trying to replay legacy files already live in
 * production. The script reads DATABASE_URL_UNPOOLED (preferred) or DATABASE_URL
 * from `.env`, falls back to process.env, and issues `supabase migration repair`
 * calls for the versions up to the configured cutoff.
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_ENV_FILE = process.env.REPAIR_ENV_FILE ?? '.env';
const DEFAULT_MAX_VERSION = process.env.REPAIR_MAX_VERSION ?? '20251101000001';
const DRY_RUN = process.argv.includes('--dry-run');

const maxVersionArg = process.argv.find((arg) => arg.startsWith('--max-version='));
const maxVersion = maxVersionArg ? maxVersionArg.split('=')[1] : DEFAULT_MAX_VERSION;

const envFileArg = process.argv.find((arg) => arg.startsWith('--env='));
const envFile = envFileArg ? envFileArg.split('=')[1] : DEFAULT_ENV_FILE;

const LEGACY_MIGRATION_VERSIONS = [
  '20251026',
  '20251027',
  '20251028',
  '20251030160000',
  '20251030163000',
  '20251030170000',
  '20251030170500',
  '20251031194500',
  '20251031195500',
  '20251101000001',
  '20251101',
];

function loadEnv(filePath) {
  const absolute = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(absolute)) {
    return {};
  }
  return fs
    .readFileSync(absolute, 'utf8')
    .split(/\r?\n/)
    .reduce((acc, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
        return acc;
      }
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx);
      let value = trimmed.slice(idx + 1);
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      acc[key] = value;
      return acc;
    }, {});
}

function getDbUrl() {
  const envFromFile = loadEnv(envFile);
  return (
    process.env.DATABASE_URL_UNPOOLED ??
    envFromFile.DATABASE_URL_UNPOOLED ??
    process.env.DATABASE_URL ??
    envFromFile.DATABASE_URL ??
    ''
  );
}

function parseMigrationList(output) {
  const lines = output.split('\n');
  const status = new Map();
  for (const line of lines) {
    if (!line.includes('|')) continue;
    const parts = line.split('|').map((part) => part.trim());
    if (parts.length < 2) continue;
    const [localVersion, remoteVersion] = parts;
    if (!/^\d{8,}$/.test(localVersion)) continue;
    status.set(localVersion, remoteVersion.length > 0);
  }
  return status;
}

function compareVersions(a, b) {
  const aBig = BigInt(a);
  const bBig = BigInt(b);
  if (aBig === bBig) return 0;
  return aBig < bBig ? -1 : 1;
}

function runSupabase(args, dbUrl) {
  const result = spawnSync('supabase', args, {
    stdio: 'inherit',
    env: {
      ...process.env,
      SUPABASE_DB_URL: dbUrl,
    },
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function main() {
  const dbUrl = getDbUrl();
  if (!dbUrl) {
    console.error('✗ DATABASE_URL_UNPOOLED or DATABASE_URL is required (see .env lines 125-128).');
    process.exit(1);
  }

  const listResult = spawnSync('supabase', ['migration', 'list', '--db-url', dbUrl], {
    encoding: 'utf8',
  });
  if (listResult.status !== 0) {
    process.stderr.write(listResult.stderr ?? '');
    process.exit(listResult.status ?? 1);
  }

  const remoteStatus = parseMigrationList(listResult.stdout ?? '');
  const targets = LEGACY_MIGRATION_VERSIONS.filter((version) => {
    if (compareVersions(version, maxVersion) === 1) {
      return false;
    }
    if (!remoteStatus.has(version)) {
      console.warn(`⚠︎ Local migration ${version} not found in supabase migration list output.`);
      return false;
    }
    return remoteStatus.get(version) === false;
  });

  if (targets.length === 0) {
    console.log('✓ No legacy migrations require repair.');
    return;
  }

  console.log(`Found ${targets.length} legacy migrations without remote ledger entries.`);
  console.log(targets.map((v) => `  - ${v}`).join('\n'));

  if (DRY_RUN) {
    console.log('\nDry-run enabled; skipping supabase migration repair.');
    return;
  }

  for (const version of targets) {
    console.log(`\n→ Marking ${version} as applied...`);
    runSupabase(['migration', 'repair', '--db-url', dbUrl, '--status', 'applied', version], dbUrl);
  }

  console.log('\n✓ Repair complete. Run `supabase migration list --db-url <url>` to verify.');
}

main();
