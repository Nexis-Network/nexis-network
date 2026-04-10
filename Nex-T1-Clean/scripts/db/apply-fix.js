require("dotenv").config({ path: ".env.local" });
require("dotenv").config();

const { Client } = require('pg');

const args = process.argv.slice(2);
let connectionString =
  args[0] ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.RAILWAY_DATABASE_URL ||
  process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Usage: node scripts/db/apply-fix.js <CONNECTION_STRING>");
  console.error(
    "Or set DATABASE_URL_UNPOOLED / RAILWAY_DATABASE_URL / DATABASE_URL and run without arguments.",
  );
  process.exit(1);
}

// Check if it's the internal one (won't work locally)
if (connectionString.includes('.railway.internal')) {
    console.warn("⚠️  WARNING: You provided an internal Railway URL.");
    console.warn("   This script must be run with the PUBLIC TCP Proxy URL if running locally.");
}

const client = new Client({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false }, // Required for Railway Proxy
});

async function run() {
  try {
    console.log("🔌 Connecting to database...");
    await client.connect();
    console.log("✅ Connected.");

    console.log("🛠  Running fix: ALTER TABLE auth.identities ALTER COLUMN id TYPE text...");
    await client.query('ALTER TABLE auth.identities ALTER COLUMN id TYPE text USING id::text;');
    
    console.log("✅ Fix applied successfully!");
    console.log("🎉 You can now restart the Supabase Auth service.");
  } catch (err) {
    console.error("❌ Error applying fix:", err.message);
    if (err.message.includes("closed the connection")) {
        console.error("   (This usually means SSL handshake failed or firewall blocked the port. Ensure you are using the correct Proxy URL/Port).");
    }
  } finally {
    await client.end();
  }
}

run();
