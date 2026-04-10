
import { config } from "dotenv";
config({ path: ".env.local" });

import { e2bCodeInterpreterTool } from "@/modules/ai/tools/e2b-code-interpreter";
import { write_file, read_file } from "@/modules/ai/tools/e2b-files";
import { Sandbox } from "@e2b/code-interpreter";


import { logger } from '@/lib/logger';
async function testToolsContext() {
  logger.debug("🧪 Starting E2B Tools Context Verification...");

  const apiKey = process.env.E2B_API_KEY;
  if (!apiKey) {
    logger.error("❌ E2B_API_KEY missing");
    process.exit(1);
  }

  // 1. Create a real sandbox to get an ID
  const sbx = await Sandbox.create({ apiKey });
  const sandboxID = sbx.sandboxId;
  logger.debug(`✅ setup: Created sandbox ${sandboxID}`);

  try {
    // 2. Mock Context with that ID
    const mockContext = {
      toolCallId: "test-call",
      messages: [],
      metadata: {
        sandbox_id: sandboxID
      }
    };

    // 3. Test write_file WITHOUT explicit sandboxID in input (should use context)
    logger.debug("[Test 1] write_file (implicit sandbox_id in context)...");
    const writeResult = await write_file.execute({
        path: "context_test.txt",
        content: "context works"
        // NO sandboxID here
    }, mockContext);

    if ((writeResult as UntypedJson).success && (writeResult as UntypedJson).sandboxID === sandboxID) {
        logger.debug("✅ write_file succeeded using context ID");
    } else {
        logger.error("❌ write_file failed or used wrong ID", writeResult);
        throw new Error("write_file context test failed");
    }

    // 4. Test read_file WITHOUT explicit sandboxID
    logger.debug("[Test 2] read_file (implicit sandbox_id in context)...");
    const readResult = await read_file.execute({
        path: "context_test.txt"
        // NO sandboxID here
    }, mockContext);

    if ((readResult as UntypedJson).success && (readResult as UntypedJson).content === "context works") {
        logger.debug("✅ read_file succeeded using context ID");
    } else {
         logger.error("❌ read_file failed", readResult);
         throw new Error("read_file context test failed");
    }

    // 5. Test Code Interpreter
    logger.debug("[Test 3] code interpreter (implicit sandbox_id)...");
    // Ensure we can set a variable and read it back to prove it's the same session
    await e2bCodeInterpreterTool.execute({
        code: "x = 42"
    }, mockContext);
    
    const codeResult = await e2bCodeInterpreterTool.execute({
        code: "print(x)"
    }, mockContext);

    if (codeResult.stdout.trim() === "42" && codeResult.sandboxID === sandboxID) {
        logger.debug("✅ code interpreter succeeded using context ID");
    } else {
        logger.error("❌ code interpreter failed", codeResult);
        throw new Error("code interpreter context test failed");
    }

    logger.debug("\n🎉 ALL CONTEXT TESTS PASSED");

  } catch (err) {
      logger.error("\n❌ Test Failed:", err);
      process.exit(1);
  } finally {
      await sbx.kill();
  }
}

testToolsContext();
