import type { ToolLoader } from "./tool-registry.types";

export const SEARCH_TOOL_LOADERS: Record<string, ToolLoader> = {
  exa_web_search: {
    category: "search",
    enabled: () => Boolean(process.env.EXA_API_KEY),
    load: async () => (await import("@/modules/ai/tools/exa-web-search")).exaWebSearchTool,
  },
  openai_web_search: {
    category: "search",
    load: async () => (await import("@/modules/ai/tools/openai-web-search")).openaiWebSearchTool,
  },
  aws_docs_search: {
    category: "search",
    load: async () => (await import("@/modules/ai/tools/aws-docs")).awsDocsSearchTool,
  },
  cloud_run_docs_search: {
    category: "search",
    load: async () => (await import("@/modules/ai/tools/cloud-run-docs")).cloudRunDocsSearchTool,
  },
};
