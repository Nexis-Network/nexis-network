import type { Metadata } from "next";

import { AiLeaderboardPage } from "@/components/ai-leaderboard/ai-leaderboard-page";

export const metadata: Metadata = {
  title: "AI Leaderboard | Nex-T1",
  description: "Compare agent performance, equity curves, and recent trades with server-enforced redaction.",
};

export default function AiLeaderboardRoute() {
  return <AiLeaderboardPage />;
}

