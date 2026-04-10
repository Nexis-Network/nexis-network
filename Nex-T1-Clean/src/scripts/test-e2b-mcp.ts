
import { config } from "dotenv";
config({ path: ".env.local" });
import { Sandbox } from "@e2b/code-interpreter";

import { E2B_MCP_BRIDGE_PORT, buildSandboxMcpUrl } from "@/types/e2b-sandbox";
import { logger } from '@/lib/logger';
async function testMcp() {
  logger.debug("Starting E2B MCP Capability Test...");
  const apiKey = process.env.E2B_API_KEY;
  if (!apiKey) {
    logger.error("E2B_API_KEY missing");
    process.exit(1);
  }

  const sbx = await Sandbox.create({ apiKey });
  logger.debug(`Sandbox created: ${sbx.sandboxId}`);

  try {
      // 1. Inspect MCP specific properties
      logger.debug("getMcpUrl type:", typeof sbx.getMcpUrl);

      if (typeof sbx.getMcpUrl === "function") {
           const url = sbx.getMcpUrl();
           logger.debug("MCP URL:", url);
      }

      // 2. Try to start a simple server on the MCP bridge port
      const port = E2B_MCP_BRIDGE_PORT;

      logger.debug(`Starting a python HTTP server on port ${port} to verify connectivity...`);
      // Start background server
      await sbx.commands.run(`nohup python3 -m http.server ${port} > /dev/null 2>&1 &`);

      logger.debug("Waiting for server to start...");
      await new Promise(r => setTimeout(r, 2000));

      // 3. Try to connect to the MCP URL (assuming it proxies to mcpPort)
      const mcpUrl = buildSandboxMcpUrl(sbx);

      logger.debug(`Testing connection to: ${mcpUrl}`);

      // Check if it's reachable from outside
      try {
        const res = await fetch(mcpUrl); // Needs node 18+
        logger.debug("Status:", res.status);
        const text = await res.text();
        logger.debug("Response Preview:", text.substring(0, 100));

        if (res.status === 200 && text.includes("Directory listing")) {
            logger.debug("SUCCESS: The MCP URL correctly proxies to the internal server!");
        } else {
            logger.debug("Received response, but maybe not what we expected.");
        }
      } catch (e) {
          logger.error("Failed to fetch MCP URL:", e);
      }

  } catch (err) {
    logger.error("Test failed:", err);
  } finally {
    await sbx.kill();
  }
}

testMcp();
