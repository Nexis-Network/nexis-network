import "server-only";

import { BedrockAgentRuntimeClient } from "@aws-sdk/client-bedrock-agent-runtime";

import type { BedrockMemoryConfig } from "./bedrock-memory.types";

type RuntimeClientConfig = {
  region: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
};

let runtimeClientInstance: BedrockAgentRuntimeClient | null = null;

export function getBedrockConfig(): BedrockMemoryConfig | null {
  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;
  const knowledgeBaseId = process.env.BEDROCK_KNOWLEDGE_BASE_ID;
  const agentId = process.env.BEDROCK_AGENT_ID;

  if (!region || !knowledgeBaseId) {
    return null;
  }

  return {
    region,
    knowledgeBaseId,
    agentId,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  };
}

export function isBedrockConfigured(): boolean {
  return getBedrockConfig() !== null;
}

function createRuntimeClientConfig(
  config: BedrockMemoryConfig,
): RuntimeClientConfig {
  if (!config.accessKeyId || !config.secretAccessKey) {
    return { region: config.region };
  }

  return {
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  };
}

export function getBedrockRuntimeClient(): BedrockAgentRuntimeClient | null {
  if (runtimeClientInstance) {
    return runtimeClientInstance;
  }

  const config = getBedrockConfig();
  if (!config) {
    return null;
  }

  runtimeClientInstance = new BedrockAgentRuntimeClient(
    createRuntimeClientConfig(config),
  );
  return runtimeClientInstance;
}
