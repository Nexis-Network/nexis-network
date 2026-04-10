import { z } from "zod";

export const CHAT_EXECUTION_SLIPPAGE_OPTIONS = [0.5, 1, 2, 3] as const;

const ChatExecutionSlippageSchema = z.union([
  z.literal(0.5),
  z.literal(1),
  z.literal(2),
  z.literal(3),
]);

const ChatExecutionGasPriceSchema = z.number().positive().finite().max(100000);

export const ChatExecutionPreferencesSchema = z.object({
  mevProtection: z.boolean().default(true),
  crossChainRouting: z.boolean().default(true),
  gasPriority: z.boolean().default(false),
  maxSlippagePct: ChatExecutionSlippageSchema.default(1),
  gasPriceGwei: ChatExecutionGasPriceSchema.nullable().optional(),
});

export type ChatExecutionPreferences = z.infer<
  typeof ChatExecutionPreferencesSchema
>;

export const DEFAULT_CHAT_EXECUTION_PREFERENCES: ChatExecutionPreferences = {
  ...ChatExecutionPreferencesSchema.parse({}),
  gasPriceGwei: null,
};

export function normalizeChatExecutionPreferences(
  value: unknown,
): ChatExecutionPreferences {
  const parsed = ChatExecutionPreferencesSchema.safeParse(value);
  return parsed.success
    ? {
        ...DEFAULT_CHAT_EXECUTION_PREFERENCES,
        ...parsed.data,
      }
    : DEFAULT_CHAT_EXECUTION_PREFERENCES;
}

export function formatChatExecutionSlippage(value: number): string {
  return Number.isInteger(value)
    ? `${value.toFixed(0)}%`
    : `${value.toFixed(1)}%`;
}

export function formatChatExecutionGasPrice(value: number): string {
  return Number.isInteger(value)
    ? value.toFixed(0)
    : value.toFixed(4).replace(/\.?0+$/, "");
}

export function hasExecutionPreferenceOverrides(
  value: ChatExecutionPreferences,
): boolean {
  return (
    value.mevProtection !== DEFAULT_CHAT_EXECUTION_PREFERENCES.mevProtection ||
    value.crossChainRouting !==
      DEFAULT_CHAT_EXECUTION_PREFERENCES.crossChainRouting ||
    value.gasPriority !== DEFAULT_CHAT_EXECUTION_PREFERENCES.gasPriority ||
    value.maxSlippagePct !==
      DEFAULT_CHAT_EXECUTION_PREFERENCES.maxSlippagePct ||
    (value.gasPriceGwei ?? null) !==
      DEFAULT_CHAT_EXECUTION_PREFERENCES.gasPriceGwei
  );
}

export function buildExecutionPreferencesAttachmentContext(
  preferences: ChatExecutionPreferences,
): string {
  const maxSlippageBps = Math.round(preferences.maxSlippagePct * 100);
  const gasPriceGwei = preferences.gasPriceGwei ?? null;

  return [
    "",
    "",
    "[USER_EXECUTION_PREFERENCES]",
    "The user configured the following execution defaults in the chat composer:",
    preferences.mevProtection
      ? "- MEV Protection: Enabled. Prefer private or anti-frontrun routing when supported. If the current route cannot provide MEV protection, disclose that before execution."
      : "- MEV Protection: Disabled. Do not prioritize protected routing unless the user explicitly asks for it.",
    preferences.crossChainRouting
      ? "- Cross-chain Routing: Enabled. You may consider bridges and alternate chains if they improve total execution quality."
      : "- Cross-chain Routing: Disabled. Keep execution on the user's current or explicitly requested chain unless the user asks to route across chains.",
    gasPriceGwei !== null
      ? `- Gas Strategy: Custom gas target of ${formatChatExecutionGasPrice(gasPriceGwei)} gwei. When a tool accepts manual gas price, max fee, or priority fee inputs, use this as the default target and disclose any unsupported manual gas controls before execution.`
      : preferences.gasPriority
        ? "- Gas Priority: Enabled. Optimize for faster confirmation and include the expected priority fee or gas premium in your summary."
        : "- Gas Priority: Disabled. Optimize for standard or efficient gas usage instead of speed-first execution.",
    `- Max Slippage: ${formatChatExecutionSlippage(preferences.maxSlippagePct)} (${maxSlippageBps} bps). When a trade, swap, or bridge tool accepts slippage parameters, use this as the default ceiling unless the user explicitly overrides it.`,
    "Treat these preferences as execution defaults for planning and tool arguments. Explicit user instructions in the chat override them.",
    "[/USER_EXECUTION_PREFERENCES]",
  ].join("\n");
}
