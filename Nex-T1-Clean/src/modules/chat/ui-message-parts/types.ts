import type {
  DynamicToolUIPart,
  FileUIPart,
  ReasoningUIPart,
  TextUIPart,
  ToolUIPart,
  UIDataTypes,
  UIMessagePart,
  UITools,
} from "ai";

import type { AIEvent } from "@/lib/schema";
import type { JsonValue } from "@/types/json";

import {
  CANONICAL_ARTIFACT_CARD_TYPES,
  CANONICAL_IDE_ARTIFACT_TYPES,
  NATIVE_ARTIFACT_CARD_PART,
  NATIVE_CHECKPOINT_PART,
  NATIVE_IDE_PART,
  NATIVE_QUEUE_PART,
  NATIVE_TASK_PART,
  NATIVE_TEST_RESULTS_PART,
  NATIVE_WORKFLOW_PART,
} from "./constants";
export type CanonicalIdeArtifactType = (typeof CANONICAL_IDE_ARTIFACT_TYPES)[number];
export type CanonicalArtifactCardType = (typeof CANONICAL_ARTIFACT_CARD_TYPES)[number];
export type UnknownRecord = Record<string, unknown>;

export type LegacyImageUIPart = {
  type: "image";
  image?: JsonValue;
  url?: JsonValue;
  mimeType?: string;
  mediaType?: string;
};

export type LegacyFileUIPart = {
  type: "file";
  data?: JsonValue;
  url?: JsonValue;
  mimeType?: string;
  mediaType?: string;
  filename?: string;
};

export type LegacyToolCallUIPart = {
  type: "tool-call" | "tool-invocation";
  toolCallId?: string;
  id?: string;
  toolName?: string;
  input?: JsonValue;
  args?: JsonValue;
  output?: JsonValue;
  result?: JsonValue;
  state?: string;
};

export type NativePlanStep = {
  id: string;
  title: string;
  description?: string;
  status?: "pending" | "in_progress" | "completed" | "error";
};

export type NativeTaskData = {
  id: string;
  title: string;
  description?: string;
  status: "pending" | "in_progress" | "done" | "error";
};

export type NativeQueueSection = {
  label: string;
  items: NativeTaskData[];
};

export type NativeQueueData = {
  pending: NativeTaskData[];
  completed: NativeTaskData[];
  failed: NativeTaskData[];
};

export type NativeCheckpointData = {
  id: string;
  label: string;
  summary?: string;
  createdAt?: string;
};

export type NativeTestResultItem = {
  id: string;
  name: string;
  status: "pass" | "fail" | "warn" | "info";
  summary?: string;
};

export type NativeTestResultsData = {
  items: NativeTestResultItem[];
};

export type NativeArtifactCardData = {
  artifactId: string;
  artifactType: string;
  title?: string;
  status?: string;
  data: JsonValue;
  updatedAt?: string;
};

export type NativeWorkflowNode = {
  id: string;
  label: string;
  status?: "pending" | "running" | "completed" | "failed" | "done" | "error";
  details?: string;
  x?: number;
  y?: number;
};

export type NativeWorkflowEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
};

export type NativeWorkflowCanvasData = {
  artifactId: string;
  title: string;
  kind?: "transaction" | "bridge";
  status?: string;
  nodes: NativeWorkflowNode[];
  edges: NativeWorkflowEdge[];
  viewport?: {
    x: number;
    y: number;
    zoom: number;
  };
  legend?: Array<{ label: string; color?: string }>;
};

export type NativeIdeFile = {
  path: string;
  content?: string;
  language?: string;
  kind?: "file" | "dir";
};

export type NativeIdeTerminal = {
  command?: string;
  output: string;
  isComplete?: boolean;
};

export type NativeJsxPreviewData = {
  code: string;
  language?: string;
};

export type NativeIdeSessionData = {
  artifactId?: string;
  conversationId?: string | null;
  sandboxId?: string | null;
  title?: string;
  mode?: string;
  status?: string;
  entryFile?: string;
  activePath?: string;
  files: NativeIdeFile[];
  terminal?: NativeIdeTerminal | null;
  previewUrl?: string;
  previewHtml?: string;
  jsxPreview?: NativeJsxPreviewData | null;
  queue?: NativeQueueData | null;
  plan?: NativePlanStep[];
  checkpoints?: NativeCheckpointData[];
  testResults?: NativeTestResultsData | null;
  updatedAt?: string;
};

export type NativeIdeSessionPart = {
  type: typeof NATIVE_IDE_PART;
  data: NativeIdeSessionData;
};

export type NativeWorkflowCanvasPart = {
  type: typeof NATIVE_WORKFLOW_PART;
  data: NativeWorkflowCanvasData;
};

export type NativeArtifactCardPart = {
  type: typeof NATIVE_ARTIFACT_CARD_PART;
  data: NativeArtifactCardData;
};

export type NativeTaskPart = {
  type: typeof NATIVE_TASK_PART;
  data: NativeTaskData;
};

export type NativeQueuePart = {
  type: typeof NATIVE_QUEUE_PART;
  data: NativeQueueData;
};

export type NativeCheckpointPart = {
  type: typeof NATIVE_CHECKPOINT_PART;
  data: NativeCheckpointData;
};

export type NativeTestResultsPart = {
  type: typeof NATIVE_TEST_RESULTS_PART;
  data: NativeTestResultsData;
};

export type ChatUIPart<
  DATA_TYPES extends UIDataTypes = UIDataTypes,
  TOOLS extends UITools = UITools,
> =
  | UIMessagePart<DATA_TYPES, TOOLS>
  | LegacyImageUIPart
  | LegacyFileUIPart
  | LegacyToolCallUIPart
  | NativeIdeSessionPart
  | NativeWorkflowCanvasPart
  | NativeArtifactCardPart
  | NativeTaskPart
  | NativeQueuePart
  | NativeCheckpointPart
  | NativeTestResultsPart;

export type ChatTextUIPart = TextUIPart;
export type ChatReasoningUIPart = ReasoningUIPart;
export type ChatFileUIPart = FileUIPart | LegacyFileUIPart;
export type ChatToolUIPart =
  | ToolUIPart<UITools>
  | DynamicToolUIPart
  | LegacyToolCallUIPart;
export type ExtractedNativeMessageState = {
  artifactCards: NativeArtifactCardData[];
  ideArtifacts: NativeArtifactCardData[];
  ideSession: NativeIdeSessionData | null;
  workflowCanvas: NativeWorkflowCanvasData | null;
  tasks: NativeTaskData[];
  queue: NativeQueueData | null;
  checkpoints: NativeCheckpointData[];
  testResults: NativeTestResultsData | null;
  latestEvent: AIEvent | null;
};
