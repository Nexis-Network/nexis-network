
import { config } from "dotenv";
config({ path: ".env.local" });
import { Sandbox } from "@e2b/code-interpreter";


import { logger } from '@/lib/logger';
async function probe() {
  logger.debug("🕵️ Probing E2B Sandbox Capabilities...");
  const apiKey = process.env.E2B_API_KEY;
  if (!apiKey) {
    logger.error("❌ Missing E2B_API_KEY");
    process.exit(1);
  }

  const sbx = await Sandbox.create({ apiKey });
  
  try {
    logger.debug("🔍 Inspecting Sandbox Object...");
    logger.debug("Keys:", Object.keys(sbx));
    logger.debug("Prototype Keys:", Object.getOwnPropertyNames(Object.getPrototypeOf(sbx)));
    
    // Check deeper prototype chain
    const proto = Object.getPrototypeOf(sbx);
    const deepProto = Object.getPrototypeOf(proto);
    if (deepProto) {
        logger.debug("Deep Prototype Keys:", Object.getOwnPropertyNames(deepProto));
    }

    // Check for .pty or .process managers
    logger.debug("Has .pty?", !!(sbx as UntypedJson).pty);
    if ((sbx as UntypedJson).pty) {
        logger.debug("   .pty keys:", Object.keys((sbx as UntypedJson).pty));
        logger.debug("   .pty proto:", Object.getOwnPropertyNames(Object.getPrototypeOf((sbx as UntypedJson).pty)));
    }

    // Attempt to see what .commands returns deeply
    logger.debug("Checking command return structure...");
    const cmd = await sbx.commands.run("echo 'hello'");
    logger.debug("Command result keys:", Object.keys(cmd));
    
    // Check if there is a 'start' or 'stream' method on commands
    logger.debug("Has .commands.start?", !!(sbx.commands as UntypedJson).start);
    logger.debug("Has .commands.stream?", !!(sbx.commands as UntypedJson).stream);

  } catch (err) {
    logger.error("❌ Probe failed:", err);
  } finally {
    // Try to close safely
    if ((sbx as UntypedJson).kill) await (sbx as UntypedJson).kill();
  }
}

probe();
