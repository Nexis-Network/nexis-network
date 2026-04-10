export const AI_SDK_V6_E2B_ARTIFACT_TOOL_IDS = [
  "emit_artifact",
  "e2b_write_file",
  "e2b_read_file",
  "e2b_list_dir",
  "e2b_npm_install",
  "e2b_npm_run",
  "e2b_get_preview_url",
  "e2b_code_interpreter",
] as const;

export const AI_SDK_V6_MCP_RUNTIME_INTENT_CATEGORIES = new Set([
  "research",
  "analysis",
  "defi",
  "trading",
  "market_data",
  "complex_task",
  "degen_trading",
]);

export type StandardizedRuntimeCapabilityFlags = {
  artifacts: boolean;
  e2bSandbox: boolean;
  e2bTerminal: boolean;
  codeInterpreter: boolean;
  mcpTools: boolean;
  skills: boolean;
  langfusePrompts: boolean;
};

export function buildStandardizedRuntimeCapabilitySummary(args: {
  capabilityFlags: StandardizedRuntimeCapabilityFlags;
  enabledMcpServers?: string[];
  requiredSkills?: string[];
  promptLabel?: string;
}): string {
  const {
    capabilityFlags,
    enabledMcpServers = [],
    requiredSkills = [],
    promptLabel,
  } = args;

  const lines = [
    "AI SDK v6 standardized runtime is active for this chat turn.",
    `- Artifacts: ${capabilityFlags.artifacts ? "enabled via emit_artifact and right-panel artifact payloads" : "not emphasized for this turn"}`,
    `- E2B sandbox runtime: ${capabilityFlags.e2bSandbox ? "enabled" : "not provisioned for this turn"}`,
    `- E2B terminal and file operations: ${capabilityFlags.e2bTerminal ? "enabled" : "not emphasized for this turn"}`,
    `- Code interpreter tools: ${capabilityFlags.codeInterpreter ? "enabled" : "not emphasized for this turn"}`,
    `- MCP tool bridge: ${capabilityFlags.mcpTools ? "enabled" : "not emphasized for this turn"}`,
    `- Technical skill injection: ${capabilityFlags.skills ? "enabled" : "none for this turn"}`,
    `- Langfuse prompt management: ${capabilityFlags.langfusePrompts ? `enabled${promptLabel ? ` (label: ${promptLabel})` : ""}` : "disabled"}`,
  ];

  if (capabilityFlags.mcpTools) {
    if (enabledMcpServers.length > 0) {
      lines.push(`- Enabled MCP servers: ${enabledMcpServers.join(", ")}`);
    } else {
      lines.push("- Enabled MCP servers: none configured on this session");
    }
    lines.push(
      "- To start a configured MCP bridge inside the E2B sandbox, call start_mcp_server by configured server name only.",
    );
  }

  if (capabilityFlags.artifacts && !capabilityFlags.e2bSandbox) {
    lines.push(
      "- Artifact-only coding fallback: for code, HTML, UI, preview, and smart-contract requests, use emit_artifact with `code`, `html`, `preview`, `web`, or `smart-contract-viewer` payloads instead of narrating missing sandbox tools.",
    );
    lines.push(
      "- Mention sandbox/runtime limits only when the user explicitly needs live execution, terminal commands, installed packages, or a real preview URL.",
    );
  }

  if (requiredSkills.length > 0) {
    lines.push(`- Injected skills: ${requiredSkills.join(", ")}`);
  }

  return lines.join("\n");
}
