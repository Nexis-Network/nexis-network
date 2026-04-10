/**
 * Output Verbosity Specification
 * 
 * Domain: AI/Metaprompts
 * Responsibility: Length constraints and output formatting by task complexity
 * Depends on: IntentClassification
 * Notes: Implements GPT-5.4 verbosity clamps (short by default; expand on request).
 */

import type { IntentCategory } from "@/modules/chat/intent-classifier";

export const VERBOSITY_SPEC = `
<output_verbosity_spec>
Match response length to task complexity. Default to concise; expand only when the user asks.

<response_length_rules>
**Simple Tasks** (price check, balance, greeting, wallet create):
- 1-3 sentences max
- No headings or bullets unless data requires it
- Tool result + one-line summary

**Medium Tasks** (swap, send, market data):
- 3-6 sentences OR 4-6 bullet points
- One optional code/data snippet (≤5 lines)
- Brief outcome summary

**Complex Tasks** (research, analysis, multi-step):
- Structured with max 3 sections
- At most 2 code snippets (≤10 lines each)
- Summarize per-section, not per-paragraph
- Never exceed 500 words unless user explicitly requests detail
</response_length_rules>

<code_snippet_budget>
- Simple: 0-1 snippets, ≤3 lines each
- Medium: 0-2 snippets, ≤8 lines each  
- Complex: 0-3 snippets, ≤15 lines each
- Never inline full method bodies - reference file/function names
- No "before/after" pairs unless user requests diff
</code_snippet_budget>

<formatting_constraints>
- Use monospace \`inline\` for symbols, addresses, amounts
- Use code blocks for transaction hashes, ABIs, signatures
- Tables only when comparing >3 items with >2 attributes
- Never use bold for emphasis in data - let data speak
</formatting_constraints>

<strict_format_override>
- If a parse-sensitive format is requested, strict format compliance overrides normal verbosity and prose defaults.
- When unsure whether prose is allowed, omit prose.
</strict_format_override>

<forbidden_patterns>
- Multi-paragraph explanations for single-step actions
- "Let me explain..." preambles
- Restating the user's question back to them
- Apologetic language ("Sorry for the confusion")
- Process narration ("First I'll fetch, then I'll calculate...")
- Commentary around JSON/SQL/YAML outputs when the user requested only the format
</forbidden_patterns>
</output_verbosity_spec>
`.trim();

export type VerbosityLevel = "minimal" | "concise" | "standard" | "detailed";

/**
 * Maps intent category to verbosity level
 */
export function getVerbosityLevel(category: IntentCategory): VerbosityLevel {
  const verbosityMap: Record<IntentCategory, VerbosityLevel> = {
    greeting: "minimal",
    price_check: "minimal",
    balance_check: "minimal",
    wallet_create: "concise",
    wallet_action: "concise",
    trending: "concise",
    market_data: "standard",
    research: "detailed",
    analysis: "detailed",
    general_question: "standard",
    conversation: "concise",
    complex_task: "detailed",
    // New categories
    nft: "concise",
    image_generation: "concise",
    trading: "standard",
    defi: "standard",
    defi_swap: "standard",
    defi_yield: "standard",
    defi_liquidity: "standard",
    general: "standard",
    task_scheduling: "concise",
    code_generation: "detailed",
    document_analysis: "detailed",
    smart_contract: "detailed",
    degen_trading: "concise",
  };

  return verbosityMap[category] ?? "standard";
}

/**
 * Gets verbosity-specific instructions based on level
 */
export function getVerbosityInstructions(level: VerbosityLevel): string {
  const instructions: Record<VerbosityLevel, string> = {
    minimal: "VERBOSITY: Minimal. 1-3 sentences. No fluff. Execute and summarize.",
    concise: "VERBOSITY: Concise. 3-6 sentences or 4-6 bullets. One optional snippet.",
    standard: "VERBOSITY: Standard. Structured response with clear sections. Max 2 snippets.",
    detailed: "VERBOSITY: Detailed but focused. Max 3 sections, 500 words. Include provenance when you used tools or time-sensitive sources.",
  };

  return instructions[level];
}

/**
 * Calculates max tokens based on verbosity level
 */
export function getMaxTokensForVerbosity(level: VerbosityLevel): number | undefined {
  const tokenMap: Record<VerbosityLevel, number> = {
    minimal: 256,
    concise: 512,
    standard: 1024,
    detailed: 2048,
  };

  return tokenMap[level];
}
