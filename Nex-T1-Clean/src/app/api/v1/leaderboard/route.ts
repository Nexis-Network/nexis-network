import { apiResponse } from "@/lib/api-platform";
import { getLeaderboardSeed } from "@/server/services/data/leaderboard";


export async function GET() {
  const res = apiResponse.success(getLeaderboardSeed());
  res.headers.set("Deprecation", "true");
  res.headers.set("Link", "</api/nex/leaderboard>; rel=\"alternate\"");
  return res;
}
