/**
 * User Updates Specification
 * 
 * Domain: AI/Metaprompts
 * Responsibility: Progress update patterns for agentic multi-tool workflows
 * Depends on: None
 * Notes: Implements GPT-5.4 user updates/preambles for transparent execution and reduced “agent freeze”.
 */

export const USER_UPDATES_SPEC = `
<user_updates_spec>
Keep users informed during multi-tool workflows without interrupting flow.

<update_frequency>
- **Single tool**: No preamble needed. Execute and report result.
- **2-3 tools**: Brief status after first tool completes.
- **4+ tools**: Update every 2-3 tool calls with progress summary.
- **Long-running** (>10s): Send heartbeat update to prevent timeout perception.
</update_frequency>

<update_format>
Updates should be:
- 1-2 sentences max
- Action-focused ("Fetching..." "Analyzing..." "Found...")
- Avoid filler apologies; be factual (it’s OK to state a real limitation or missing input)
- Embedded naturally, not as separate blocks
- For broad tasks, start with a one-line plan: "I’ll do A → B → C."

Good: "Checking ETH balance... Found 2.5 ETH. Now fetching swap rates."
Bad: "I am now going to check your ETH balance. Please wait while I do this."
</update_format>

<instruction_update_handling>
- If the user changes the task mid-conversation, send a short reset update such as "Switching to X. Rechecking Y and Z."
- Replace the old plan instead of continuing stale steps.
- Mention when earlier results are being reused versus refreshed.
</instruction_update_handling>

<when_to_update>
**Always update on**:
- Tool returning actionable data
- Switching from read to write operations
- Encountering and recovering from errors
- Completing multi-step sequences
- When you need a user decision before proceeding (checkpoint)

**Never update on**:
- Internal reasoning steps
- Cache hits
- Parallel query dispatch (update on results instead)
- Simple single-tool operations
</when_to_update>

<progress_indicators>
For complex workflows, use structured progress:
- "Step 1/3: Fetching portfolio data..."
- "Step 2/3: Analyzing allocations..."
- "Step 3/3: Generating recommendations..."

For research tasks:
- "Searching 3 sources... Found 12 relevant results."
- "Cross-referencing data... 8 claims verified."
- "Scope changed to NFT analysis. Reusing wallet data and refreshing market checks."
</progress_indicators>

<error_communication>
When tools fail:
- Acknowledge briefly: "Couldn't fetch from [source]."
- Pivot immediately: "Using fallback: [alternative]."
- Never blame external services extensively
- Never expose internal error codes to user
</error_communication>
</user_updates_spec>
`.trim();

export type UpdateType = 
  | "tool_start"
  | "tool_complete"
  | "progress"
  | "error_recovery"
  | "sequence_complete"
  | "heartbeat";

export type UserUpdate = {
  type: UpdateType;
  message: string;
  step?: number;
  totalSteps?: number;
  toolName?: string;
  elapsedMs?: number;
};

/**
 * Generates a user update message based on context
 */
export function generateUserUpdate(update: UserUpdate): string {
  const { type, message, step, totalSteps, toolName, elapsedMs } = update;

  switch (type) {
    case "tool_start":
      return toolName ? `Executing ${formatToolName(toolName)}...` : message;

    case "tool_complete":
      return message;

    case "progress":
      if (step !== undefined && totalSteps !== undefined) {
        return `Step ${step}/${totalSteps}: ${message}`;
      }
      return message;

    case "error_recovery":
      return `${message} Using fallback...`;

    case "sequence_complete":
      return message;

    case "heartbeat":
      if (elapsedMs && elapsedMs > 15000) {
        return "Still working... This is taking longer than usual.";
      }
      return "Processing...";

    default:
      return message;
  }
}

/**
 * Formats tool name for user-friendly display
 */
function formatToolName(toolName: string): string {
  const friendlyNames: Record<string, string> = {
    evm_wallet_send_asset: "wallet transfer",
    evm_wallet: "wallet operation",
    cryptowallet_evm: "wallet operation",
    bitcoin_network: "bitcoin operation",
    agent_wallet_list: "wallet list",
    wallet_get_holdings: "holdings lookup",
    wallet_get_net_worth: "net worth lookup",
    coingecko_trending: "market data",
    dexscreener: "DEX data",
    exa_web_search: "web search",
    openai_web_search: "web search",
    pumpfun_trader: "Pump.fun trade",
  };

  return friendlyNames[toolName] ?? toolName.replace(/_/g, " ");
}

/**
 * Determines if an update should be sent based on workflow state
 */
export function shouldSendUpdate(
  toolIndex: number,
  totalTools: number,
  elapsedMs: number
): boolean {
  // Always update on first and last tool
  if (toolIndex === 0 || toolIndex === totalTools - 1) return true;

  // Update every 2-3 tools for longer sequences
  if (totalTools >= 4 && toolIndex % 2 === 0) return true;

  // Heartbeat for long-running operations
  if (elapsedMs > 10000) return true;

  return false;
}

/**
 * Progress update event structure for streaming
 */
export type ProgressEvent = {
  type: "user_update";
  data: {
    message: string;
    progress?: {
      current: number;
      total: number;
      percentage: number;
    };
    timing?: {
      elapsedMs: number;
      estimatedRemainingMs?: number;
    };
  };
};

export function createProgressEvent(
  message: string,
  current?: number,
  total?: number,
  elapsedMs?: number
): ProgressEvent {
  return {
    type: "user_update",
    data: {
      message,
      ...(current !== undefined && total !== undefined && {
        progress: {
          current,
          total,
          percentage: Math.round((current / total) * 100),
        },
      }),
      ...(elapsedMs !== undefined && {
        timing: {
          elapsedMs,
        },
      }),
    },
  };
}
