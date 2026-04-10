import { createHash } from "crypto";

import type { ContextEnvelope, ContextEnvelopeArtifactRef } from "@/modules/chat/context-envelope";
import type { ToolInvocation } from "@/modules/chat/types";

export type ServerCachePolicy = {
  version: string;
  readKey: string;
  writeKey: string;
  canRead: boolean;
  canWrite: boolean;
  reasons: string[];
  keyParts: Record<string, string>;
};

export type BuildServerCachePolicyParams = {
  envelope: ContextEnvelope;
  latestUserMessage: string;
  modelId?: string | null;
  attachmentsSha256?: string | null;
  tools?: ToolInvocation[];
  artifactRefs?: ContextEnvelopeArtifactRef[];
  sanitized?: boolean;
};

const SERVER_CACHE_POLICY_VERSION = "server-cache-policy-v2";
const CACHE_NAMESPACE = "chat:structured-response:v2";

const hashValue = (value: string): string =>
  createHash("sha256").update(value).digest("hex");

export function buildServerCachePolicy({
  envelope,
  latestUserMessage,
  modelId,
  attachmentsSha256,
  tools = [],
  artifactRefs = [],
  sanitized = false,
}: BuildServerCachePolicyParams): ServerCachePolicy {
  const toolUsage = tools.length > 0 ? "present" : "none";
  const artifactUsage = artifactRefs.length > 0 ? "present" : "none";
  const reasons: string[] = [];

  if (attachmentsSha256) {
    reasons.push("attachments_present");
  }
  if (envelope.cache.marketContextHash) {
    reasons.push("dynamic_market_context");
  }
  if (toolUsage === "present") {
    reasons.push("tool_usage_present");
  }
  if (artifactUsage === "present") {
    reasons.push("artifact_usage_present");
  }
  if (sanitized) {
    reasons.push("sanitized_output");
  }

  const keyParts = {
    policyVersion: SERVER_CACHE_POLICY_VERSION,
    route: envelope.route,
    modelId: modelId ?? "unknown-model",
    userId: envelope.userId ?? "anon",
    sessionId: envelope.sessionId ?? "nosession",
    promptLabel: envelope.prompt.label,
    promptVersionHash: envelope.prompt.versionHash ?? "noprompt",
    systemHash: envelope.prompt.systemHash ?? "nosystem",
    marketContextHash: envelope.cache.marketContextHash ?? "nomarket",
    sessionSnapshotHash: envelope.cache.sessionSnapshotHash ?? "nosnapshot",
    memoryHash: envelope.memory.hash ?? "nomemory",
    queryHash: hashValue(latestUserMessage),
    toolUsage,
    artifactUsage,
  };

  const serializedParts = JSON.stringify(keyParts);
  const baseKey = `${CACHE_NAMESPACE}:${hashValue(serializedParts)}`;
  const canRead = reasons.length === 0;
  const canWrite = reasons.length === 0;

  return {
    version: SERVER_CACHE_POLICY_VERSION,
    readKey: baseKey,
    writeKey: baseKey,
    canRead,
    canWrite,
    reasons: canRead ? ["eligible"] : reasons,
    keyParts,
  };
}
