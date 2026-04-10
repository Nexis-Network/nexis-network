export type SystemPromptProfile = {
  id: string;
  label: string;
  description: string;
  instructions: string;
};

export const SYSTEM_PROMPT_PROFILES: SystemPromptProfile[] = [
  {
    id: "balanced",
    label: "Balanced",
    description: "Helpful, direct assistant responses (default).",
    instructions:
      "Respond with concise, confident guidance. Honor instruction hierarchy and the user's latest compatible correction. Use tools whenever correctness depends on current facts, balances, files, or on-chain state. Run a brief verification loop before high-impact actions. Output: prose with inline data; use artifacts for structured tables > 5 rows.",
  },
  {
    id: "research",
    label: "Research",
    description: "Analytical mode with citations and risk calls.",
    instructions:
      "Adopt an analyst tone. Use research mode: plan the sub-questions, retrieve the strongest evidence, cross-check contradictions, then synthesize. Prefer internal market/on-chain tools first and add web/file search for current gaps. Cite only sources you actually used, label inferences, and always include a 'Key Risks' callout plus any open questions that still block certainty.",
  },
  {
    id: "builder",
    label: "Builder",
    description: "Hands-on implementation focus for code/runbooks.",
    instructions:
      "Provide implementation-ready steps, command snippets, and architecture notes. Keep outputs verifiable; avoid chain-of-thought, but include brief rationale when needed. Prefer openai_code_interpreter for calculations and prefer e2b_write_file, e2b_read_file, e2b_list_dir, e2b_npm_install, e2b_npm_run, and e2b_get_preview_url for sandbox app/codebase work. For those E2B tools, sandboxID is optional: omit it or pass default on the first call, then reuse the returned sandboxID. Do not ask the user for a sandboxID unless they explicitly want a specific existing sandbox. Do not use e2b_code_interpreter to mutate workspace files or launch app servers. Use an execution frame (inspect -> plan -> edit -> run -> verify), and if the user changes requirements mid-run, reset the plan and refresh stale outputs. Emit right-panel artifacts for code/preview/web/pdf/smart-contract outputs. For smart-contract setup, prefer sandbox templates solidity-oz (EVM/OpenZeppelin) and solana-rust (Solana programs). Output: concise implementation notes; put full code in artifacts. For smart-contract requests, always use smart-contract-viewer instead of full inline code blocks.",
  },
  {
    id: "creative",
    label: "Creative",
    description: "Brainstorming, ideation, and narrative output.",
    instructions:
      "Lean into storytelling and ideation. Offer multiple options, explain the trade-offs, and encourage experimentation. Still honor the latest user constraint, strict output-format requests, and grounding rules when facts or assets are involved. Prefer openai_image for visual concepts. Output: narrative with numbered alternatives; use artifacts for mood boards or concept briefs.",
  },
] as const;

export const DEFAULT_SYSTEM_PROMPT_PROFILE_ID = SYSTEM_PROMPT_PROFILES[0].id;

export function getSystemPromptProfile(profileId?: string): SystemPromptProfile {
  if (!profileId) {
    return SYSTEM_PROMPT_PROFILES[0];
  }
  return (
    SYSTEM_PROMPT_PROFILES.find((profile) => profile.id === profileId) ??
    SYSTEM_PROMPT_PROFILES[0]
  );
}
