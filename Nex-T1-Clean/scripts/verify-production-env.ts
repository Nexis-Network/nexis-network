import { createClient } from "@supabase/supabase-js";

const requiredVars = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL",
  // "LANGFUSE_BASE_URL", // Optional for now if not strictly required for boot
  // "LANGFUSE_SECRET_KEY",
  // "LANGFUSE_PUBLIC_KEY",
];

async function main() {
  console.log("🔍 Verifying Production Environment Variables...");
  
  const missing = requiredVars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }

  console.log("✅ All required variables are present.");

  // specific checks
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  try {
    console.log(`Testing Supabase Connection to: ${supabaseUrl}`);
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: _data, error } = await supabase.from("users").select("count", { count: "exact", head: true });
    
    if (error && error.code !== "PGRST301") { // Ignore table not found, just checking connectivity
       console.warn(`⚠️ Supabase connected but query failed (might be permissions or missing table): ${error.message}`);
    } else {
        console.log("✅ Supabase Connection verified.");
    }

  } catch (err: unknown) {
      console.error(`❌ Supabase Connection passed check but threw: ${err.message}`);
  }

  // Check Database URL format (basic check)
  const dbUrl = process.env.DATABASE_URL!;
  if (!dbUrl.startsWith("postgresql://") && !dbUrl.startsWith("postgres://")) {
      console.error("❌ DATABASE_URL does not look like a postgres connection string.");
      process.exit(1);
  }
  
  if (dbUrl.includes("railway.app") || dbUrl.includes("railway.com")) {
      console.warn("⚠️  WARNING: DATABASE_URL appears to be using a public Railway domain. This will incur egress fees.");
      console.warn("    Reason: Found 'railway.app' or 'railway.com' in the connection string.");
      console.warn("    Fix: Use the private internal domain (e.g., 'pgvector.railway.internal') or Service Variable '${{Postgres.DATABASE_URL}}'.");
      // We don't exit(1) to avoid breaking builds if this is intentional, but we log a loud warning.
  } else {
      console.log("✅ DATABASE_URL appears to be using a private/internal connection.");
  }
  console.log("✅ DATABASE_URL format appears valid.");

}

main().catch((err) => {
  console.error("❌ Verification failed:", err);
  process.exit(1);
});
