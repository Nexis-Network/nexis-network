import {
  ArrowLeftRight,
  CandlestickChart,
  CreditCard,
  LineChart,
  MessageSquare,
  Wallet2,
  Workflow,
} from "lucide-react";

import type { Stats11Card } from "@/components/stats-11";
import type { SettingsOverviewUsageSummary } from "@/server/settings/overview-usage";

function formatCurrency(
  value: number | null | undefined,
  locale: string,
  options: { signed?: boolean; compact?: boolean } = {},
) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "—";
  }

  return value.toLocaleString(locale, {
    style: "currency",
    currency: "USD",
    notation: options.compact ? "compact" : "standard",
    maximumFractionDigits: Math.abs(value) >= 1000 ? 0 : 2,
    signDisplay: options.signed ? "always" : "auto",
  });
}

function formatCount(value: number | null | undefined, locale: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "—";
  }

  return value.toLocaleString(locale);
}

function formatPercent(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "—";
  }

  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)}%`;
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return count === 1 ? singular : plural;
}

function statusClassForSignedMetric(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "text-muted-foreground";
  }

  return value < 0 ? "text-destructive" : "text-foreground";
}

function progressClassForSignedMetric(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "text-muted-foreground/30";
  }

  return value < 0 ? "text-destructive" : "text-chart-2";
}

function buildChangeProgress(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.min(Math.abs(value) * 4, 100);
}

export function buildSettingsUsageCards(
  data: SettingsOverviewUsageSummary,
  locale: string,
): Stats11Card[] {
  const { wallet, credits, activity, window } = data;
  const balanceStatus =
    wallet.balanceChangeUsd24h != null || wallet.balanceChangePct24h != null
      ? `24h ${formatCurrency(wallet.balanceChangeUsd24h, locale, { signed: true })} (${formatPercent(wallet.balanceChangePct24h)})`
      : "24h balance change unavailable";

  return [
    {
      id: "balance",
      title: "Balance",
      value: formatCurrency(wallet.totalBalanceUsd, locale),
      limit: `${wallet.walletCount} embedded ${pluralize(wallet.walletCount, "wallet")}`,
      details: [
        {
          label: "EVM",
          value: formatCount(wallet.evmWalletCount, locale),
          toneClassName: "text-chart-1",
        },
        {
          label: "Solana",
          value: formatCount(wallet.solanaWalletCount, locale),
          toneClassName: "text-chart-4",
        },
        {
          label: "NFTs",
          value: formatCount(wallet.nftCount, locale),
          toneClassName: "text-chart-5",
        },
      ],
      status: balanceStatus,
      statusClassName: statusClassForSignedMetric(wallet.balanceChangeUsd24h),
      actionLabel: "Wallets",
      actionHref: "/settings/wallets",
      actionIcon: <Wallet2 className="size-4" />,
    },
    {
      id: "change",
      title: "24h Change",
      value: formatCurrency(wallet.balanceChangeUsd24h, locale, {
        signed: true,
      }),
      limit: formatPercent(wallet.balanceChangePct24h),
      percentage: buildChangeProgress(wallet.balanceChangePct24h),
      progressColorClassName: progressClassForSignedMetric(
        wallet.balanceChangePct24h,
      ),
      status:
        wallet.balanceChangePct24h != null
          ? "Mark-to-market move across funded Nex Wallets."
          : "Waiting for enough market data to measure change.",
      statusClassName: "text-muted-foreground",
      actionLabel: "Transactions",
      actionHref: "/settings/portfolio?view=transactions",
      actionIcon: <LineChart className="size-4" />,
    },
    {
      id: "asset-mix",
      title: "Cash vs Investments",
      value: formatCurrency(wallet.stablecoinsUsd, locale),
      limit: `${wallet.stablecoinsAllocationPct.toFixed(1)}% cash`,
      stackedProgress: true,
      details: [
        {
          label: "Stablecoins",
          value: formatCurrency(wallet.stablecoinsUsd, locale),
          toneClassName: "text-chart-5",
        },
        {
          label: "Investments",
          value: formatCurrency(wallet.investmentsUsd, locale),
          toneClassName: "text-chart-1",
        },
      ],
      status: `${wallet.investmentsAllocationPct.toFixed(1)}% deployed into tokens; ${formatCount(wallet.nftCount, locale)} NFTs detected.`,
      statusClassName: "text-muted-foreground",
      actionLabel: "Portfolio",
      actionHref: "/settings/portfolio",
      actionIcon: <CandlestickChart className="size-4" />,
    },
    {
      id: "pnl",
      title: "Profit & Loss",
      value: formatCurrency(wallet.profitLossUsd, locale, { signed: true }),
      limit:
        wallet.profitLossRoiPct != null
          ? formatPercent(wallet.profitLossRoiPct)
          : "ROI unavailable",
      percentage: buildChangeProgress(wallet.profitLossRoiPct),
      progressColorClassName: progressClassForSignedMetric(
        wallet.profitLossRoiPct,
      ),
      status:
        wallet.profitLossConfidence === "high"
          ? "Moralis profitability summary across supported EVM wallets."
          : wallet.profitLossConfidence === "medium"
            ? "Mixed profitability confidence across Nex Wallet (EVM) activity."
            : wallet.profitLossConfidence === "low"
              ? "Approximate profitability fallback on one or more wallets."
              : "No profitability history available yet.",
      statusClassName:
        wallet.profitLossConfidence === "low"
          ? "text-chart-5"
          : "text-muted-foreground",
      actionLabel: "Performance",
      actionHref: "/settings/portfolio",
      actionIcon: <LineChart className="size-4" />,
    },
    {
      id: "credits",
      title: "Credit Usage",
      value: formatCount(credits.used, locale),
      limit:
        typeof credits.limit === "number" && Number.isFinite(credits.limit)
          ? `${formatCount(credits.limit, locale)} monthly`
          : "usage",
      percentage: credits.usedRatioPct,
      progressColorClassName: "text-chart-1",
      details: [
        {
          label: "Remaining",
          value: formatCount(credits.remaining, locale),
          toneClassName: "text-chart-2",
        },
        {
          label: "Overage",
          value: formatCount(credits.overageCredits, locale),
          toneClassName: "text-chart-5",
        },
      ],
      status: credits.plan
        ? `${credits.plan} plan credits tracked in real time.`
        : "Credits tracked in real time.",
      statusClassName: "text-muted-foreground",
      warningMessage:
        typeof credits.remaining === "number" &&
        typeof credits.limit === "number" &&
        credits.limit > 0 &&
        credits.remaining / credits.limit <= 0.2
          ? "Remaining credits are below 20% of your monthly allocation."
          : null,
      actionLabel: "Billing",
      actionHref: "/settings/workspace?view=billing",
      actionIcon: <CreditCard className="size-4" />,
    },
    {
      id: "messages",
      title: "Agent Messages",
      value: formatCount(activity.messagesToAgents, locale),
      limit: `${formatCount(activity.conversations, locale)} conversations`,
      percentage:
        window.days > 0 ? (activity.activeDays / window.days) * 100 : null,
      progressColorClassName: "text-chart-4",
      details: [
        {
          label: "Credits",
          value: formatCount(activity.creditsConsumed, locale),
          toneClassName: "text-chart-1",
        },
        {
          label: "Agent runs",
          value: formatCount(activity.agentRuns, locale),
          toneClassName: "text-chart-2",
        },
        {
          label: "Active days",
          value: `${formatCount(activity.activeDays, locale)} / ${window.days}`,
          toneClassName: "text-chart-5",
        },
      ],
      status: `AI SDK v6 chat persistence over ${window.label.toLowerCase()}.`,
      statusClassName: "text-muted-foreground",
      actionLabel: "Messages",
      actionHref: "/settings/messages",
      actionIcon: <MessageSquare className="size-4" />,
    },
    {
      id: "tasks",
      title: "Tasks",
      value: formatCount(activity.activeTasks, locale),
      limit: `${formatCount(activity.tasksConfigured, locale)} configured`,
      percentage:
        activity.tasksConfigured > 0
          ? (activity.activeTasks / activity.tasksConfigured) * 100
          : null,
      progressColorClassName: "text-chart-2",
      details: [
        {
          label: "Task runs",
          value: formatCount(activity.taskRuns, locale),
          toneClassName: "text-chart-1",
        },
        {
          label: "Configured",
          value: formatCount(activity.tasksConfigured, locale),
          toneClassName: "text-chart-2",
        },
      ],
      status:
        activity.tasksConfigured > 0
          ? `${formatCount(activity.taskRuns, locale)} runs executed over ${window.label.toLowerCase()}.`
          : "No recurring automation tasks configured yet.",
      statusClassName: "text-muted-foreground",
      actionLabel: "Automation",
      actionHref: "/settings/automation?view=strategies",
      actionIcon: <Workflow className="size-4" />,
    },
    {
      id: "swaps",
      title: "Swap Activity",
      value: formatCount(activity.swaps, locale),
      limit: `${formatCount(activity.transactions, locale)} total txns`,
      percentage:
        activity.transactions > 0
          ? (activity.swaps / activity.transactions) * 100
          : null,
      progressColorClassName: "text-chart-5",
      details: [
        {
          label: "Bridges",
          value: formatCount(activity.bridges, locale),
          toneClassName: "text-chart-4",
        },
        {
          label: "Transactions",
          value: formatCount(activity.transactions, locale),
          toneClassName: "text-chart-1",
        },
        {
          label: "Agent runs",
          value: formatCount(activity.agentRuns, locale),
          toneClassName: "text-chart-2",
        },
      ],
      status: `${window.label} across Moralis, Alchemy, and Nex Wallet activity streams.`,
      statusClassName: "text-muted-foreground",
      actionLabel: "Activity",
      actionHref: "/settings/portfolio?view=transactions",
      actionIcon: <ArrowLeftRight className="size-4" />,
    },
  ];
}
