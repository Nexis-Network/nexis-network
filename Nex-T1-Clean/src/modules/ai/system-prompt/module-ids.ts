export const PROMPT_MODULE_IDS = ["market", "builder", "research"] as const;

export type PromptModuleId = (typeof PROMPT_MODULE_IDS)[number];

export const PROMPT_MODULE_ID_SET = new Set<string>(PROMPT_MODULE_IDS);

export function isPromptModuleId(value: UntypedJson): value is PromptModuleId {
  return typeof value === "string" && PROMPT_MODULE_ID_SET.has(value);
}
