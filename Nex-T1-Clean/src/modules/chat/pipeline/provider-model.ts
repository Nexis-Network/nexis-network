const DIRECT_OPENAI_MODEL_FALLBACKS: Record<string, string> = {
  "gpt-5.3-chat": "gpt-5.4",
  "gpt-5.4": "gpt-5",
};

type ResolveChatProviderModelInput = {
  resolvedModel: string;
  hasDirectOpenAI: boolean;
};

type ResolveChatProviderModelResult = {
  canUseDirectOpenAi: boolean;
  providerModelId: string;
  originalProviderModelId: string;
};

export function resolveChatProviderModel({
  resolvedModel,
  hasDirectOpenAI,
}: ResolveChatProviderModelInput): ResolveChatProviderModelResult {
  const isOpenAiGatewayModel = resolvedModel.startsWith("openai/");
  const canUseDirectOpenAi = hasDirectOpenAI && isOpenAiGatewayModel;

  if (!canUseDirectOpenAi) {
    return {
      canUseDirectOpenAi: false,
      providerModelId: resolvedModel,
      originalProviderModelId: resolvedModel,
    };
  }

  const originalProviderModelId = resolvedModel.replace(/^openai\//, "");

  return {
    canUseDirectOpenAi: true,
    providerModelId:
      DIRECT_OPENAI_MODEL_FALLBACKS[originalProviderModelId] ??
      originalProviderModelId,
    originalProviderModelId,
  };
}
