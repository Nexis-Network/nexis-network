import { config as loadEnv } from "dotenv";
import pg from 'pg';

loadEnv({ path: ".env.local" });
loadEnv();

const url =
  process.env.DATABASE_URL_UNPOOLED?.trim() ||
  process.env.RAILWAY_DATABASE_URL?.trim() ||
  process.env.DATABASE_URL?.trim();

if (!url) {
  throw new Error(
    "Set DATABASE_URL_UNPOOLED, RAILWAY_DATABASE_URL, or DATABASE_URL before applying the Stripe fix.",
  );
}

const client = new pg.Client({ connectionString: url });

async function main() {
  await client.connect();
  console.log("Connected. Applying Stripe integration fixes...");
  
  try {
    await client.query('BEGIN');

    // 1. Add stripe_customer_id column
    console.log("Adding stripe_customer_id column...");
    await client.query(`
      ALTER TABLE public.user_profiles
      ADD COLUMN IF NOT EXISTS stripe_customer_id text UNIQUE;
    `);

    // 2. Update plan check constraint
    console.log("Updating plan check constraint...");
    await client.query(`
      ALTER TABLE public.user_profiles
      DROP CONSTRAINT IF EXISTS user_profiles_plan_chk;
    `);

    await client.query(`
      ALTER TABLE public.user_profiles
      ADD CONSTRAINT user_profiles_plan_chk 
      CHECK (plan IN ('free', 'pro', 'trader', 'ultra', 'enterprise'));
    `);

    // 3. Create index
    console.log("Creating index for stripe_customer_id...");
    await client.query(`
      CREATE INDEX IF NOT EXISTS user_profiles_stripe_customer_id_idx ON public.user_profiles (stripe_customer_id);
    `);

    await client.query('COMMIT');
    console.log("Migration applied successfully.");
  } catch (e) {
    await client.query('ROLLBACK');
    console.error("Migration failed:", e);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
