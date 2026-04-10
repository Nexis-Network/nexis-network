import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const snapshotPath = path.join(
  repoRoot,
  "src/modules/mcp/build-tool-snapshot.ts",
);

dotenv.config({ path: path.join(repoRoot, ".env.local") });
dotenv.config({ path: path.join(repoRoot, ".env.production"), override: false });

function getSupabaseEnv() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_PROJECT_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase URL or service role key");
  }

  return { url, key };
}

function toSource(rows) {
  const payload = JSON.stringify(rows, null, 2);
  return `import type { ToolDefinition } from "@/modules/ai/system-guidance";

// Generated from the live mcp_tools table for build-safe execution.
// Refresh with: \`node ./scripts/refresh-mcp-tool-build-snapshot.mjs\`
export const BUILD_SAFE_MCP_TOOLS_SNAPSHOT: ToolDefinition[] = ${payload};
`;
}

async function main() {
  const { url, key } = getSupabaseEnv();
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from("mcp_tools")
    .select("name, endpoint, config")
    .order("name");

  if (error) {
    throw error;
  }

  const rows = (data ?? []).map((row) => ({
    id: row.name,
    description: row.config?.description,
    endpoint: row.endpoint,
    ...row.config,
  }));

  await fs.writeFile(snapshotPath, toSource(rows), "utf8");
  console.log(
    `Wrote ${rows.length} MCP tool${rows.length === 1 ? "" : "s"} to ${path.relative(repoRoot, snapshotPath)}`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
