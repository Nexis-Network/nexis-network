import { memoryAdapterEnabled } from "./tool-registry.shared";
import type { ToolLoader } from "./tool-registry.types";

export const AI_TOOL_LOADERS: Record<string, ToolLoader> = {
  openai_file_search: {
    category: "ai",
    load: async () => (await import("@/modules/ai/tools/openai-file-search")).openaiFileSearchTool,
  },
  openai_image: {
    category: "ai",
    load: async () =>
      (await import("@/modules/ai/tools/openai-image-generation")).openaiImageGenerationTool,
  },
  openai_code_interpreter: {
    category: "ai",
    load: async () =>
      (await import("@/modules/ai/tools/openai-code-interpreter")).openaiCodeInterpreterTool,
  },
  e2b_code_interpreter: {
    category: "ai",
    load: async () =>
      (await import("@/modules/ai/tools/e2b-code-interpreter")).e2bCodeInterpreterTool,
  },
  e2b_write_file: {
    category: "ai",
    load: async () => (await import("@/modules/ai/tools/e2b-files")).write_file,
  },
  e2b_read_file: {
    category: "ai",
    load: async () => (await import("@/modules/ai/tools/e2b-files")).read_file,
  },
  e2b_list_dir: {
    category: "ai",
    load: async () => (await import("@/modules/ai/tools/e2b-files")).list_dir,
  },
  e2b_npm_install: {
    category: "ai",
    load: async () => (await import("@/modules/ai/tools/e2b-npm")).npm_install,
  },
  e2b_npm_run: {
    category: "ai",
    load: async () => (await import("@/modules/ai/tools/e2b-npm")).npm_run,
  },
  e2b_get_preview_url: {
    category: "ai",
    load: async () => (await import("@/modules/ai/tools/e2b-npm")).get_preview_url,
  },
  openai_mcp: {
    category: "ai",
    load: async () => (await import("@/modules/ai/tools/openai-mcp")).openaiMcpTool,
  },
  emit_artifact: {
    category: "ai",
    load: async () => (await import("@/modules/ai/tools/emit-artifact")).emitArtifactTool,
  },
  dao_directory_search: {
    category: "ai",
    load: async () => (await import("@/modules/ai/tools/dao-management")).daoDirectorySearchTool,
  },
  dao_get_overview: {
    category: "ai",
    load: async () => (await import("@/modules/ai/tools/dao-management")).daoGetOverviewTool,
  },
  dao_get_proposals: {
    category: "ai",
    load: async () => (await import("@/modules/ai/tools/dao-management")).daoGetProposalsTool,
  },
  agent_memory: {
    category: "ai",
    load: async () => (await import("@/modules/ai/tools/memory")).memoryTool,
  },
  working_memory_todos: {
    category: "ai",
    load: async () =>
      (await import("@/modules/ai/tools/working-memory-todos")).workingMemoryTodosTool,
  },
  updateWorkingMemory: {
    category: "ai",
    enabled: memoryAdapterEnabled,
    load: async () =>
      (await import("@/modules/ai/tools/update-working-memory")).updateWorkingMemoryTool,
  },
  graph_knowledge: {
    category: "ai",
    load: async () => (await import("@/modules/ai/tools/graph-knowledge")).graphKnowledgeTool,
  },
  e2b_install_mcp_bridge: {
    category: "ai",
    load: async () => (await import("@/modules/ai/tools/e2b-mcp")).install_mcp_bridge,
  },
  e2b_start_mcp_server: {
    category: "ai",
    load: async () => (await import("@/modules/ai/tools/e2b-mcp")).start_mcp_server,
  },
  e2b_call_mcp_tool: {
    category: "ai",
    load: async () => (await import("@/modules/ai/tools/e2b-mcp")).call_mcp_tool,
  },
  e2b_list_mcp_tools: {
    category: "ai",
    load: async () => (await import("@/modules/ai/tools/e2b-mcp")).list_mcp_tools,
  },
  start_durable_workflow: {
    category: "ai",
    load: async () => (await import("@/modules/ai/tools/workflow-tool")).startDurableWorkflowTool,
  },
  bedrock_code_interpreter: {
    category: "optional",
    enabled: () => Boolean(process.env.BEDROCK_AGENT_ID && process.env.BEDROCK_AGENT_ALIAS_ID),
    load: async () =>
      (await import("@/modules/ai/tools/bedrock-code-interpreter")).bedrockCodeInterpreterTool,
  },
  task_scheduler: {
    category: "optional",
    enabled: () => true,
    load: async () => (await import("@/modules/ai/tools/task-scheduler")).taskSchedulerTool,
  },
};
