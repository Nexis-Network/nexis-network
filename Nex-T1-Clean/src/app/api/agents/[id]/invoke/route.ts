import { NextRequest } from "next/server";

import type { AgentInvokeRouteContext } from "@/server/api/contracts/agents";
import { agentsInvokePostHandler } from "@/server/api/handlers/agents/invoke-post";

export const maxDuration = 60;

export async function POST(req: NextRequest, ctx: AgentInvokeRouteContext) {
  return agentsInvokePostHandler(req, ctx);
}
