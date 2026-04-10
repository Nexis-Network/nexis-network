type ElevenLabsEnv = NodeJS.ProcessEnv;

const trimToNull = (value?: string | null): string | null => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
};

export type ElevenLabsSupportConfig = {
  agentId: string | null;
  apiKey: string | null;
  hasAgentId: boolean;
  hasApiKey: boolean;
  enabled: boolean;
};

export function resolveElevenLabsAgentId(env: ElevenLabsEnv = process.env): string | null {
  return trimToNull(env.ELEVENLABS_AGENT_ID) ?? trimToNull(env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID);
}

export function resolveElevenLabsApiKey(env: ElevenLabsEnv = process.env): string | null {
  return trimToNull(env.ELEVENLABS_API_KEY);
}

export function getElevenLabsSupportConfig(env: ElevenLabsEnv = process.env): ElevenLabsSupportConfig {
  const agentId = resolveElevenLabsAgentId(env);
  const apiKey = resolveElevenLabsApiKey(env);
  const hasAgentId = Boolean(agentId);
  const hasApiKey = Boolean(apiKey);

  return {
    agentId,
    apiKey,
    hasAgentId,
    hasApiKey,
    enabled: hasAgentId && hasApiKey,
  };
}
