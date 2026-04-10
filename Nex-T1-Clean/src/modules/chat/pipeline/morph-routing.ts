const MORPH_NEX_CODE_ALIASES = new Set(["nex-build", "nex-code", "nex-coder"]);

const ARTIFACT_PARITY_MODEL_ALIASES = new Set([
  "nex-t1-free",
  "nex-build",
  "nex-code",
  "nex-coder",
  "nex-t1-ultra",
  "nex-t1-max",
]);

export const MORPH_EXECUTION_STEPS = ["planner", "editor", "executor"] as const;

export function isMorphNexCodeModel(modelAlias: string): boolean {
  const normalized = modelAlias.trim().toLowerCase();
  return MORPH_NEX_CODE_ALIASES.has(normalized);
}

export function shouldEnableArtifactCodingParity(modelAlias: string): boolean {
  const normalized = modelAlias.trim().toLowerCase();
  return ARTIFACT_PARITY_MODEL_ALIASES.has(normalized);
}

export function buildMorphSystemDirective(): string {
  return [
    "MORPH EXECUTION MODE (Nex Code):",
    "- Run each coding task through 3 internal phases: planner -> editor -> executor.",
    "- planner: define file plan, commands, and verification criteria before writing.",
    "- editor: write or update files with minimal safe diffs and preserve project conventions.",
    "- executor: run validations/tests, summarize command output, and only then finalize.",
    "- Always emit/maintain artifact-ready outputs: code, terminal logs, file tree, and preview URLs when available.",
  ].join("\n");
}
