import { asRecord, coerceString, normalizeWorkflowStatus } from "./utils";
import type {
  NativeArtifactCardData,
  NativeWorkflowCanvasData,
  NativeWorkflowEdge,
  NativeWorkflowNode,
} from "./types";

const BRIDGE_WORKFLOW_STAGES = [
  "DEPOSIT_DETECTED",
  "PROCESSING",
  "ORIGIN_TX_CONFIRMED",
  "SUBMITTED",
  "COMPLETED",
] as const;

const BRIDGE_STAGE_LABELS: Record<
  (typeof BRIDGE_WORKFLOW_STAGES)[number] | "FAILED",
  string
> = {
  DEPOSIT_DETECTED: "Deposit detected",
  PROCESSING: "Bridge processing",
  ORIGIN_TX_CONFIRMED: "Origin confirmed",
  SUBMITTED: "Destination submitted",
  COMPLETED: "Funds received",
  FAILED: "Bridge failed",
};

export function deriveWorkflowCanvasFromArtifacts(
  artifacts: NativeArtifactCardData[],
): NativeWorkflowCanvasData | null {
  for (let index = artifacts.length - 1; index >= 0; index -= 1) {
    const artifact = artifacts[index];
    if (!artifact) continue;

    const transactionCanvas = deriveTransactionWorkflowCanvasFromArtifact(artifact);
    if (transactionCanvas) return transactionCanvas;

    const bridgeCanvas = deriveBridgeWorkflowCanvasFromArtifact(artifact);
    if (bridgeCanvas) return bridgeCanvas;
  }

  return null;
}

export function buildWorkflowCanvasFromNodes(args: {
  artifactId: string;
  title: string;
  kind: NativeWorkflowCanvasData["kind"];
  status?: string | null;
  nodes: NativeWorkflowNode[];
}): NativeWorkflowCanvasData | null {
  if (args.nodes.length === 0) {
    return null;
  }

  const laidOutNodes = args.nodes.map((node, index) => ({
    ...node,
    x: node.x ?? 80 + index * 220,
    y: node.y ?? 80 + (index % 2) * 120,
  }));

  return {
    artifactId: args.artifactId,
    title: args.title,
    kind: args.kind,
    status: args.status ?? undefined,
    nodes: laidOutNodes,
    edges: buildSequentialWorkflowEdges(laidOutNodes),
  };
}

function buildSequentialWorkflowEdges(
  nodes: NativeWorkflowNode[],
): NativeWorkflowEdge[] {
  const edges: NativeWorkflowEdge[] = [];

  for (let index = 1; index < nodes.length; index += 1) {
    const previousNode = nodes[index - 1];
    const nextNode = nodes[index];
    if (!previousNode || !nextNode) continue;

    edges.push({
      id: `edge-${previousNode.id}-${nextNode.id}`,
      source: previousNode.id,
      target: nextNode.id,
    });
  }

  return edges;
}

function deriveTransactionWorkflowCanvasFromArtifact(
  artifact: NativeArtifactCardData,
): NativeWorkflowCanvasData | null {
  if (artifact.artifactType !== "transaction-flow") {
    return null;
  }

  const payload = asRecord(artifact.data);
  const title = artifact.title ?? coerceString(payload.title) ?? "Transaction Workflow";
  const status = coerceString(payload.status) ?? artifact.status ?? null;
  const network = coerceString(payload.network);
  const txHash = coerceString(payload.txHash);
  const stepRecords = Array.isArray(payload.steps)
    ? payload.steps.map((step) => asRecord(step))
    : [];

  const artifactNodes = stepRecords.reduce<NativeWorkflowNode[]>((nodes, step, index) => {
    const label = coerceString(step.label) ?? coerceString(step.title) ?? `Step ${index + 1}`;
    if (label.length === 0) {
      return nodes;
    }

    const id = coerceString(step.id) ?? `transaction-step-${index + 1}`;
    const details =
      coerceString(step.details) ??
      coerceString(step.description) ??
      (index === stepRecords.length - 1 ? network ?? txHash ?? undefined : undefined);

    nodes.push({
      id,
      label,
      status: normalizeWorkflowStatus(step.status ?? status),
      details,
    });
    return nodes;
  }, []);

  return artifactNodes.length > 0
    ? buildWorkflowCanvasFromNodes({
        artifactId: `workflow-${artifact.artifactId}`,
        title,
        kind: "transaction",
        status,
        nodes: artifactNodes,
      })
    : buildFallbackTransactionCanvas(artifact, title, status, network, txHash);
}

function buildFallbackTransactionCanvas(
  artifact: NativeArtifactCardData,
  title: string,
  status: string | null,
  network: string | null,
  txHash: string | null,
): NativeWorkflowCanvasData | null {
  return buildWorkflowCanvasFromNodes({
    artifactId: `workflow-${artifact.artifactId}`,
    title,
    kind: "transaction",
    status,
    nodes: [
      {
        id: `${artifact.artifactId}:prepare`,
        label: "Prepare transaction",
        status: status === "pending" ? "running" : "completed",
        details: network ?? undefined,
      },
      {
        id: `${artifact.artifactId}:execute`,
        label: title,
        status: normalizeWorkflowStatus(status),
        details: txHash ?? network ?? undefined,
      },
    ],
  });
}

function deriveBridgeWorkflowCanvasFromArtifact(
  artifact: NativeArtifactCardData,
): NativeWorkflowCanvasData | null {
  if (artifact.artifactType !== "polymarket-bridge-status") {
    return null;
  }

  const payload = asRecord(artifact.data);
  const transactionRecords = Array.isArray(payload.transactions)
    ? payload.transactions.map((transaction) => asRecord(transaction))
    : [];
  const latestTransaction =
    transactionRecords.length > 0
      ? transactionRecords[transactionRecords.length - 1]
      : null;

  if (!latestTransaction) {
    return null;
  }

  const latestStatus = coerceString(latestTransaction.status) ?? "PROCESSING";
  const routeSummary = [
    coerceString(latestTransaction.fromChainId),
    coerceString(latestTransaction.toChainId),
  ]
    .filter(Boolean)
    .join(" -> ");
  const stageIds = getBridgeStageIds(latestStatus);
  const currentIndex = getBridgeStageIndex(stageIds, latestStatus);

  const nodes = stageIds.map((stage, index) => ({
    id: `${artifact.artifactId}:${stage.toLowerCase()}`,
    label: BRIDGE_STAGE_LABELS[stage],
    status: resolveBridgeNodeStatus(stage, index, currentIndex),
    details:
      index === 0
        ? routeSummary || undefined
        : index === currentIndex
          ? coerceString(latestTransaction.txHash) ?? undefined
          : undefined,
  }));

  return buildWorkflowCanvasFromNodes({
    artifactId: `workflow-${artifact.artifactId}`,
    title: artifact.title ?? "Bridge Workflow",
    kind: "bridge",
    status: latestStatus,
    nodes,
  });
}

function getBridgeStageIds(status: string) {
  return status === "FAILED"
    ? [...BRIDGE_WORKFLOW_STAGES, "FAILED" as const]
    : [...BRIDGE_WORKFLOW_STAGES];
}

function getBridgeStageIndex(
  stageIds: Array<(typeof BRIDGE_WORKFLOW_STAGES)[number] | "FAILED">,
  status: string,
): number {
  return stageIds.indexOf(
    stageIds.includes(status as (typeof stageIds)[number])
      ? (status as (typeof stageIds)[number])
      : "PROCESSING",
  );
}

function resolveBridgeNodeStatus(
  stage: (typeof BRIDGE_WORKFLOW_STAGES)[number] | "FAILED",
  index: number,
  currentIndex: number,
): NativeWorkflowNode["status"] {
  if (index < currentIndex) return "completed";
  if (index > currentIndex) return "pending";
  if (stage === "FAILED") return "failed";
  return stage === "COMPLETED" ? "completed" : "running";
}
