
import { config } from "dotenv";
config({ path: ".env.local" });

import { Sandbox } from "@e2b/code-interpreter";


import { logger } from '@/lib/logger';
async function testPreview() {
  logger.debug("🧪 Starting E2B Preview Test...");
  const apiKey = process.env.E2B_API_KEY;
  if (!apiKey) {
    logger.error("❌ E2B_API_KEY missing");
    process.exit(1);
  }

  const sbx = await Sandbox.create({ apiKey });
  logger.debug(`✅ Sandbox created: ${sbx.sandboxId}`);

  try {
    // 1. Install Express
    logger.debug("📦 Installing 'express'...");
    await sbx.commands.run("npm install express");
    
    // 2. Write server.js
    logger.debug("📝 Writing server.js...");
    // Use .files.write
    await sbx.files.write("server.js", `
      const express = require('express');
      const app = express();
      const port = 3000;
      app.get('/', (req, res) => res.send('Hello from E2B Sandbox!'));
      app.listen(port, () => logger.debug('Server running on ' + port));
    `);

    // 3. Start Server (Background)
    logger.debug("🚀 Starting server...");
    // Using nohup to simulate background like our tool does
    await sbx.commands.run("nohup node server.js > /dev/null 2>&1 &");
    
    // 4. Get Preview URL
    const host = (sbx as UntypedJson).sandboxDomain || "e2b.app"; // Default to e2b.app
    
    const url = `https://${3000}-${sbx.sandboxId}.${host}`;
    
    logger.debug(`\n🌐 Preview URL: ${url}\n`);
    logger.debug("Please open this URL in your browser to verify.");
    
    logger.debug("🔍 Verifying internal localhost access (waiting for startup)...");
    
    // Retry logic
    for (let i = 0; i < 10; i++) {
        try {
            const curlRes = await sbx.commands.run("curl localhost:3000");
            logger.debug("   Internal Response:", curlRes.stdout);
            break;
        } catch {
            logger.debug(`   Attempt ${i+1}: Server not ready yet...`);
            await new Promise(r => setTimeout(r, 2000));
        }
    }

  } catch (err) {
    logger.error("❌ Test failed:", err);
  } finally {
    logger.debug("Waiting 30 seconds before closing to allow manual check...");
    await new Promise(r => setTimeout(r, 30000));
    
    // Use kill()
    if ((sbx as UntypedJson).kill) await (sbx as UntypedJson).kill(); 
    else if ((sbx as UntypedJson).close) await (sbx as UntypedJson).close();
  }
}

testPreview();
