
import { config } from "dotenv";
config({ path: ".env.local" });

import { Sandbox } from "@e2b/code-interpreter";


import { logger } from '@/lib/logger';
async function testPersistence() {
  logger.debug("🧪 Starting E2B Persistence Test...");

  const apiKey = process.env.E2B_API_KEY;
  if (!apiKey) {
    logger.error("❌ E2B_API_KEY not found in environment variables.");
    process.exit(1);
  }

  try {
    // Step 1: Create a new sandbox
    logger.debug("\n[1/3] Creating initial sandbox...");
    const sandbox1 = await Sandbox.create({ apiKey });
    const sandboxID = sandbox1.sandboxId;
    logger.debug(`✅ Sandbox created with ID: ${sandboxID}`);

    if (!sandboxID) throw new Error("Sandbox ID is undefined!");

    // Step 2: Write a file in the first session
    logger.debug("\n[2/3] Writing verification file in session 1...");
    const fileName = "persistence_test.txt";
    const fileContent = `Verification token: ${Date.now()}`;
    
    // Use .files instead of .filesystem
    await sandbox1.files.write(fileName, fileContent);
    logger.debug(`✅ File '${fileName}' written with content: "${fileContent}"`);
    
    // Use kill() as discovered in probe, or just don't close it explicitly if we want to retain it?
    // Actually, persistence works even if we "disconnect" or "kill" the client side connection.
    // The sandbox itself stays alive for the timeout duration.
    // .kill() usually destroys the sandbox. We should use .disconnect() if it exists?
    // The SDK documentation/probe showed: close: false, kill: true.
    // This implies there is no explicit 'disconnect', just let garbage collection handle it, or there is no persistent connection kept open?
    // Let's just NOT call kill() on the first one, and open a second connection.
    logger.debug("   (Leaving session 1 connection open/dangling to simulate disconnect)");
    
    // Step 3: Connect to the SAME sandbox in a new session
    logger.debug("\n[3/3] Reconnecting to sandbox in session 2...");
    const sandbox2 = await Sandbox.connect(sandboxID, { apiKey });
    logger.debug(`✅ Reconnected to sandbox ID: ${sandbox2.sandboxId}`);

    const readContent = await sandbox2.files.read(fileName);
    logger.debug(`✅ Read content from session 2: "${readContent}"`);

    if (readContent === fileContent) {
      logger.debug("\n🎉 SUCCESS: Persistence verified! File content matches.");
    } else {
      logger.error("\n❌ FAILED: Content mismatch.");
      logger.error(`Expected: ${fileContent}`);
      logger.error(`Actual: ${readContent}`);
      process.exit(1);
    }

    // Cleanup
    logger.debug("🧹 Cleaning up...");
    if ((sandbox1 as UntypedJson).kill) await (sandbox1 as UntypedJson).kill(); 
    else if ((sandbox1 as UntypedJson).close) await (sandbox1 as UntypedJson).close();
    
    // We don't need to kill sandbox2 if it's the same sandbox
    
  } catch (error) {
    logger.error("\n❌ Test failed with error:", error);
    process.exit(1);
  }
}

testPersistence();
