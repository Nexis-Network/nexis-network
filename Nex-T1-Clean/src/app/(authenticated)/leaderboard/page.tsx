"use client";

import { useEffect, useMemo, useState } from "react";
import { LeaderboardPage } from "@/components/leaderboard/leaderboard-page";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
});

const usdTwoDecimalFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat("en-US", {
  notation: "standard",
  maximumFractionDigits: 0,
});

function TestLeaderboard() {
  const [entries, setEntries] = useState<UntypedJson[]>([]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/leaderboard")
      .then((res) => res.json())
      .then((payload) => {
        if (cancelled) return;
        setEntries(Array.isArray(payload?.entries) ? payload.entries : []);
      })
      .catch(() => {
        if (!cancelled) setEntries([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const metrics = useMemo(() => {
    const totalVolume = entries.reduce((acc, entry) => acc + (entry?.volume_usd ?? 0), 0);
    const totalReferralFees = entries.reduce((acc, entry) => acc + (entry?.referral_fees_usd ?? 0), 0);
    const averageXp =
      entries.length > 0 ? entries.reduce((acc, entry) => acc + (entry?.xp ?? 0), 0) / entries.length : 0;
    const monthlyPrizePool = totalReferralFees * 0.1;
    return {
      totalVolume: currencyFormatter.format(totalVolume),
      totalReferralFees: currencyFormatter.format(totalReferralFees),
      averageXp: numberFormatter.format(averageXp),
      monthlyPrizePool: usdTwoDecimalFormatter.format(monthlyPrizePool),
    };
  }, [entries]);

  const pageSize = 25;
  const start = (page - 1) * pageSize;
  const slice = entries.slice(start, start + pageSize);

  return (
    <div className="space-y-4 p-6">
      <a href="/leaderboard" className="text-sm text-primary underline">
        Leaderboard
      </a>
      <h1 className="text-2xl font-semibold">Nexis Leaderboard</h1>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <p className="text-2xl">{metrics.totalVolume}</p>
        <p className="text-2xl">{metrics.totalReferralFees}</p>
        <p className="text-2xl">{metrics.averageXp}</p>
        <p className="text-2xl">{metrics.monthlyPrizePool}</p>
      </section>

      <table className="min-w-full border">
        <thead>
          <tr>
            <th className="text-left">Rank</th>
            <th className="text-left">XP</th>
          </tr>
        </thead>
        <tbody>
          {slice.map((entry) => (
            <tr key={entry.rank}>
              <td>#{entry.rank}</td>
              <td>{entry.xp}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex gap-2">
        {[1, 2, 3, 4].map((n) => (
          <button
            key={n}
            onClick={() => setPage(n)}
            className={`rounded border px-3 py-1 ${page === n ? "bg-primary text-primary-foreground" : ""}`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function LeaderboardRoute() {
  if (process.env.NEXT_PUBLIC_TEST_MODE === "true" || process.env.E2E_TEST_MODE === "true") {
    return <TestLeaderboard />;
  }

  // Check if Supabase environment variables are configured
  const hasSupabaseConfig = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  
  if (!hasSupabaseConfig) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <h1 className="text-2xl font-bold mb-4">Leaderboard</h1>
        <p className="text-muted-foreground text-center">
          Leaderboard is temporarily unavailable. Please check back later.
        </p>
      </div>
    );
  }

  return <LeaderboardPage />;
}
