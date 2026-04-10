/**
 * Prompt Hook Executor -- Evaluates prompt hooks by injecting input context
 *
 * Prompt hooks don't call an LLM directly (to avoid circular dependencies).
 * Instead, they return injected context for the main agent loop to evaluate.
 */

import type { PromptHookCommand, HookInput, HookOutput } from "./types";

/**
 * Evaluates a prompt hook by injecting input into the prompt template.
 *
 * Full LLM execution would require importing the AI provider, which creates
 * a circular dependency. Instead, prompt hooks are returned as injected context
 * for the main agent loop to evaluate.
 */
export async function executePromptHook(
  hook: PromptHookCommand,
  input: HookInput,
): Promise<HookOutput> {
  // Prompt hooks inject the input as $ARGUMENTS in the prompt
  const serializedInput = JSON.stringify(input, null, 2);
  const promptText = hook.prompt.replace(/\$ARGUMENTS/g, serializedInput);

  return {
    additionalContext: `[Hook Prompt]: ${promptText}`,
  };
}
