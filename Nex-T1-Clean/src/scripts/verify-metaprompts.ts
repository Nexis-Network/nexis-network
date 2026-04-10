
import { assembleMetaprompts } from "@/modules/ai/metaprompts/index";


import { logger } from '@/lib/logger';
async function verifyMetaprompts() {
  logger.debug("Verifying Metaprompt Assembly...");

  const prompt = assembleMetaprompts({
    includeDocumentCanvasGuide: true,
  });

  if (prompt.includes("<document_canvas_guide>")) {
    logger.debug("SUCCESS: Document Canvas Guide found in assembled prompt.");
  } else {
    logger.error("FAILURE: Document Canvas Guide NOT found in assembled prompt.");
    process.exit(1);
  }

  if (prompt.includes("Whitepaper")) {
    logger.debug("SUCCESS: Whitepaper template found.");
  } else {
     logger.error("FAILURE: Whitepaper template NOT found.");
     process.exit(1);
  }

  const requiredContracts = [
    "<instruction_hierarchy>",
    "<mid_conversation_updates>",
    "<tool_persistence_rules>",
    "<verification_loop>",
    "<missing_context_gating>",
    "<action_safety>",
    "<citation_rules>",
    "<grounding_rules>",
    "<research_answer_contract>",
    "<structured_output_contract>",
  ];

  for (const contract of requiredContracts) {
    if (!prompt.includes(contract)) {
      logger.error(`FAILURE: Required metaprompt contract missing: ${contract}`);
      process.exit(1);
    }
  }
}

verifyMetaprompts().catch(logger.error);
