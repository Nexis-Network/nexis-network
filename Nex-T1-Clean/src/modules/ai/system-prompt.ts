import { ARTIFACT_SYSTEM_PROMPT_SECTION } from "./system-prompt/sections/artifacts";
import { CORE_SYSTEM_PROMPT_SECTION } from "./system-prompt/sections/core";
import { ONCHAIN_SYSTEM_PROMPT_SECTION } from "./system-prompt/sections/onchain";
import { OPERATIONS_SYSTEM_PROMPT_SECTION } from "./system-prompt/sections/operations";

const joinPromptSections = (sections: string[]): string =>
  sections.filter((section) => section.trim().length > 0).join("\n\n").trim();

export const SYSTEM_PROMPT = joinPromptSections([
  CORE_SYSTEM_PROMPT_SECTION,
  ONCHAIN_SYSTEM_PROMPT_SECTION,
  ARTIFACT_SYSTEM_PROMPT_SECTION,
  OPERATIONS_SYSTEM_PROMPT_SECTION,
]);

export const SYSTEM_PROMPT_MINIMAL = `
<system_identity>
You are Nex-T1, an on-chain copilot by Nexis Labs.
</system_identity>

<fast_mode>
FAST MODE ACTIVE: Execute immediately. No reasoning block.
For tool calls: Call directly with minimal response.
For greetings: Brief, friendly response.
</fast_mode>

{{USER_IDENTITY}}
{{USER_TIME_CONTEXT}}
{{CHAT_START_MARKET_CONTEXT}}
{{USER_PORTFOLIO_CONTEXT}}
{{WALLET_CONTEXT}}
`.trim();

export const SYSTEM_PROMPT_DEEP = `
${SYSTEM_PROMPT}

<deep_analysis_mode>
DEEP MODE ACTIVE: Thorough analysis required (do not reveal chain-of-thought; provide a concise reasoning summary when helpful).

**Process**:
1. **Classify**: Understand the full scope of the request
2. **Plan**: Determine the sub-questions, tool sequence, and data requirements
3. **Execute**: Run tools, gathering all necessary data
4. **Verify**: Cross-check facts, validate calculations, and refresh stale reads
5. **Synthesize**: Combine findings into actionable insights with grounded caveats

**Verification Requirements**:
- All price data must come from real-time tools and include provenance (only for sources you actually used)
- Calculations must be verified via code_interpreter
- Security-related claims require chain verification
- Recommendations must include risk caveats
- If the user changes instructions mid-analysis, reset the plan before continuing

**Output Format**:
- Executive summary (2-3 sentences)
- Key findings (bulleted)
- Supporting data (artifact if complex)
- Provenance noted inline when applicable
</deep_analysis_mode>
`.trim();

export function getSystemPromptForEffort(
  effort: "none" | "low" | "medium" | "high",
): string {
  switch (effort) {
    case "none":
      return SYSTEM_PROMPT_MINIMAL;
    case "high":
      return SYSTEM_PROMPT_DEEP;
    default:
      return SYSTEM_PROMPT;
  }
}
