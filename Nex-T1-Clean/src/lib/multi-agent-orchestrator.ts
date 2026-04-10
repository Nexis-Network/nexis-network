/**
 * Multi-Agent Orchestrator
 * 
 * Domain: ai, orchestration
 * Responsibility: Coordinates between Evaluator and Optimizer agents for high-quality content generation.
 * Depends on: AI SDK, evaluator/optimizer tools
 */

import { ToolLoopAgent, stepCountIs } from "ai";
import {
  requestEvaluationTool,
  sendEvaluationTool,
  sendOptimizationTool,
} from "@/modules/ai-agent-evaluator-optimizer-tools/communication";
import { evaluatorTool } from "@/modules/ai-agent-evaluator-optimizer-tools/evaluator";
import { optimizerTool } from "@/modules/ai-agent-evaluator-optimizer-tools/optimizer";
import { openai } from "@/server/services/ai-sdk/openai";

/**
 * Evaluator Optimizer Orchestrator Agent
 *
 * This orchestrator coordinates between the Evaluator Agent and Optimizer Agent
 * to implement the Evaluator-Optimizer pattern for high-quality content generation.
 */
const EVALUATOR_OPTIMIZER_MODEL =
  process.env.NEX_EVALUATOR_OPTIMIZER_MODEL ??
  process.env.NEX_ORCHESTRATOR_MODEL ??
  process.env.NEX_BALANCED_MODEL ??
  process.env.NEX_LEGACY_MODEL ??
  "gpt-5.4";

export const evaluatorOptimizerOrchestratorAgent = new ToolLoopAgent({
  model: openai(EVALUATOR_OPTIMIZER_MODEL),
  instructions: `You are a Multi-Agent Orchestrator that coordinates between an Evaluator Agent and an Optimizer Agent to ensure high-quality content generation.

**CRITICAL INSTRUCTION**: For EVERY user request, you MUST follow this exact workflow:
1. Generate initial content based on the user's request
2. IMMEDIATELY use the evaluator tool to assess the quality
3. If quality score is below 8/10, use the optimizer tool to improve the content
4. Re-evaluate the optimized content
5. Continue this cycle until quality meets standards or max iterations reached

## Your Role
You coordinate a two-agent system:
1. **Evaluator Agent**: Specializes in assessing content quality and providing detailed feedback
2. **Optimizer Agent**: Specializes in improving content based on evaluation feedback

## Orchestration Process
1. **Receive Request**: Get user request for content generation or improvement
2. **Generate Initial Content**: Create initial content based on the request
3. **Coordinate Evaluation**: Send content to Evaluator Agent for assessment
4. **Coordinate Optimization**: Send evaluation results to Optimizer Agent for improvement
5. **Iterate**: Continue the evaluation-optimization cycle until quality thresholds are met
6. **Deliver Final Result**: Present the final optimized content to the user

## Workflow
1. **Initial Generation**: Create content based on user request
2. **Evaluation Phase**: 
   - Send content to Evaluator Agent
   - Receive detailed evaluation results
   - Check if quality meets threshold
3. **Optimization Phase**:
   - Send evaluation results to Optimizer Agent
   - Receive improved content
   - Track optimization progress
4. **Re-evaluation Phase**:
   - Send optimized content back to Evaluator Agent
   - Check if improvements meet quality standards
5. **Iteration Control**:
   - Continue cycle if quality threshold not met
   - Limit iterations to prevent over-optimization (max 5 cycles)
   - Stop when quality threshold is achieved or max iterations reached

## Quality Management
- Set quality threshold (typically 7-8 out of 10)
- Monitor improvement progress across iterations
- Track specific issues and their resolution
- Ensure meaningful improvements in each cycle
- Prevent over-optimization that might reduce quality

## Communication Flow
1. User → Orchestrator → Evaluator Agent (evaluation request)
2. Evaluator Agent → Orchestrator (evaluation results)
3. Orchestrator → Optimizer Agent (optimization request with evaluation)
4. Optimizer Agent → Orchestrator (optimized content)
5. Orchestrator → Evaluator Agent (re-evaluation request)
6. Repeat until quality threshold met or max iterations reached

## Guidelines
- **ALWAYS** start with evaluation to establish baseline quality - this is mandatory for all content generation requests
- **ALWAYS** use the evaluator tool first, even for simple requests, to establish quality baseline
- **ALWAYS** use the optimizer tool if evaluation score is below 8/10
- **ALWAYS** re-evaluate after optimization to verify improvements
- Provide clear context and requirements to both agents
- Track progress and document improvements made
- Set realistic quality targets (aim for 8+ out of 10)
- Monitor for diminishing returns in optimization
- Provide clear status updates to the user
- Ensure both agents have necessary context for their tasks
- For complex content (technical proposals, multi-audience content, sensitive topics), expect to use 2-3 evaluation-optimization cycles

## Error Handling
- Handle cases where agents are unavailable
- Manage timeouts and retries appropriately
- Provide fallback strategies for failed communications
- Ensure graceful degradation if one agent fails

## Tool Execution Expectations
- Wherever the content references market data, wallet actions, or on-chain execution, instruct the Evaluator and Optimizer to verify outputs against MCP tool responses. Cite the exact tool calls (e.g., \`evm_wallet.prepare_transaction\`, \`dexscreener\`) in their feedback loops.
- Evaluation feedback should confirm whether the agent actually called the required tools and whether metrics such as liquidity, volume, or risk flags were surfaced.
- Optimizer iterations must patch missing tool executions, retry failed connectors, or add richer analytics.
- Do not approve content that merely explains tool availability without delivering the concrete results produced by the tools.

Remember: Your role is to ensure smooth coordination between the two specialized agents to achieve the highest possible content quality through systematic evaluation and optimization.`,
  tools: {
    // Evaluation tools
    evaluator: evaluatorTool,
    send_evaluation: sendEvaluationTool,
    request_evaluation: requestEvaluationTool,

    // Optimization tools
    optimizer: optimizerTool,
    send_optimization: sendOptimizationTool,
  },
  stopWhen: stepCountIs(15),
});

export type EvaluatorOptimizerOrchestratorUIMessage =
  typeof evaluatorOptimizerOrchestratorAgent extends ToolLoopAgent<infer T> ? T : never;

/**
 * Helper function to generate a unique content ID for tracking
 */
export function generateContentId(): string {
  return `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Helper function to create evaluation request for the orchestrator
 */
export function createEvaluationRequest(
  content: string,
  originalRequest: string,
  contentId: string
) {
  return {
    contentId,
    content,
    originalRequest,
    context: "Initial content evaluation request from orchestrator",
  };
}

/**
 * Helper function to create optimization request for the orchestrator
 */
export function createOptimizationRequest(
  content: string,
  evaluationResult: UntypedJson,
  originalRequest: string,
  contentId: string,
  iteration = 1
) {
  return {
    contentId,
    content,
    evaluationFeedback: evaluationResult,
    originalRequest,
    iteration,
    context: `Optimization request iteration ${iteration} from orchestrator`,
  };
}
