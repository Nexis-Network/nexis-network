import { XMLParser } from "fast-xml-parser";
import { nanoid } from "nanoid";

import type {
  StrategySnapshot,
  StrategySummary,
  StrategyWorkflow,
  StrategyWorkflowNode,
} from "./types";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  textNodeName: "text",
  parseTagValue: false,
  trimValues: true,
});

type RawField = {
  name?: string;
  text?: string;
  ["@_name"]?: string;
  ["#text"]?: string;
};

type RawBlockRef = {
  block?: RawBlock;
};

type RawStatement = {
  name?: string;
  ["@_name"]?: string;
  block?: RawBlock;
};

type RawValue = RawStatement;

type RawBlock = {
  id?: string;
  type: string;
  field?: RawField | RawField[];
  value?: RawValue | RawValue[];
  statement?: RawStatement | RawStatement[];
  next?: RawBlockRef;
};

const TITLE_BY_TYPE: Record<string, string> = {
  strategy_start: "Strategy Start",
  trading_action: "Trading Action",
  technical_indicator: "Indicator Condition",
  zeroex_swap: "0x Swap",
  limit_order_condition: "Limit Order Condition",
  limit_order_management: "Limit Order Management",
  limit_order_strategy: "Limit Order Strategy",
  limit_order_config: "Strategy Configuration",
  limit_order_monitoring: "Order Monitoring",
  market_data: "Market Data",
  get_price: "Get Price",
  blockchain_operation: "Blockchain Operation",
  gas_optimization: "Gas Optimisation",
  defi_operation: "DeFi Operation",
  swap_operation: "Swap Operation",
  staking_operation: "Staking Operation",
  ai_agent: "AI Agent",
  ai_agent_config: "AI Agent Config",
  ai_prompt: "AI Prompt",
  ai_condition: "AI Condition",
  ai_data_source: "AI Data Source",
  ai_learning: "AI Learning",
  ai_optimization: "AI Optimisation",
  risk_management: "Risk Management",
  portfolio_balance: "Portfolio Balance",
  price_monitor: "Price Monitor",
};

const TRIGGER_TYPES = new Map<string, string>([
  ["technical_indicator", "Technical indicator trigger"],
  ["limit_order_condition", "Limit order condition"],
  ["market_data", "Market data trigger"],
  ["price_monitor", "Price monitor"],
  ["ai_condition", "AI scored condition"],
]);

const ACTION_TYPES = new Map<string, string>([
  ["trading_action", "Trading action"],
  ["zeroex_swap", "0x swap"],
  ["limit_order_management", "Limit order management"],
  ["defi_operation", "DeFi operation"],
  ["swap_operation", "Swap/bridge operation"],
  ["staking_operation", "Staking action"],
  ["ai_agent", "AI agent decision"],
]);

const RISK_TYPES = new Map<string, string>([
  ["risk_management", "Risk management guardrail"],
  ["portfolio_balance", "Portfolio balance check"],
  ["limit_order_monitoring", "Order monitoring guardrail"],
  ["gas_optimization", "Gas optimisation guardrail"],
]);

function ensureArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function getFieldName(field: RawField): string | undefined {
  return field.name ?? field["@_name"];
}

function getFieldValue(field: RawField): string {
  if (typeof field === "string") return field;
  return field.text ?? field["#text"] ?? "";
}

function extractFields(block: RawBlock): Record<string, string> {
  const entries: Record<string, string> = {};
  const fields = ensureArray(block.field);
  for (const field of fields) {
    const name = getFieldName(field);
    if (!name) continue;
    const value = getFieldValue(field);
    entries[name] = value;
  }
  return entries;
}

function resolveTitle(blockType: string): string {
  return TITLE_BY_TYPE[blockType] ?? blockType.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

type SummaryAccumulator = {
  triggers: Set<string>;
  actions: Set<string>;
  riskControls: Set<string>;
};

function updateSummary(acc: SummaryAccumulator, blockType: string, fields: Record<string, string>) {
  if (TRIGGER_TYPES.has(blockType)) {
    const label = TRIGGER_TYPES.get(blockType)!;
    const qualifier = fields.INDICATOR ?? fields.CONDITION_TYPE ?? fields.DATA_TYPE ?? fields.PRICE_TYPE;
    acc.triggers.add(qualifier ? `${label} (${qualifier})` : label);
    return;
  }
  if (blockType === "zeroex_swap") {
    const mode = fields.AMOUNT_MODE === "BUY" ? "Exact buy" : "Exact sell";
    const sellToken = fields.SELL_TOKEN ?? "SELL";
    const buyToken = fields.BUY_TOKEN ?? "BUY";
    const amount = fields.AMOUNT ?? fields.AMOUNT_VALUE;
    const chainId = fields.CHAIN_ID ?? "1";
    const label = ACTION_TYPES.get(blockType) ?? "0x swap";
    const amountPart = amount ? `${amount} ` : "";
    acc.actions.add(
      `${label}: ${mode} ${amountPart}${sellToken}→${buyToken} (chain ${chainId})`,
    );
    return;
  }
  if (ACTION_TYPES.has(blockType)) {
    const label = ACTION_TYPES.get(blockType)!;
    const qualifier =
      fields.ACTION ??
      fields.ORDER_SIDE ??
      fields.AMOUNT_MODE ??
      fields.RISK_TYPE ??
      fields.OPERATION ??
      fields.PROTOCOL;
    acc.actions.add(qualifier ? `${label}: ${qualifier}` : label);
    return;
  }
  if (RISK_TYPES.has(blockType)) {
    const label = RISK_TYPES.get(blockType)!;
    const qualifier = fields.RISK_TYPE ?? fields.MONITOR_TYPE ?? fields.GRID_SPACING;
    acc.riskControls.add(qualifier ? `${label}: ${qualifier}` : label);
  }
}

export function buildStrategySnapshot(xml: string, templateId?: string): StrategySnapshot {
  if (!xml || typeof xml !== "string" || xml.trim().length === 0) {
    throw new Error("Strategy XML payload is empty");
  }

  let parsed: UntypedJson;
  try {
    parsed = parser.parse(xml);
  } catch (error) {
    throw new Error(`Unable to parse strategy XML: ${(error as Error).message}`);
  }

  const root = (parsed as Record<string, UntypedJson>)?.xml as { block?: RawBlock | RawBlock[] } | undefined;
  if (!root || !root.block) {
    throw new Error("Strategy XML does not contain any Blockly blocks");
  }

  const nodes = new Map<string, StrategyWorkflowNode>();
  const summaryAccumulator: SummaryAccumulator = {
    triggers: new Set<string>(),
    actions: new Set<string>(),
    riskControls: new Set<string>(),
  };

  function processBlock(raw: RawBlock): string {
    const blockId = raw.id ?? nanoid();
    if (!nodes.has(blockId)) {
      const fields = extractFields(raw);
      updateSummary(summaryAccumulator, raw.type, fields);
      nodes.set(blockId, {
        id: blockId,
        type: raw.type,
        title: resolveTitle(raw.type),
        fields,
        edges: [],
      });
    }

    const node = nodes.get(blockId)!;

    const statements = ensureArray(raw.statement);
    for (const statement of statements) {
      if (!statement.block) continue;
      const childId = processBlock(statement.block);
      node.edges.push({
        targetId: childId,
        kind: "statement",
        label: statement.name ?? statement["@_name"],
      });
    }

    const values = ensureArray(raw.value);
    for (const value of values) {
      if (!value.block) continue;
      const childId = processBlock(value.block);
      node.edges.push({
        targetId: childId,
        kind: "value",
        label: value.name ?? value["@_name"],
      });
    }

    if (raw.next?.block) {
      const childId = processBlock(raw.next.block);
      node.edges.push({
        targetId: childId,
        kind: "next",
      });
    }

    return blockId;
  }

  const rootBlocks = ensureArray(root.block);
  for (const block of rootBlocks) {
    processBlock(block);
  }

  const workflow: StrategyWorkflow = {
    nodes: Array.from(nodes.values()).map((node) => ({
      ...node,
      edges: dedupeEdges(node.edges),
    })),
  };

  const summary: StrategySummary = {
    triggers: Array.from(summaryAccumulator.triggers),
    actions: Array.from(summaryAccumulator.actions),
    riskControls: Array.from(summaryAccumulator.riskControls),
  };

  return {
    templateId,
    blocklyXml: xml,
    workflow,
    summary,
  };
}

function dedupeEdges(edges: StrategyWorkflowNode["edges"]): StrategyWorkflowNode["edges"] {
  const seen = new Set<string>();
  const result: StrategyWorkflowNode["edges"] = [];
  for (const edge of edges) {
    const key = `${edge.kind}:${edge.targetId}:${edge.label ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(edge);
  }
  return result;
}
