import type { ReactNode } from "react";

export type StrategyWorkflowEdge = {
  targetId: string;
  kind: "next" | "statement" | "value";
  label?: string;
};

export type StrategyWorkflowNode = {
  id: string;
  type: string;
  title: string;
  fields: Record<string, string>;
  edges: StrategyWorkflowEdge[];
};

export type StrategyWorkflow = {
  nodes: StrategyWorkflowNode[];
  reactFlow?: {
    nodes: UntypedJson[];
    edges: UntypedJson[];
  };
};

export type StrategySummary = {
  triggers: string[];
  actions: string[];
  riskControls: string[];
};

export type StrategySnapshot = {
  templateId?: string;
  blocklyXml?: string;
  reactFlow?: {
    nodes: UntypedJson[];
    edges: UntypedJson[];
  };
  workflow: StrategyWorkflow;
  summary: StrategySummary;
};

export type StrategyTemplate = {
  id: string;
  name: string;
  description: string;
  prompt: string;
  icon: ReactNode;
  category: string;
  blocklyXml: string;
};
