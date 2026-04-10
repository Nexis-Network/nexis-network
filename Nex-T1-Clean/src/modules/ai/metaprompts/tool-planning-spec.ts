import { TOOL_PLANNING_BASE_SECTION } from "./tool-planning/base";
import { TOOL_PLANNING_EXECUTION_SECTION } from "./tool-planning/execution";
import { TOOL_PLANNING_MCP_SECTION } from "./tool-planning/mcp";

const joinPromptSections = (sections: string[]): string =>
  sections.filter((section) => section.trim().length > 0).join("\n\n").trim();

export const TOOL_PLANNING_SPEC = `
<tool_planning_spec>
Before executing tools, consider the intent and select the optimal tool path.

${joinPromptSections([
  TOOL_PLANNING_BASE_SECTION,
  TOOL_PLANNING_MCP_SECTION,
  TOOL_PLANNING_EXECUTION_SECTION,
])}
</tool_planning_spec>
`.trim();
