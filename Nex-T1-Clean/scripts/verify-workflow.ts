import { config } from "dotenv";
config({ path: ".env.local" });

import { workflowClient } from "../src/lib/workflow/client";
import { researchAgentWorkflow } from "../src/lib/workflow/definitions";

async function main() {
  console.log("Triggering 'research-agent' workflow...");
  console.log("Workflow object:", JSON.stringify(researchAgentWorkflow, null, 2));
  try {
    const { runId } = await workflowClient.trigger(
      researchAgentWorkflow,
      [{ topic: "AI Agents", depth: 1 }]
    );
    console.log(`Workflow triggered successfully. ID: ${runId}`);
    console.log("Check the 'workflow_runs' table or logs to verify execution.");
  } catch (error) {
    console.error("Failed to trigger workflow:", error);
    process.exit(1);
  }
}

main();
