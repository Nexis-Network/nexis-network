import type { IntentCategory, IntentClassification } from "@/modules/chat/intent-classifier";
import type {
  NativeWorkflowCanvasData,
  NativeWorkflowEdge,
  NativeWorkflowNode,
} from "@/modules/chat/ui-message-parts";

import {
  isMorphNexCodeModel,
  shouldEnableArtifactCodingParity,
} from "./morph-routing";

export type WorkflowProgressUpdate = {
  workflowId: string;
  stepName: string;
  status: "pending" | "running" | "completed" | "failed";
  progress?: number;
};

const VISUAL_WORKFLOW_INTENT_CATEGORIES = new Set<IntentCategory>([
  "code_generation",
  "smart_contract",
  "task_scheduling",
]);

export function shouldEmitWorkflowVisuals(args: {
  classification: IntentClassification;
  requestedModelAlias?: string | null;
}): boolean {
  const normalizedModelAlias = (args.requestedModelAlias ?? "").toLowerCase();

  if (
    isMorphNexCodeModel(normalizedModelAlias) ||
    shouldEnableArtifactCodingParity(normalizedModelAlias)
  ) {
    return true;
  }

  return VISUAL_WORKFLOW_INTENT_CATEGORIES.has(args.classification.category);
}

function toWorkflowNode(
  update: WorkflowProgressUpdate,
  index: number,
): NativeWorkflowNode {
  return {
    id: `${update.workflowId}:${update.stepName}:${index}`,
    label: update.stepName,
    status: update.status,
    details:
      typeof update.progress === "number"
        ? `Progress ${update.progress}%`
        : undefined,
    x: 80 + index * 220,
    y: 80 + (index % 2) * 120,
  };
}

export function buildWorkflowCanvas(
  updates: WorkflowProgressUpdate[],
): NativeWorkflowCanvasData | null {
  if (updates.length === 0) {
    return null;
  }

  const nodes = updates.map(toWorkflowNode);
  const edges: NativeWorkflowEdge[] = [];

  for (let index = 1; index < nodes.length; index += 1) {
    edges.push({
      id: `edge-${index - 1}-${index}`,
      source: nodes[index - 1].id,
      target: nodes[index].id,
    });
  }

  const latest = updates[updates.length - 1];

  return {
    artifactId: `workflow-${latest.workflowId}`,
    title: "Workflow Canvas",
    status: latest.status,
    nodes,
    edges,
  };
}
