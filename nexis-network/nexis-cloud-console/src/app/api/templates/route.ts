import { NextResponse } from "next/server";
import { getAgentTemplates } from "@/lib/server/agent-templates";

export async function GET() {
  const templates = await getAgentTemplates();
  return NextResponse.json({ templates });
}
