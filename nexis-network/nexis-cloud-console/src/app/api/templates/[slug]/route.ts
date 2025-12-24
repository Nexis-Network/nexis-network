import { NextRequest, NextResponse } from "next/server";
import { getAgentTemplate } from "@/lib/server/agent-templates";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const template = await getAgentTemplate(slug);
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }
  return NextResponse.json({ template });
}
