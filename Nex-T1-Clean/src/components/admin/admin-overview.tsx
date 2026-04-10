"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminAnalyticsOverview } from "@/types/admin";

const numberFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    value,
  );
}

export function AdminOverview() {
  const { data, isLoading, isError, refetch } = useQuery<AdminAnalyticsOverview>({
    queryKey: ["admin", "analytics", "overview"],
    queryFn: async () => {
      const res = await fetch("/api/admin/analytics/overview", { cache: "no-store" });
      if (!res.ok) {
        throw new Error("Failed to load analytics overview");
      }
      return (await res.json()) as AdminAnalyticsOverview;
    },
    staleTime: 60_000,
  });

  const metrics = useMemo(
    () => [
      {
        key: "total_users",
        label: "Total Users",
        value: data?.total_users ?? 0,
        helper: "Accounts provisioned across the platform.",
      },
      {
        key: "active_users",
        label: "Active Users (7d)",
        value: data?.active_users_7d ?? 0,
        helper: "Unique accounts with activity in the past seven days.",
      },
      {
        key: "admins",
        label: "Admins",
        value: data?.admins ?? 0,
        helper: "Users with elevated admin/super-admin privileges.",
      },
      {
        key: "wallets",
        label: "Linked Wallets",
        value: data?.wallet_count ?? 0,
        helper: "Verified blockchain wallets across all chains.",
      },
      {
        key: "wallet_value",
        label: "Wallet Value",
        formatter: formatCurrency,
        value: data?.total_wallet_balance_usd ?? 0,
        helper: "Aggregate USD value across indexed wallets.",
      },
      {
        key: "prompts",
        label: "Prompts (24h)",
        value: data?.prompts_24h ?? 0,
        helper: "Prompt log entries captured for compliance in the last 24 hours.",
      },
      {
        key: "traffic",
        label: "Traffic Events (24h)",
        value: data?.traffic_events_24h ?? 0,
        helper: "Tracked API/web requests in the last 24 hours.",
      },
      {
        key: "support",
        label: "Open Tickets",
        value: data?.support_tickets_open ?? 0,
        helper: "Support tickets awaiting resolution.",
      },
      {
        key: "blacklisted",
        label: "Blacklisted Users",
        value: data?.blacklisted_users ?? 0,
        helper: "Users currently blocked from platform access.",
      },
    ],
    [data],
  );

  if (isError) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Admin Overview</CardTitle>
          <button
            type="button"
            onClick={() => refetch()}
            className="text-sm text-primary underline-offset-2 hover:underline"
          >
            Retry
          </button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">Unable to load analytics overview.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {metrics.map((metric) => (
        <Card key={metric.key} className="border-muted">
          <CardHeader>
            <CardTitle className="text-base font-regular">{metric.label}</CardTitle>
            <CardDescription>{metric.helper}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-6 w-24 animate-pulse rounded bg-muted" />
            ) : (
              <p className="text-2xl font-regular">
                {metric.formatter ? metric.formatter(metric.value) : numberFormatter.format(metric.value)}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
