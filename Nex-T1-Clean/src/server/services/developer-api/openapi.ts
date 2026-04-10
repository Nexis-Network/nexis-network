import "server-only";

import { listDeveloperBillingPlans } from "@/server/services/developer-api/plan-registry";
import { listPublicProducts } from "@/server/services/developer-api/product-registry";

export function buildPublicDeveloperOpenApiDocument() {
  const products = listPublicProducts();
  const planIds = listDeveloperBillingPlans().map((plan) => plan.id);
  const productIds = products.map((product) => product.id);

  return {
    openapi: "3.1.0",
    info: {
      title: "Nex Public Developer API",
      version: "1.0.0",
      description:
        "Hosted Nex model endpoints for flagship reasoning, instant responses, and code execution.",
    },
    servers: [
      {
        url: "https://api.nex-t1.ai",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "nex_*",
        },
      },
      schemas: {
        PublicResponseRequest: {
          type: "object",
          required: ["model", "input"],
          properties: {
            model: {
              type: "string",
              enum: productIds,
            },
            input: { type: "string" },
            instructions: { type: "string" },
            maxOutputTokens: { type: "integer", minimum: 1, maximum: 4096 },
          },
        },
        PinnedPublicResponseRequest: {
          type: "object",
          required: ["input"],
          properties: {
            input: { type: "string" },
            instructions: { type: "string" },
            maxOutputTokens: { type: "integer", minimum: 1, maximum: 4096 },
          },
        },
        ChatCompletionsRequest: {
          type: "object",
          required: ["model", "messages"],
          properties: {
            model: {
              type: "string",
              enum: productIds,
            },
            messages: {
              type: "array",
              items: {
                type: "object",
                required: ["role", "content"],
                properties: {
                  role: {
                    type: "string",
                    enum: ["system", "user", "assistant"],
                  },
                  content: { type: "string" },
                },
              },
            },
            max_tokens: { type: "integer", minimum: 1, maximum: 4096 },
            temperature: { type: "number", minimum: 0, maximum: 2 },
          },
        },
      },
    },
    paths: {
      "/api/v1/responses": {
        post: {
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PublicResponseRequest" },
              },
            },
          },
          responses: {
            "200": { description: "Response generated." },
          },
        },
      },
      "/api/v1/chat/completions": {
        post: {
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ChatCompletionsRequest" },
              },
            },
          },
          responses: {
            "200": { description: "Chat completion generated." },
          },
        },
      },
      "/api/v1/nex-t1": {
        post: {
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PinnedPublicResponseRequest" },
              },
            },
          },
          responses: { "200": { description: "Pinned nex-t1 response generated." } },
        },
      },
      "/api/v1/nex-t1-instant": {
        post: {
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PinnedPublicResponseRequest" },
              },
            },
          },
          responses: { "200": { description: "Pinned nex-t1-instant response generated." } },
        },
      },
      "/api/v1/nex-1-code": {
        post: {
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PinnedPublicResponseRequest" },
              },
            },
          },
          responses: { "200": { description: "Pinned nex-1-code response generated." } },
        },
      },
      "/api/v1/models": {
        get: {
          responses: {
            "200": { description: "Available public products." },
          },
        },
      },
      "/api/v1/usage": {
        get: {
          security: [{ bearerAuth: [] }],
          responses: { "200": { description: "Usage summary for the authenticated project." } },
        },
      },
      "/api/v1/billing": {
        get: {
          security: [{ bearerAuth: [] }],
          responses: { "200": { description: "Billing summary for the authenticated project." } },
        },
      },
      "/api/v1/openapi.json": {
        get: {
          responses: {
            "200": { description: "OpenAPI document for the public Nex API." },
          },
        },
      },
    },
    "x-nex-plans": planIds,
  };
}
