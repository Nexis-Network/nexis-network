export enum AgentCapability {
    WEB_SEARCH = "web_search",
    IMAGE_GEN = "image_gen",
    CODE_INTERPRETER = "code_interpreter",
    MCP_FULL = "mcp_full",
    MCP_CORE = "mcp_core", // Subset of MCP tools
    FILE_SEARCH = "file_search",
}

export const CAPABILITY_MODELS = {
    IMAGE_GENERATION: ["dall-e-3", "sora-2"],
    CODE_INTERPRETER: ["gpt-5.4", "gpt-5-mini"],
    FILE_SEARCH: ["gpt-5.4", "gpt-5-mini"],
    WEB_SEARCH: ["gpt-5.4", "gpt-5-mini"],
};
export const MODEL_CAPABILITIES: Record<string, AgentCapability[]> = {
    "nex-t0": [
        AgentCapability.FILE_SEARCH,
        AgentCapability.WEB_SEARCH,
        AgentCapability.CODE_INTERPRETER,
        AgentCapability.IMAGE_GEN,
        AgentCapability.MCP_CORE,
    ],
    "nex-t1": [
        AgentCapability.FILE_SEARCH,
        AgentCapability.WEB_SEARCH,
        AgentCapability.CODE_INTERPRETER,
        AgentCapability.IMAGE_GEN,
        AgentCapability.MCP_FULL,
    ],
    "nex-t1-max": [
        AgentCapability.FILE_SEARCH,
        AgentCapability.WEB_SEARCH,
        AgentCapability.CODE_INTERPRETER,
        AgentCapability.IMAGE_GEN,
        AgentCapability.MCP_FULL,
    ],
    "gpt-5-mini": [
        AgentCapability.FILE_SEARCH,
        AgentCapability.WEB_SEARCH,
        AgentCapability.CODE_INTERPRETER,
        AgentCapability.IMAGE_GEN,
        AgentCapability.MCP_CORE,
    ],
};

export const getCapabilitiesForModel = (modelId: string): AgentCapability[] => {
    // Handle provider prefixes if present (e.g. openai/gpt-4o)
    const normalizedId = modelId.split("/").pop() ?? modelId;
    return MODEL_CAPABILITIES[normalizedId] ?? MODEL_CAPABILITIES["nex-t0"];
};
