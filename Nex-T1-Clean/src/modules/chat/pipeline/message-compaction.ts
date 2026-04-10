import {
  buildStructuredCompactionDeltaFromMessages,
  mergeStructuredCompactionState,
  readStructuredCompactionState,
  summarizeStructuredCompactionState,
  writeStructuredCompactionState,
  type StructuredCompactionState,
} from "@/modules/chat/state/compaction-store";

type ChatMessageLike = { role: string; content: UntypedJson };

const DEFAULT_HEADROOM_TOKENS = 768;
const MIN_MESSAGE_BUDGET = 512;

export const estimateTokens = (messages: ChatMessageLike[]) =>
  messages.reduce((sum, msg) => {
    const text =
      typeof msg.content === "string"
        ? msg.content
        : Array.isArray(msg.content)
          ? msg.content.map((c) => (typeof c === "string" ? c : JSON.stringify(c))).join(" ")
          : JSON.stringify(msg.content ?? "");
    return sum + Math.ceil(text.length / 4);
  }, 0);

export type CompactionResult = {
  messages: ChatMessageLike[];
  tokensBefore: number;
  tokensAfter: number;
  totalTokensBefore: number;
  totalTokensAfter: number;
  trimmedCount: number;
  summaryApplied: boolean;
  summaryText: string;
  safeMessageBudget: number;
  state: StructuredCompactionState | null;
};

export type CompactMessagesOptions = {
  sessionId?: string | null;
  reservedTokens?: number;
  headroomTokens?: number;
};

const stringifyContent = (content: UntypedJson): string => {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((part) => (typeof part === "string" ? part : JSON.stringify(part))).join(" ");
  }
  return JSON.stringify(content ?? "");
};

export const compactMessages = async (
  messages: ChatMessageLike[],
  contextLimit: number,
  options: CompactMessagesOptions = {},
): Promise<CompactionResult> => {
  const reservedTokens = Math.max(0, options.reservedTokens ?? 0);
  const headroomTokens = Math.max(0, options.headroomTokens ?? DEFAULT_HEADROOM_TOKENS);
  const safeMessageBudget = Math.max(
    MIN_MESSAGE_BUDGET,
    contextLimit - reservedTokens - headroomTokens,
  );
  const tokensBefore = estimateTokens(messages);
  const totalTokensBefore = tokensBefore + reservedTokens;
  const previousState = await readStructuredCompactionState(options.sessionId ?? null);

  if (tokensBefore <= safeMessageBudget) {
    return {
      messages,
      tokensBefore,
      tokensAfter: tokensBefore,
      totalTokensBefore,
      totalTokensAfter: totalTokensBefore,
      trimmedCount: 0,
      summaryApplied: false,
      summaryText: summarizeStructuredCompactionState(previousState),
      safeMessageBudget,
      state: previousState,
    };
  }

  const systemMessages = messages.filter((message) => message.role === "system");
  const nonSystem = messages.filter((message) => message.role !== "system");

  let keepTailCount = Math.min(12, Math.max(0, nonSystem.length - 1));
  let trimmed: ChatMessageLike[] = [];
  let keepTail: ChatMessageLike[] = nonSystem;
  let mergedState = previousState;
  let summaryText = summarizeStructuredCompactionState(previousState);
  let compactedMessages = messages;
  let tokensAfter = tokensBefore;

  while (keepTailCount >= 1) {
    keepTail = nonSystem.slice(-keepTailCount);
    trimmed = nonSystem.slice(0, Math.max(0, nonSystem.length - keepTailCount));

    const delta = buildStructuredCompactionDeltaFromMessages(trimmed);
    mergedState = options.sessionId
      ? mergeStructuredCompactionState(previousState, delta, options.sessionId)
      : null;
    summaryText =
      summarizeStructuredCompactionState(mergedState) ||
      trimmed
        .map((message) => `${message.role}: ${stringifyContent(message.content)}`)
        .join(" | ")
        .slice(0, 1200);

    compactedMessages = [
      ...systemMessages,
      {
        role: "system",
        content: `Conversation state (structured compaction):\n${summaryText}`,
      },
      ...keepTail,
    ];
    tokensAfter = estimateTokens(compactedMessages);

    if (tokensAfter <= safeMessageBudget) {
      break;
    }

    keepTailCount -= 2;
  }

  if (options.sessionId && mergedState) {
    await writeStructuredCompactionState(mergedState);
  }

  return {
    messages: compactedMessages,
    tokensBefore,
    tokensAfter,
    totalTokensBefore,
    totalTokensAfter: tokensAfter + reservedTokens,
    trimmedCount: trimmed.length,
    summaryApplied: trimmed.length > 0,
    summaryText,
    safeMessageBudget,
    state: mergedState,
  };
};
