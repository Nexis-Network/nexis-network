export const DEFAULT_CONVERSATION_TITLE_MAX_LENGTH = 46;
const UNTITLED_CONVERSATION = "Untitled conversation";

export type AgentAvatarIdentityInput = {
  agentId?: string | null;
  agentName?: string | null;
  model?: string | null;
  conversationId?: string | null;
  fallbackLabel?: string;
};

export type AgentAvatarIdentity = {
  seed: string;
  label: string;
};

function normalizeText(value?: string | null) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function resolveAgentAvatarIdentity(
  input: AgentAvatarIdentityInput,
): AgentAvatarIdentity {
  const agentId = normalizeText(input.agentId);
  const agentName = normalizeText(input.agentName);
  const model = normalizeText(input.model);
  const conversationId = normalizeText(input.conversationId);
  const fallbackLabel = normalizeText(input.fallbackLabel) ?? "Nex Agent";

  if (agentId) {
    return {
      seed: `agent:${agentId}`,
      label: agentName ?? fallbackLabel,
    };
  }

  if (agentName && model) {
    return {
      seed: `agent-name:${agentName.toLowerCase()}:model:${model}`,
      label: agentName,
    };
  }

  if (agentName) {
    return {
      seed: `agent-name:${agentName.toLowerCase()}`,
      label: agentName,
    };
  }

  if (model) {
    return {
      seed: `model:${model}`,
      label: agentName ?? model,
    };
  }

  if (conversationId) {
    return {
      seed: `conversation:${conversationId}`,
      label: agentName ?? fallbackLabel,
    };
  }

  return {
    seed: "assistant:nex-agent",
    label: agentName ?? fallbackLabel,
  };
}

export function truncateConversationTitle(
  title?: string | null,
  maxLength: number = DEFAULT_CONVERSATION_TITLE_MAX_LENGTH,
) {
  const normalized = normalizeText(title);
  if (!normalized) return UNTITLED_CONVERSATION;
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}
