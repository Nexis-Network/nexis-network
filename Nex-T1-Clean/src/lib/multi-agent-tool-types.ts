import type { Experimental_InferAgentUIMessage as InferAgentUIMessage } from "ai";
import type {
  RequestEvaluationUIToolInvocation,
  SendEvaluationUIToolInvocation,
  SendOptimizationUIToolInvocation,
} from "@/modules/ai-agent-evaluator-optimizer-tools/communication";
import type { EvaluatorUIToolInvocation } from "@/modules/ai-agent-evaluator-optimizer-tools/evaluator";
import type { OptimizerUIToolInvocation } from "@/modules/ai-agent-evaluator-optimizer-tools/optimizer";
import type { evaluatorOptimizerOrchestratorAgent } from "./multi-agent-orchestrator";

export type EvaluatorOptimizerOrchestratorToolUIMessage = InferAgentUIMessage<
  typeof evaluatorOptimizerOrchestratorAgent
>;

export type {
  EvaluatorUIToolInvocation,
  OptimizerUIToolInvocation,
  SendEvaluationUIToolInvocation,
  RequestEvaluationUIToolInvocation,
  SendOptimizationUIToolInvocation,
};
