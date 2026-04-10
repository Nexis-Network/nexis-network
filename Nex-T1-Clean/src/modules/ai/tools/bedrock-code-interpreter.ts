/**
 * Bedrock Code Interpreter Tool
 * 
 * Domain: AI Tools - Code Execution
 * Responsibility: Execute code via AWS Bedrock Agent
 * Notes: Modernized to use AI SDK 5.0 native tool pattern with JSON Schema.
 */

import { createTool, createToolSchema, stringProp } from "./create-tool";


import { logger } from '@/lib/logger';
// ============================================================================
// CONSTANTS
// ============================================================================

const BEDROCK_CONFIGURED = Boolean(
  process.env.BEDROCK_AGENT_ID &&
    process.env.BEDROCK_AGENT_ALIAS_ID &&
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY,
);

// ============================================================================
// TYPES
// ============================================================================

interface BedrockCodeInterpreterInput {
  code: string;
  task: string;
}

interface BedrockCodeInterpreterOutput {
  success: boolean;
  output?: string;
  error?: string;
}

// ============================================================================
// SCHEMA
// ============================================================================

const bedrockCodeInterpreterSchema = createToolSchema(
  {
    code: stringProp("The code to execute (Python)"),
    task: stringProp("Description of the task to be performed by the code"),
  },
  ["code", "task"],
);

// ============================================================================
// TOOL
// ============================================================================

export const bedrockCodeInterpreterTool = createTool<
  BedrockCodeInterpreterInput,
  BedrockCodeInterpreterOutput
>({
  description:
    "Execute code using the Bedrock Agent Code Interpreter. Use this for complex calculations, data analysis, or graph generation.",
  schema: bedrockCodeInterpreterSchema,
  execute: async (input: BedrockCodeInterpreterInput): Promise<BedrockCodeInterpreterOutput> => {
    const { code, task } = input;

    // Early exit if not configured
    if (!BEDROCK_CONFIGURED) {
      return {
        success: false,
        error:
          "Bedrock Code Interpreter is not configured. Missing BEDROCK_AGENT_ID, BEDROCK_AGENT_ALIAS_ID, or AWS credentials.",
      };
    }

    try {
      // Lazy load dependencies only when actually executing
      const { bedrockAgentRuntime } = await import("@/modules/bedrock-agent/runtime");
      const { bedrockConfig } = await import("@/modules/bedrock-agent/config");

      const sessionId = "session-" + Date.now();
      const prompt = `Execute the following code to ${task}:\n\`\`\`python\n${code}\n\`\`\``;

      if (!bedrockConfig.agent.id || !bedrockConfig.agent.aliasId) {
        return {
          success: false,
          error: "Bedrock Agent ID/Alias not configured.",
        };
      }

      const completion = await bedrockAgentRuntime.invokeAgent({
        sessionId,
        inputText: prompt,
        agentId: bedrockConfig.agent.id,
        agentAliasId: bedrockConfig.agent.aliasId,
      });

      let result = "";
      if (completion) {
        for await (const event of completion) {
          if (event.chunk && event.chunk.bytes) {
            result += new TextDecoder().decode(event.chunk.bytes);
          }
        }
      }

      return {
        success: true,
        output: result,
      };
    } catch (error) {
      logger.error("[BedrockCodeInterpreter] execution failed", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// Export schema for backward compatibility
export { bedrockCodeInterpreterSchema };
