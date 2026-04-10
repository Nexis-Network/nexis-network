import { config } from "dotenv";
config({ path: ".env.local" });

import { createWorld } from "@workflow/world-postgres";
import { WORKFLOW_POSTGRES_RUNTIME_STATUS } from "@/lib/workflow/definitions";

// Ensure workflow modules are evaluated so directives are registered for worker execution.
import "../lib/workflow/definitions";

async function main() {
  console.log(`Starting Workflow Worker (Postgres World, ${WORKFLOW_POSTGRES_RUNTIME_STATUS})...`);

  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL environment variable is required. " +
      "Run with: DATABASE_URL=<your_pg_url> pnpm worker"
    );
  }

  // Derive base URL from PORT env var to match the running Next.js dev server.
  const port = process.env.PORT || "3006";
  const baseUrl =
    process.env.WORKFLOW_LOCAL_BASE_URL || `http://localhost:${port}`;

  console.log(`Testing connection to ${baseUrl}...`);
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${baseUrl}/.well-known/workflow/v1/flow`, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    console.log(`Connection test result: ${res.status} ${res.statusText}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(
      `Connection test to Next.js failed (${msg}). ` +
      "Make sure the dev server is running. The worker will still start."
    );
  }

  console.log("Creating Postgres World...");
  const world = createWorld({ connectionString });

  // Start the worker polling
  console.log("Starting workflow worker (polling pg-boss)...");
  await world.start();
  console.log("Worker started and polling for jobs.");

  // Keep the process alive
  process.on("SIGINT", () => {
    console.log("Worker shutting down...");
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    console.log("Worker received SIGTERM, shutting down...");
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Worker failed to start:", err);
  process.exit(1);
});
