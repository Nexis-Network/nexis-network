import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/server/services/supabase/server";
import { apiResponse } from "@/lib/api-platform";


import { logger } from '@/lib/logger';

const InstallSchema = z.object({
  serverName: z.string().min(1),
  config: z.record(z.string(), z.unknown()).optional(),
});

export async function GET() {
  try {
    const supabase = await createClient();
    if (!supabase) return apiResponse.serviceUnavailable("Database unavailable");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return apiResponse.unauthorized("Unauthorized");

    const { data, error } = await supabase
      .from("user_mcp_installations")
      .select("*")
      .eq("user_id", user.id);

    if (error) {
      logger.error("[API] Failed to fetch MCP installations:", error);
      return apiResponse.internalError("Failed to fetch installations");
    }

    return apiResponse.success({ installations: data });
  } catch (error) {
    logger.error("[API] MCP installations GET error:", error);
    return apiResponse.internalError("Internal error");
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    if (!supabase) return apiResponse.serviceUnavailable("Database unavailable");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return apiResponse.unauthorized("Unauthorized");

    const body = await request.json();
    const parsed = InstallSchema.safeParse(body);
    if (!parsed.success) return apiResponse.badRequest("Invalid request data");

    const { serverName, config } = parsed.data;

    const { data, error } = await supabase
      .from("user_mcp_installations")
      .upsert({
        user_id: user.id,
        server_name: serverName,
        config: config ?? {},
        created_at: new Date().toISOString()
      }, { onConflict: "user_id,server_name" })
      .select()
      .single();

    if (error) {
      logger.error("[API] Failed to install MCP tool:", error);
      return apiResponse.internalError("Failed to install tool");
    }

    return apiResponse.success({ success: true, installation: data });
  } catch (error) {
    logger.error("[API] MCP install POST error:", error);
    return apiResponse.internalError("Internal error");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    if (!supabase) return apiResponse.serviceUnavailable("Database unavailable");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return apiResponse.unauthorized("Unauthorized");

    const { searchParams } = new URL(request.url);
    const serverName = searchParams.get("serverName");

    if (!serverName) return apiResponse.badRequest("Missing serverName");

    const { error } = await supabase
      .from("user_mcp_installations")
      .delete()
      .eq("user_id", user.id)
      .eq("server_name", serverName);

    if (error) {
      logger.error("[API] Failed to uninstall MCP tool:", error);
      return apiResponse.internalError("Failed to uninstall tool");
    }

    return apiResponse.success({ success: true });
  } catch (error) {
    logger.error("[API] MCP uninstall DELETE error:", error);
    return apiResponse.internalError("Internal error");
  }
}
