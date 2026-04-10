import { describe, expect, it } from "vitest";

import { resolveChatProviderModel } from "./provider-model";

describe("resolveChatProviderModel", () => {
  it("keeps the gateway model ID when direct OpenAI is unavailable", () => {
    expect(
      resolveChatProviderModel({
        resolvedModel: "openai/gpt-5.3-chat",
        hasDirectOpenAI: false,
      }),
    ).toEqual({
      canUseDirectOpenAi: false,
      providerModelId: "openai/gpt-5.3-chat",
      originalProviderModelId: "openai/gpt-5.3-chat",
    });
  });

  it("strips the provider prefix when using direct OpenAI", () => {
    expect(
      resolveChatProviderModel({
        resolvedModel: "openai/gpt-5.4",
        hasDirectOpenAI: true,
      }),
    ).toEqual({
      canUseDirectOpenAi: true,
      providerModelId: "gpt-5",
      originalProviderModelId: "gpt-5.4",
    });
  });

  it("falls back to gpt-5.4 for gpt-5.3-chat when bypassing the gateway", () => {
    expect(
      resolveChatProviderModel({
        resolvedModel: "openai/gpt-5.3-chat",
        hasDirectOpenAI: true,
      }),
    ).toEqual({
      canUseDirectOpenAi: true,
      providerModelId: "gpt-5.4",
      originalProviderModelId: "gpt-5.3-chat",
    });
  });

  it("falls back to gpt-5 for gpt-5.4 when the direct provider lacks the 5.4 alias", () => {
    expect(
      resolveChatProviderModel({
        resolvedModel: "openai/gpt-5.4",
        hasDirectOpenAI: true,
      }),
    ).toEqual({
      canUseDirectOpenAi: true,
      providerModelId: "gpt-5",
      originalProviderModelId: "gpt-5.4",
    });
  });
});
