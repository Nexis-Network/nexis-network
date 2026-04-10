/**
 * Final Answer Formatting Specification
 * 
 * Domain: AI/Metaprompts
 * Responsibility: Response formatting, citation rules, and output constraints
 * Depends on: None
 * Notes: Implements GPT-5.4 final_answer_formatting patterns (provenance without fabricated citations).
 */

export const FINAL_ANSWER_SPEC = `
<final_answer_formatting>
Your final answer must be clean, actionable, and appropriately sized.

<structure_rules>
**For On-Chain Actions**:
- Lead with status + outcome:
  - "Awaiting approval: Send 0.1 ETH → 0xABCD…"
  - "Executed: Swapped 1 ETH → 1,850 USDC (tx: …)"
- If a write action triggers approval, invoke the tool and let the native approval UI request approval. Do not replace that approval step with a prose-only approval question.
- Include chain, amount, recipient/contract, and any critical parameters (slippage, gas) when relevant.
- Add 1–2 safety notes for value-moving actions (slippage, approvals, contract risk).
- Reference an artifact for detailed receipts/quotes if complex.

**For Data/Research**:
- Lead with key insight or answer
- Support with 2-3 bullet points of evidence
- Include provenance only when you actually used tools/sources (e.g., "Source: CoinGecko (tool)", "Source: Exa web search").

**For Analysis**:
- Executive summary (2-3 sentences)
- Key findings (bullets)
- Recommendation (if applicable)
- Caveats (if high-risk)

**For Trading/DeFi Recommendations**:
- State assumptions (timeframe, chain, risk tolerance) if not provided.
- Provide a simple plan: thesis → key risks → invalidation/stop → next action.
- Never imply guaranteed returns; require user confirmation before any value-moving execution.
</structure_rules>

<provenance_and_hallucination_control>
- Never fabricate citations, sources, URLs, balances, prices, or transaction outcomes.
- Prefer tool outputs for time-sensitive facts; otherwise label statements as general knowledge.
- If you cannot verify a critical claim with available tools/context, say what’s missing and ask one clarifying question or propose a verification step.
</provenance_and_hallucination_control>

<citation_rules>
- Cite only the tools, sources, documents, or pages you actually used.
- For tool-backed claims, name the tool/source and include a URL or identifier only if that source provided one.
- Do not cite model prior knowledge as though it were retrieved evidence.
- If sources disagree, say so and explain which source you relied on.
</citation_rules>

<grounding_rules>
- Separate verified facts, calculations, and inferences.
- Prefer fresher or more authoritative evidence when sources conflict.
- Treat tool outputs and retrieved documents as primary evidence; use prior knowledge only for background framing.
- Never extend balances, prices, positions, or transaction status beyond returned data.
</grounding_rules>

<research_answer_contract>
- For research-heavy answers, lead with the conclusion, then provide the strongest evidence, contradictions, key risks, and open questions.
- If no retrieved evidence was used, do not fabricate citations; either label the answer as general knowledge or say the task is blocked pending research.
- Keep verified facts, calculations, and inferences clearly separated.
</research_answer_contract>

<structured_output_contract>
If the user requests JSON, SQL, YAML, CSV, ABI, code-only, or another parse-sensitive format:
- Output only the requested format unless the user explicitly asked for commentary.
- Do not add markdown fences unless requested.
- Keep schema, field names, and ordering constraints exact when provided.
- Validate brackets, quotes, and top-level shape before finishing.
- If required schema/context is missing, ask for it or return an explicit blocked/error object instead of inventing fields.
</structured_output_contract>

<code_output_rules>
- Never include "before/after" code pairs unless explicitly requested
- Prefer file/symbol references over inline code
- If code is necessary, keep it under 10 lines
- For smart-contract requests, keep full source in \`smart-contract-viewer\` and avoid full inline contract blocks
- Use syntax highlighting: \`\`\`solidity, \`\`\`typescript, etc.
- No full method bodies - show signature + key logic only
</code_output_rules>

<forbidden_in_final_answer>
- Process narration ("I searched for...", "I found that...")
- Build/lint/test logs unless requested
- Internal tool IDs in user-facing text (say "swap" not the tool name)
- Repeated acknowledgments
- Empty pleasantries at end ("Let me know if you need anything else!")
- Extra prose around strict machine-readable outputs
</forbidden_in_final_answer>

<artifact_references>
When generating artifacts:
- Announce once: "I've prepared a [artifact type] for you."
- Reference by purpose, not ID: "See the portfolio breakdown in the panel."
- Don't dump artifact JSON in the message - that's what artifacts are for
</artifact_references>

<error_responses>
When things fail:
- Acknowledge briefly
- Explain what was attempted (1 sentence)
- Offer alternative or next step
- Never expose stack traces or internal errors

Example: "Couldn't complete the swap - the liquidity pool had insufficient depth. Try reducing the amount or using a different pair."
</error_responses>
</final_answer_formatting>
`.trim();

export type AnswerStructure = "action" | "data" | "analysis" | "error" | "conversational";

/**
 * Gets the appropriate answer structure based on intent and result
 */
export function getAnswerStructure(
  hasToolResults: boolean,
  hasError: boolean,
  intentCategory: string
): AnswerStructure {
  if (hasError) return "error";

  if (["wallet_create", "wallet_action"].includes(intentCategory)) {
    return "action";
  }

  if (["research", "analysis", "complex_task"].includes(intentCategory)) {
    return "analysis";
  }

  if (["greeting", "conversation"].includes(intentCategory)) {
    return "conversational";
  }

  return hasToolResults ? "data" : "conversational";
}

/**
 * Formats a tool result for user-friendly display
 */
export function formatToolResultForUser(
  toolName: string,
  result: UntypedJson
): string {
  // Handle common tool result patterns
  if (!result) return "No data returned.";

  if (typeof result === "string") {
    return result.length > 200 ? `${result.slice(0, 200)}...` : result;
  }

  const obj = result as Record<string, UntypedJson>;

  // Wallet creation
  if (obj.address && typeof obj.address === "string") {
    const truncatedAddress = `${obj.address.slice(0, 6)}...${obj.address.slice(-4)}`;
    return `Address: ${truncatedAddress}`;
  }

  // Balance check
  if (obj.balance !== undefined) {
    return `Balance: ${obj.balance} ${obj.symbol ?? ""}`.trim();
  }

  // Price data
  if (obj.price !== undefined) {
    return `Price: $${Number(obj.price).toLocaleString()}`;
  }

  // Swap quote
  if (obj.toAmount !== undefined && obj.fromAmount !== undefined) {
    return `${obj.fromAmount} → ${obj.toAmount}`;
  }

  // Default: summarize keys
  const keys = Object.keys(obj).slice(0, 3);
  return `Result contains: ${keys.join(", ")}`;
}

/**
 * Builds a citation string from source information
 */
export function buildCitation(
  sourceName: string,
  url?: string
): string {
  if (url) {
    return `[${sourceName}](${url})`;
  }
  return `[${sourceName}]`;
}

/**
 * Validates that a response follows final answer rules
 */
export function validateFinalAnswer(text: string): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check for forbidden patterns
  const forbiddenPatterns = [
    { pattern: /I searched for/i, issue: "Contains process narration" },
    { pattern: /Let me know if/i, issue: "Contains empty pleasantry" },
    { pattern: /```[\s\S]{500,}```/m, issue: "Code block exceeds recommended length" },
  ];

  for (const { pattern, issue } of forbiddenPatterns) {
    if (pattern.test(text)) {
      issues.push(issue);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
