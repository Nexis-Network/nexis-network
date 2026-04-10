import { StrategySnapshot, StrategyWorkflowNode } from "@/lib/strategies/types";
import { ZeroExSwapInstruction } from "@/lib/agents/execution/types";

const DEFAULT_CHAIN_ID = 1;
const DEFAULT_SLIPPAGE_BPS = 100;

function parseNumberField(fieldValue: string | undefined): string | null {
  if (!fieldValue) return null;
  const normalized = fieldValue.trim();
  if (normalized.length === 0) return null;
  if (!Number.isFinite(Number(normalized))) {
    return null;
  }
  return normalized;
}

function inferAmountFromNode(node: StrategyWorkflowNode): string {
  const fieldAmount = parseNumberField(node.fields.AMOUNT ?? node.fields.AMOUNT_VALUE);
  if (fieldAmount) return fieldAmount;

  // Attempt to locate a numeric child node connected via a value edge.
  const amountEdge = node.edges.find((edge) => edge.kind === "value" && (edge.label?.toUpperCase() === "AMOUNT" || !edge.label));
  if (amountEdge) {
    const childId = amountEdge.targetId;
    const childNode = workflowIndex.get(childId);
    if (childNode) {
      const literalValue = parseNumberField(childNode.fields.NUM ?? childNode.fields.VALUE ?? childNode.fields.TEXT);
      if (literalValue) {
        return literalValue;
      }
    }
  }

  return "0";
}

let workflowIndex: Map<string, StrategyWorkflowNode>;

export function extractZeroExSwapInstructions(snapshot: StrategySnapshot): ZeroExSwapInstruction[] {
  workflowIndex = new Map(snapshot.workflow.nodes.map((node) => [node.id, node]));

  const zeroExNodes = snapshot.workflow.nodes.filter((node) => node.type === "zeroex_swap");

  return zeroExNodes.map((node) => {
    const amountModeRaw = (node.fields.AMOUNT_MODE ?? "SELL").toUpperCase();
    const amountMode = amountModeRaw === "BUY" ? "BUY" : "SELL";
    const sellToken = node.fields.SELL_TOKEN ?? "ETH";
    const buyToken = node.fields.BUY_TOKEN ?? "USDC";
    const chainId = Number.parseInt(node.fields.CHAIN_ID ?? String(DEFAULT_CHAIN_ID), 10) || DEFAULT_CHAIN_ID;
    const slippageBps = Number.parseInt(node.fields.SLIPPAGE_BPS ?? String(DEFAULT_SLIPPAGE_BPS), 10) || DEFAULT_SLIPPAGE_BPS;
    const takerAddress = node.fields.TAKER?.trim() || undefined;
    const amount = inferAmountFromNode(node);

    return {
      node,
      amountMode,
      sellToken,
      buyToken,
      chainId,
      slippageBps,
      takerAddress,
      amount,
    };
  });
}
