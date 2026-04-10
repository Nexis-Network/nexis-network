#!/usr/bin/env tsx
/**
 * Migrate Users from Supabase Cloud to Railway Self-Hosted
 *
 * This script migrates:
 * - auth.users (core user accounts with password hashes)
 * - auth.identities (OAuth provider links)
 * - auth.mfa_factors (optional, MFA enrollment data)
 *
 * Usage:
 *   pnpm tsx scripts/migrate-users-cloud-to-railway.ts --dry-run
 *   pnpm tsx scripts/migrate-users-cloud-to-railway.ts
 *   pnpm tsx scripts/migrate-users-cloud-to-railway.ts --include-mfa
 */

import { config as loadEnv } from "dotenv";
import pg from "pg";

const { Client } = pg;

loadEnv({ path: ".env.local" });
loadEnv();

// ============================================================================
// Configuration
// ============================================================================

// Source: Supabase Cloud (can be overridden via env)
const SOURCE_DB_URL =
  process.env.MIGRATION_SOURCE_DB_URL ||
  process.env.SOURCE_DATABASE_URL ||
  process.env.SUPABASE_SOURCE_DB_URL;

// Destination: Railway Self-Hosted (must be set via env)
const DEST_DB_URL =
  process.env.MIGRATION_DEST_DB_URL ||
  process.env.DATABASE_RAILWAY_PUBLIC_URL ||
  process.env.RAILWAY_DATABASE_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.DATABASE_URL;

if (!SOURCE_DB_URL || !DEST_DB_URL) {
  throw new Error(
    "Set MIGRATION_SOURCE_DB_URL/SOURCE_DATABASE_URL/SUPABASE_SOURCE_DB_URL and MIGRATION_DEST_DB_URL/DATABASE_RAILWAY_PUBLIC_URL/RAILWAY_DATABASE_URL/DATABASE_URL before running this migration.",
  );
}

if (!DEST_DB_URL || DEST_DB_URL.includes(".railway.internal")) {
  console.warn(`
⚠️  WARNING: Destination DB URL appears to use internal Railway domain.
    This will only work when running from within Railway.

    For local execution, set MIGRATION_DEST_DB_URL to the public TCP proxy:
      export MIGRATION_DEST_DB_URL="postgresql://user:pass@<proxy>.railway.app:<port>/railway"

    You can find this in Railway Dashboard → PgVector → Connect → Public TCP Proxy
`);
}


// ============================================================================
// Helpers
// ============================================================================

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const INCLUDE_MFA = args.includes("--include-mfa");

function log(message: string) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function logError(message: string, error?: unknown) {
  console.error(`[${new Date().toISOString()}] ❌ ${message}`);
  if (error) {
    console.error(error);
  }
}

function logSuccess(message: string) {
  console.log(`[${new Date().toISOString()}] ✅ ${message}`);
}

function logWarning(message: string) {
  console.log(`[${new Date().toISOString()}] ⚠️  ${message}`);
}

// ============================================================================
// Database Queries
// ============================================================================

interface AuthUser {
  id: string;
  instance_id: string | null;
  aud: string | null;
  role: string | null;
  email: string | null;
  encrypted_password: string | null;
  email_confirmed_at: Date | null;
  invited_at: Date | null;
  confirmation_token: string | null;
  confirmation_sent_at: Date | null;
  recovery_token: string | null;
  recovery_sent_at: Date | null;
  email_change_token_new: string | null;
  email_change: string | null;
  email_change_sent_at: Date | null;
  last_sign_in_at: Date | null;
  raw_app_meta_data: Record<string, unknown> | null;
  raw_user_meta_data: Record<string, unknown> | null;
  is_super_admin: boolean | null;
  created_at: Date | null;
  updated_at: Date | null;
  phone: string | null;
  phone_confirmed_at: Date | null;
  phone_change: string | null;
  phone_change_token: string | null;
  phone_change_sent_at: Date | null;
  confirmed_at: Date | null;
  email_change_token_current: string | null;
  email_change_confirm_status: number | null;
  banned_until: Date | null;
  reauthentication_token: string | null;
  reauthentication_sent_at: Date | null;
  is_sso_user: boolean;
  deleted_at: Date | null;
  is_anonymous: boolean;
}

interface AuthIdentity {
  provider_id: string;
  user_id: string;
  identity_data: Record<string, unknown>;
  provider: string;
  last_sign_in_at: Date | null;
  created_at: Date | null;
  updated_at: Date | null;
  id: string;
}

interface MfaFactor {
  id: string;
  user_id: string;
  friendly_name: string | null;
  factor_type: string;
  status: string;
  created_at: Date;
  updated_at: Date;
  secret: string | null;
}

async function fetchUsers(client: pg.Client): Promise<AuthUser[]> {
  const result = await client.query<AuthUser>(`
    SELECT
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      invited_at,
      confirmation_token,
      confirmation_sent_at,
      recovery_token,
      recovery_sent_at,
      email_change_token_new,
      email_change,
      email_change_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      created_at,
      updated_at,
      phone,
      phone_confirmed_at,
      phone_change,
      phone_change_token,
      phone_change_sent_at,
      confirmed_at,
      email_change_token_current,
      email_change_confirm_status,
      banned_until,
      reauthentication_token,
      reauthentication_sent_at,
      is_sso_user,
      deleted_at,
      is_anonymous
    FROM auth.users
    WHERE deleted_at IS NULL
    ORDER BY created_at ASC
  `);
  return result.rows;
}

async function fetchIdentities(client: pg.Client): Promise<AuthIdentity[]> {
  const result = await client.query<AuthIdentity>(`
    SELECT
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at,
      id
    FROM auth.identities
    ORDER BY created_at ASC
  `);
  return result.rows;
}

async function fetchMfaFactors(client: pg.Client): Promise<MfaFactor[]> {
  const result = await client.query<MfaFactor>(`
    SELECT
      id,
      user_id,
      friendly_name,
      factor_type,
      status,
      created_at,
      updated_at,
      secret
    FROM auth.mfa_factors
    ORDER BY created_at ASC
  `);
  return result.rows;
}

async function insertUsers(
  client: pg.Client,
  users: AuthUser[]
): Promise<number> {
  let inserted = 0;
  let updated = 0;

  // Check for email conflicts (same email, different ID) and purge them to allow insertion
  // This ensures the Source ID is preserved, which is critical for FK integrity.
  const emails = users.map((u) => u.email).filter(Boolean) as string[];
  if (emails.length > 0) {
    // Parameterized query can be large, so chunk it if necessary, but 49 users is fine.
    // Query destination for emails that exist but have different IDs
    // We do this one by one or in batches.
    for (const user of users) {
      if (!user.email) continue;
      
      const conflictRes = await client.query(
        "SELECT id FROM auth.users WHERE email = $1 AND id != $2",
        [user.email, user.id]
      );
      
      if (conflictRes.rows.length > 0) {
        const conflictingId = conflictRes.rows[0].id;
        logWarning(`Found conflicting user with email ${user.email} (ID: ${conflictingId}) - Deleting to allow migration of ID ${user.id}`);
        
        // Delete the conflicting user
        await client.query("DELETE FROM auth.users WHERE id = $1", [conflictingId]);
        logSuccess(`Deleted conflicting user ${conflictingId}`);
      }
    }
  }

  for (const user of users) {
    try {
      const result = await client.query(
        `
        INSERT INTO auth.users (
          id, instance_id, aud, role, email, encrypted_password,
          email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at,
          recovery_token, recovery_sent_at, email_change_token_new, email_change,
          email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
          is_super_admin, created_at, updated_at, phone, phone_confirmed_at,
          phone_change, phone_change_token, phone_change_sent_at,
          email_change_token_current, email_change_confirm_status, banned_until,
          reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at,
          is_anonymous
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26, $27, $28, $29,
          $30, $31, $32, $33, $34
        )
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          encrypted_password = EXCLUDED.encrypted_password,
          raw_app_meta_data = EXCLUDED.raw_app_meta_data,
          raw_user_meta_data = EXCLUDED.raw_user_meta_data,
          updated_at = EXCLUDED.updated_at,
          last_sign_in_at = EXCLUDED.last_sign_in_at,
          email_confirmed_at = EXCLUDED.email_confirmed_at,
          phone_confirmed_at = EXCLUDED.phone_confirmed_at
        RETURNING (xmax = 0) AS inserted
      `,
        [
          user.id,
          user.instance_id,
          user.aud || "authenticated",
          user.role || "authenticated",
          user.email,
          user.encrypted_password,
          user.email_confirmed_at,
          user.invited_at,
          user.confirmation_token,
          user.confirmation_sent_at,
          user.recovery_token,
          user.recovery_sent_at,
          user.email_change_token_new,
          user.email_change,
          user.email_change_sent_at,
          user.last_sign_in_at,
          user.raw_app_meta_data,
          user.raw_user_meta_data,
          user.is_super_admin,
          user.created_at,
          user.updated_at,
          user.phone,
          user.phone_confirmed_at,
          user.phone_change,
          user.phone_change_token,
          user.phone_change_sent_at,
          // user.confirmed_at, // OMITTED - generated column
          user.email_change_token_current,
          user.email_change_confirm_status,
          user.banned_until,
          user.reauthentication_token,
          user.reauthentication_sent_at,
          user.is_sso_user,
          user.deleted_at,
          user.is_anonymous,
        ]
      );

      if (result.rows[0]?.inserted) {
        inserted++;
      } else {
        updated++;
      }
    } catch (error) {
      logError(`Failed to insert user ${user.id} (${user.email})`, error);
      throw error;
    }
  }

  log(`Users: ${inserted} inserted, ${updated} updated`);
  return inserted + updated;
}

async function insertIdentities(
  client: pg.Client,
  identities: AuthIdentity[]
): Promise<number> {
  let inserted = 0;
  let updated = 0;

  for (const identity of identities) {
    try {
      const result = await client.query(
        `
        INSERT INTO auth.identities (
          provider_id, user_id, identity_data, provider,
          last_sign_in_at, created_at, updated_at, id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          identity_data = EXCLUDED.identity_data,
          updated_at = EXCLUDED.updated_at,
          last_sign_in_at = EXCLUDED.last_sign_in_at
        RETURNING (xmax = 0) AS inserted
      `,
        [
          identity.provider_id,
          identity.user_id,
          identity.identity_data,
          identity.provider,
          identity.last_sign_in_at,
          identity.created_at,
          identity.updated_at,
          identity.id,
        ]
      );

      if (result.rows[0]?.inserted) {
        inserted++;
      } else {
        updated++;
      }
    } catch (error) {
      logError(
        `Failed to insert identity ${identity.id} (${identity.provider})`,
        error
      );
      // Don't throw - identity might reference a user that was deleted
      logWarning(`Skipping identity for user ${identity.user_id}`);
    }
  }

  log(`Identities: ${inserted} inserted, ${updated} updated`);
  return inserted + updated;
}

async function insertMfaFactors(
  client: pg.Client,
  factors: MfaFactor[]
): Promise<number> {
  let inserted = 0;
  let updated = 0;

  for (const factor of factors) {
    try {
      const result = await client.query(
        `
        INSERT INTO auth.mfa_factors (
          id, user_id, friendly_name, factor_type, status,
          created_at, updated_at, secret
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          friendly_name = EXCLUDED.friendly_name,
          status = EXCLUDED.status,
          updated_at = EXCLUDED.updated_at
        RETURNING (xmax = 0) AS inserted
      `,
        [
          factor.id,
          factor.user_id,
          factor.friendly_name,
          factor.factor_type,
          factor.status,
          factor.created_at,
          factor.updated_at,
          factor.secret,
        ]
      );

      if (result.rows[0]?.inserted) {
        inserted++;
      } else {
        updated++;
      }
    } catch (error) {
      logError(`Failed to insert MFA factor ${factor.id}`, error);
      logWarning(`Skipping MFA factor for user ${factor.user_id}`);
    }
  }

  log(`MFA Factors: ${inserted} inserted, ${updated} updated`);
  return inserted + updated;
}

// ============================================================================
// Main Migration
// ============================================================================

async function main() {
  console.log("===================================================");
  console.log("🚀 USER MIGRATION: Supabase Cloud → Railway Self-Hosted");
  console.log("===================================================");
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no changes)" : "LIVE MIGRATION"}`);
  console.log(`Include MFA: ${INCLUDE_MFA ? "Yes" : "No"}`);
  console.log("---------------------------------------------------");

  const sourceClient = new Client({ connectionString: SOURCE_DB_URL });
  const destClient = new Client({ connectionString: DEST_DB_URL });

  try {
    // Connect to both databases
    log("Connecting to source database (Supabase Cloud)...");
    await sourceClient.connect();
    logSuccess("Connected to source database");

    log("Connecting to destination database (Railway)...");
    await destClient.connect();
    logSuccess("Connected to destination database");

    // Fetch data from source
    log("Fetching users from source...");
    const users = await fetchUsers(sourceClient);
    log(`Found ${users.length} users to migrate`);

    log("Fetching identities from source...");
    const identities = await fetchIdentities(sourceClient);
    log(`Found ${identities.length} identities to migrate`);

    let mfaFactors: MfaFactor[] = [];
    if (INCLUDE_MFA) {
      log("Fetching MFA factors from source...");
      mfaFactors = await fetchMfaFactors(sourceClient);
      log(`Found ${mfaFactors.length} MFA factors to migrate`);
    }

    // Summary before migration
    console.log("\n--- Migration Summary ---");
    console.log(`Users: ${users.length}`);
    console.log(`Identities: ${identities.length}`);
    if (INCLUDE_MFA) {
      console.log(`MFA Factors: ${mfaFactors.length}`);
    }

    // Identity breakdown by provider
    const identityByProvider = identities.reduce(
      (acc, i) => {
        acc[i.provider] = (acc[i.provider] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    console.log("\nIdentities by provider:");
    for (const [provider, count] of Object.entries(identityByProvider)) {
      console.log(`  - ${provider}: ${count}`);
    }
    console.log("-------------------------\n");

    if (DRY_RUN) {
      logWarning("DRY RUN mode - no data will be written to destination");
      console.log("\nSample users (first 5):");
      for (const user of users.slice(0, 5)) {
        console.log(`  - ${user.email} (${user.id})`);
      }
      return;
    }

    // Execute migration
    log("Starting migration to destination...");

    // Begin transaction
    await destClient.query("BEGIN");

    try {
      // Insert users first (identities reference users)
      log("Inserting users...");
      await insertUsers(destClient, users);

      // Insert identities
      log("Inserting identities...");
      await insertIdentities(destClient, identities);

      // Insert MFA factors if requested
      if (INCLUDE_MFA && mfaFactors.length > 0) {
        log("Inserting MFA factors...");
        await insertMfaFactors(destClient, mfaFactors);
      }

      // Commit transaction
      await destClient.query("COMMIT");
      logSuccess("Migration committed successfully!");
    } catch (error) {
      await destClient.query("ROLLBACK");
      logError("Migration failed, rolled back", error);
      throw error;
    }

    // Verification
    log("Verifying migration...");
    const destUserCount = await destClient.query(
      "SELECT COUNT(*) FROM auth.users WHERE deleted_at IS NULL"
    );
    const destIdentityCount = await destClient.query(
      "SELECT COUNT(*) FROM auth.identities"
    );

    console.log("\n--- Verification ---");
    console.log(`Source users: ${users.length}`);
    console.log(`Destination users: ${destUserCount.rows[0].count}`);
    console.log(`Source identities: ${identities.length}`);
    console.log(`Destination identities: ${destIdentityCount.rows[0].count}`);

    if (Number(destUserCount.rows[0].count) >= users.length) {
      logSuccess("User migration verified!");
    } else {
      logWarning("User count mismatch - please verify manually");
    }

    console.log("\n===================================================");
    logSuccess("MIGRATION COMPLETE");
    console.log("===================================================");
    console.log("\nNext steps:");
    console.log("1. Test authentication with a known user");
    console.log("2. Verify OAuth login works (Google, GitHub, etc.)");
    console.log("3. Check that user preferences are preserved");
    console.log("===================================================\n");
  } catch (error) {
    logError("Migration failed", error);
    process.exit(1);
  } finally {
    await sourceClient.end();
    await destClient.end();
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
