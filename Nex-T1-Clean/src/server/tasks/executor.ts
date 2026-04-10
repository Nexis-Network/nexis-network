import "server-only";

import { formatUnits, parseUnits } from "viem";

import { searchStoriesByTopic } from "@/lib/hacker-news";
import { fetchZeroExQuote, ZeroExApiError } from "@/server/services/vendors/zeroex-service";
import type { TaskActionInput } from "@/modules/tasks/action-schema";
import type { AgentTaskRow } from "@/server/tasks/types";
import { getTokenMetadata } from "@/server/tasks/token-metadata";
import { sendEmailDigest } from "@/server/services/email/resend";
import { getNexAdminAccount } from "@/modules/wallets/nex/admin";
import { createNexSmartAccountClient } from "@/modules/wallets/nex/client-factory";
import { logger } from "@/lib/logger";
import type { JsonObject } from "@/types/json";

export type TaskExecutionResult = {
  status: "completed" | "failed" | "requires_action";
  summary?: string;
  renderHint?: string;
  output?: JsonObject;
  error?: string;
};

export async function executeTaskAction(task: AgentTaskRow, action: TaskActionInput): Promise<TaskExecutionResult> {
  switch (action.type) {
    case "news_digest":
      return executeNewsDigest(action);
    case "dex_trade":
      return executeDexTrade(action);
    default:
      return unsupportedActionResult(action);
  }
}

async function executeNewsDigest(action: Extract<TaskActionInput, { type: "news_digest" }>): Promise<TaskExecutionResult> {
  const stories = await searchStoriesByTopic(action.topic, action.limit ?? 6);
  if (action.deliver.includes("email") && action.email) {
    const html = renderDigestEmail(action.topic, stories);
    try {
      await sendEmailDigest({
        to: action.email,
        subject: `Digest: ${action.topic}`,
        html,
      });
    } catch (error) {
      return {
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  return {
    status: "completed",
    summary: `Found ${stories.length} story${stories.length === 1 ? "" : "ies"} for ${action.topic}`,
    renderHint: "news_digest",
    output: {
      topic: action.topic,
      stories: stories.map((story) => ({
        id: story.id,
        title: story.title,
        url: story.url,
        score: story.score,
        by: story.by,
        time: story.time,
        descendants: story.descendants,
      })),
    },
  };
}

async function executeDexTrade(action: Extract<TaskActionInput, { type: "dex_trade" }>): Promise<TaskExecutionResult> {
  try {
    const sellTokenMetadata = getTokenMetadata(action.chainId, action.side === "sell" ? action.baseToken : action.quoteToken);
    const buyTokenMetadata = getTokenMetadata(action.chainId, action.side === "sell" ? action.quoteToken : action.baseToken);
    const amountDecimals = action.amountMode === "buy" ? buyTokenMetadata.decimals : sellTokenMetadata.decimals;
    const parsedAmount = parseUnits(action.amount || "0", amountDecimals);

    // Resolve taker address: use provided address or fall back to admin account
    const takerAddress = action.takerAddress ?? (await resolveAdminTaker(action.chainId));

    const quote = await fetchZeroExQuote({
      chainId: action.chainId,
      sellToken:
        action.side === "sell"
          ? sellTokenMetadata.address ?? action.baseToken.toUpperCase()
          : sellTokenMetadata.address ?? action.quoteToken.toUpperCase(),
      buyToken:
        action.side === "sell"
          ? buyTokenMetadata.address ?? action.quoteToken.toUpperCase()
          : buyTokenMetadata.address ?? action.baseToken.toUpperCase(),
      slippageBps: action.slippageBps,
      takerAddress: takerAddress ?? undefined,
      ...(action.amountMode === "sell"
        ? { sellAmount: parsedAmount.toString() }
        : { buyAmount: parsedAmount.toString() }),
    });

    const sellAmount = Number(formatUnits(BigInt(quote.sellAmount), sellTokenMetadata.decimals));
    const buyAmount = Number(formatUnits(BigInt(quote.buyAmount), buyTokenMetadata.decimals));

    // --- Simulate mode: return quote without executing ---
    if (action.executionMode !== "execute") {
      return {
        status: "completed",
        summary: `Quoted ${action.side.toUpperCase()} ${action.baseToken}/${action.quoteToken} on chain ${action.chainId}`,
        renderHint: "dex_trade",
        output: {
          mode: "simulate",
          ...quote,
          sellAmount,
          buyAmount,
          action,
        },
      };
    }

    // --- Execute mode: submit on-chain transaction via smart account ---
    if (!takerAddress) {
      return {
        status: "requires_action",
        summary: `Quoted ${action.side.toUpperCase()} ${action.baseToken}/${action.quoteToken} — no signer available`,
        renderHint: "dex_trade",
        error: "No admin account configured. Set PRIVATE_KEY to enable automated execution, or approve manually.",
        output: {
          mode: "pending_approval",
          ...quote,
          sellAmount,
          buyAmount,
          action,
        },
      };
    }

    const adminWallet = await getNexAdminAccount(action.chainId);
    if (!adminWallet) {
      return {
        status: "requires_action",
        summary: `Quoted ${action.side.toUpperCase()} ${action.baseToken}/${action.quoteToken} — admin wallet unavailable`,
        renderHint: "dex_trade",
        error: "Admin smart account could not be initialized for this chain. Review and approve manually.",
        output: {
          mode: "pending_approval",
          ...quote,
          sellAmount,
          buyAmount,
          action,
        },
      };
    }

    logger.info("[tasks][executor] Submitting DEX trade on-chain", {
      chainId: action.chainId,
      taker: takerAddress,
      sellToken: action.baseToken,
      buyToken: action.quoteToken,
      sellAmount,
      buyAmount,
    });

    const smartAccountClient = createNexSmartAccountClient({
      account: adminWallet.account,
      chainId: action.chainId,
    });

    const txHash = await smartAccountClient.sendTransaction({
      to: quote.to as `0x${string}`,
      data: quote.data as `0x${string}`,
      value: quote.value ? BigInt(quote.value) : 0n,
    });

    return {
      status: "completed",
      summary: `Executed ${action.side.toUpperCase()} ${action.baseToken}/${action.quoteToken} on chain ${action.chainId} — tx: ${txHash}`,
      renderHint: "dex_trade",
      output: {
        mode: "executed",
        txHash,
        ...quote,
        sellAmount,
        buyAmount,
        action,
      },
    };
  } catch (error) {
    const message =
      error instanceof ZeroExApiError
        ? `0x quote failed (${error.status}): ${error.body ?? error.message}`
        : error instanceof Error
          ? error.message
          : String(error);
    return {
      status: "failed",
      error: message,
    };
  }
}

/** Resolve the admin account address for a given chain, or null if unconfigured. */
async function resolveAdminTaker(chainId: number): Promise<string | null> {
  try {
    const adminWallet = await getNexAdminAccount(chainId);
    return adminWallet?.address ?? null;
  } catch {
    return null;
  }
}

function renderDigestEmail(topic: string, stories: Awaited<ReturnType<typeof searchStoriesByTopic>>) {
  const list = stories
    .map(
      (story) => `<li>
        <strong>${story.title}</strong> &mdash; score ${story.score} • comments ${story.descendants}
        <div><a href="${story.url ?? `https://news.ycombinator.com/item?id=${story.id}`}">Open story</a></div>
      </li>`,
    )
    .join("");
  return `<div>
    <p>Here are the latest ${topic} highlights:</p>
    <ul>${list}</ul>
    <p>Generated by Nex Automations.</p>
  </div>`;
}

function unsupportedActionResult(action: never): TaskExecutionResult {
  const fallback = action as { type?: string };
  return {
    status: "failed",
    error: `Unsupported action type ${fallback.type ?? "unknown"}`,
  };
}
