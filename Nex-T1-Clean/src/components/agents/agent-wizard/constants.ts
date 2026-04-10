export const STEPS = [
  { id: "basics", title: "Basics" },
  { id: "tools", title: "Tools" },
  { id: "model", title: "Model" },
  { id: "secrets", title: "Secrets" },
  { id: "pricing", title: "Pricing" },
  { id: "review", title: "Review" },
] as const;

export const STEP_FIELD_MAP: Record<(typeof STEPS)[number]["id"], string[]> = {
  basics: ["slug", "name", "visibility"],
  tools: ["tools"],
  model: ["modelId", "temperature", "maxTokens"],
  secrets: ["secrets"],
  pricing: ["pricing"],
  review: [],
};

export const WIZARD_PANEL =
  "rounded-[20px] border border-[var(--settings-border-soft)] bg-[var(--settings-card-bg)] shadow-none";
export const WIZARD_SUBPANEL =
  "rounded-[18px] border border-[var(--settings-border-soft)] bg-[var(--settings-elevated)]";
export const WIZARD_FIELD =
  "h-11 rounded-[16px] border border-[var(--settings-border)] bg-[var(--settings-elevated)] px-3 text-sm text-[var(--settings-foreground-strong)] transition-colors duration-150 ease-out placeholder:text-[var(--settings-foreground-subtle)] focus-visible:border-[var(--settings-accent)] focus-visible:ring-[3px] focus-visible:ring-[color-mix(in_oklab,var(--settings-accent)_14%,transparent)]";
export const WIZARD_TEXTAREA =
  "rounded-[16px] border border-[var(--settings-border)] bg-[var(--settings-elevated)] px-3 py-2 text-sm text-[var(--settings-foreground-strong)] transition-colors duration-150 ease-out placeholder:text-[var(--settings-foreground-subtle)] focus-visible:border-[var(--settings-accent)] focus-visible:ring-[3px] focus-visible:ring-[color-mix(in_oklab,var(--settings-accent)_14%,transparent)]";
export const WIZARD_SELECT =
  "w-full rounded-[16px] border border-[var(--settings-border)] bg-[var(--settings-elevated)] px-3 py-2 text-sm text-[var(--settings-foreground-strong)] transition-colors duration-150 ease-out focus-visible:border-[var(--settings-accent)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[color-mix(in_oklab,var(--settings-accent)_14%,transparent)]";
export const SECTION_LABEL =
  "text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--settings-foreground-subtle)]";
