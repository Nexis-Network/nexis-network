import "server-only";

import type {
  PublicDeveloperProduct,
  PublicDeveloperProductId,
} from "@/server/services/developer-api/types";

const PUBLIC_PRODUCTS: Record<PublicDeveloperProductId, PublicDeveloperProduct> = {
  "nex-t1": {
    id: "nex-t1",
    label: "Nex T1",
    summary: "Flagship reasoning model with the richest public tool baseline.",
    upstreamModel: "openai/gpt-5.4",
    provider: "openai",
    promptProfileId: "research",
    promptBaseline:
      "You are Nex T1, the hosted flagship API for high-judgment research and execution support. Use the approved tool baseline whenever it materially improves correctness. Prefer direct answers, surface key risks, and stay explicit about uncertainty.",
    toolBaseline: [
      "openai_web_search",
      "openai_file_search",
      "openai_code_interpreter",
    ],
    minimumCredits: 8,
    defaultMaxOutputTokens: 1_024,
    defaultRuntimeMinutes: 0,
    docs: {
      endpoint: "/api/v1/responses",
      aliasEndpoint: "/api/v1/nex-t1",
    },
  },
  "nex-t1-instant": {
    id: "nex-t1-instant",
    label: "Nex T1 Instant",
    summary: "Low-latency model tuned for concise answers and fast tool decisions.",
    upstreamModel: "xai/grok-4.20-non-reasoning",
    provider: "xai",
    promptProfileId: "balanced",
    promptBaseline:
      "You are Nex T1 Instant. Optimize for latency, concise answers, and minimal tool usage. Only reach for approved tools when the answer would otherwise be stale or unverifiable.",
    toolBaseline: ["openai_web_search"],
    minimumCredits: 5,
    defaultMaxOutputTokens: 512,
    defaultRuntimeMinutes: 0,
    docs: {
      endpoint: "/api/v1/responses",
      aliasEndpoint: "/api/v1/nex-t1-instant",
    },
  },
  "nex-1-code": {
    id: "nex-1-code",
    label: "Nex 1 Code",
    summary: "Code-focused model with E2B-first sandbox tooling and preview bias.",
    upstreamModel: "openai/gpt-5.4",
    provider: "openai",
    promptProfileId: "builder",
    promptBaseline:
      "You are Nex 1 Code. Default to inspect, plan, edit, run, and verify. Prefer the approved E2B runtime tools for code changes and previews, keep changes surgical, and report verifiable outcomes.",
    toolBaseline: [
      "e2b_write_file",
      "e2b_read_file",
      "e2b_list_dir",
      "e2b_npm_install",
      "e2b_npm_run",
      "e2b_get_preview_url",
    ],
    minimumCredits: 15,
    defaultMaxOutputTokens: 1_536,
    defaultRuntimeMinutes: 10,
    docs: {
      endpoint: "/api/v1/responses",
      aliasEndpoint: "/api/v1/nex-1-code",
    },
  },
};

export function getPublicProduct(
  productId: PublicDeveloperProductId | string,
): PublicDeveloperProduct {
  const product = PUBLIC_PRODUCTS[productId as PublicDeveloperProductId];
  if (!product) {
    throw new Error(`Unsupported public product: ${productId}`);
  }
  return product;
}

export function listPublicProducts(): PublicDeveloperProduct[] {
  return Object.values(PUBLIC_PRODUCTS);
}
