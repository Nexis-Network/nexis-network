import { Client } from "pg";
import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not defined");
    process.exit(1);
  }

  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log("Creating 'pgboss' schema...");
    await client.query("CREATE SCHEMA IF NOT EXISTS pgboss");
    console.log("'pgboss' schema created successfully.");
  } catch (error) {
    console.error("Failed to create 'pgboss' schema:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
